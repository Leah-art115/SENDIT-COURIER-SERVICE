/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MailerService } from '../mailer/mailer.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { generateUniqueTrackingId } from './utils/tracking-id';
import { calculateParcelPrice } from './utils/price-calculator';
import { ParcelStatus } from '@prisma/client';
import axios from 'axios';
import { geocodeLocationWithFallback } from 'src/common/utils/geocode';

@Injectable()
export class ParcelService {
  sendManualDeliveryNotification(parcelId: string) {
    throw new Error('Method not implemented.');
  }
  sendManualLocationNotification(parcelId: string, location: string, message: string | undefined) {
    throw new Error('Method not implemented.');
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
  ) {}

  async createParcel(dto: CreateParcelDto) {
    const duplicate = await this.prisma.parcel.findFirst({
      where: {
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
        receiverName: dto.receiverName,
        receiverEmail: dto.receiverEmail,
        from: dto.from,
        to: dto.to,
        weight: dto.weight,
        mode: dto.mode,
        type: dto.type,
        description: dto.description ?? null,
      },
    });

    if (duplicate) {
      throw new ConflictException('An identical parcel already exists');
    }

    const trackingId = await generateUniqueTrackingId(this.prisma);
    const distance = await this.getDistanceInKm(dto.from, dto.to);
    const price = calculateParcelPrice(dto.type, dto.weight, distance, dto.mode);
    console.log('Calculated price for parcel:', { trackingId, price, type: dto.type, weight: dto.weight, distance, mode: dto.mode });

    const destinationCoords = await geocodeLocationWithFallback(dto.to);
    const fromCoords = await geocodeLocationWithFallback(dto.from);

    const parcel = await this.prisma.parcel.create({
      data: {
        trackingId,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
        receiverName: dto.receiverName,
        receiverEmail: dto.receiverEmail,
        from: dto.from,
        to: dto.to,
        distance,
        type: dto.type,
        weight: dto.weight,
        mode: dto.mode,
        description: dto.description,
        price,
        status: ParcelStatus.PENDING,
        fromLat: fromCoords.lat,
        fromLng: fromCoords.lng,
        destinationLat: destinationCoords.lat,
        destinationLng: destinationCoords.lng,
      },
    });

    await this.prisma.parcelStatusLog.create({
      data: {
        parcelId: parcel.id,
        status: ParcelStatus.PENDING,
      },
    });

    return parcel;
  }

  private async getDistanceInKm(from: string, to: string): Promise<number> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      from,
    )}&destinations=${encodeURIComponent(to)}&key=${apiKey}`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (
        data.rows?.[0]?.elements?.[0]?.status === 'OK' &&
        data.rows[0].elements[0].distance
      ) {
        const meters = data.rows[0].elements[0].distance.value;
        return Math.round(meters / 1000);
      } else {
        throw new Error('No valid distance returned');
      }
    } catch (error) {
      console.error('Failed to fetch distance:', error);
      throw new InternalServerErrorException('Distance calculation failed');
    }
  }

  async getAllParcels() {
    return this.prisma.parcel.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        statusHistory: true,
        driver: true,
      },
    });
  }

  async getParcelById(id: string) {
    return this.prisma.parcel.findUnique({
      where: { id },
      include: { statusHistory: true, driver: true },
    });
  }

  async getParcelByTrackingId(trackingId: string) {
    return this.prisma.parcel.findUnique({
      where: { trackingId },
      include: { statusHistory: true, driver: true },
    });
  }

  async getStatusHistory(parcelId: string) {
    return this.prisma.parcelStatusLog.findMany({
      where: { parcelId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateParcelStatus(parcelId: string, newStatus: ParcelStatus, driverId: number) {
    const now = new Date();

    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.driverId !== driverId) {
      throw new BadRequestException('You are not assigned to this parcel');
    }

    const updatedParcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: newStatus,
        pickedAt: newStatus === ParcelStatus.PICKED_UP_BY_DRIVER ? now : undefined,
        deliveredAt: newStatus === ParcelStatus.DELIVERED ? now : undefined,
      },
    });

    await this.prisma.parcelStatusLog.create({
      data: {
        parcelId,
        status: newStatus,
        updatedAt: now,
      },
    });

    return updatedParcel;
  }

  async assignDriver(parcelId: string, driverId: number) {
    try {
      // Get the parcel details before assignment
      const parcel = await this.prisma.parcel.findUnique({
        where: { id: parcelId },
      });

      if (!parcel) {
        throw new BadRequestException('Parcel not found');
      }

      // Get driver details
      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw new BadRequestException('Driver not found');
      }

      if (!driver.canReceiveAssignments) {
        throw new BadRequestException('Driver is not available for assignments');
      }

      // Update parcel with driver assignment
      const updatedParcel = await this.prisma.parcel.update({
        where: { id: parcelId },
        data: {
          driverId,
          status: ParcelStatus.ASSIGNED,
          updatedAt: new Date(),
        },
        include: {
          driver: true,
        },
      });

      // Create status log
      await this.prisma.parcelStatusLog.create({
        data: {
          parcelId: parcel.id,
          status: ParcelStatus.ASSIGNED,
        },
      });

      // Send assignment email to driver
      try {
        await this.mailerService.sendParcelAssignmentNotification(
          driver.email,
          driver.name,
          {
            trackingNumber: parcel.trackingId,
            receiverName: parcel.receiverName,
            senderName: parcel.senderName,
          }
        );

        console.log(`✅ Assignment email sent to driver ${driver.name} for parcel ${parcel.trackingId}`);
      } catch (emailError) {
        console.error('❌ Failed to send assignment email to driver:', emailError);
        // Don't throw error to avoid blocking the assignment process
      }

      return updatedParcel;
    } catch (error) {
      console.error('❌ Error assigning driver:', error);
      throw error;
    }
  }

  async unassignDriver(parcelId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (!parcel.driverId) {
      throw new BadRequestException('Parcel is not assigned to any driver');
    }

    const restrictedStatuses: ParcelStatus[] = [
      ParcelStatus.PICKED_UP_BY_DRIVER,
      ParcelStatus.IN_TRANSIT,
      ParcelStatus.DELIVERED,
      ParcelStatus.COLLECTED_BY_RECEIVER,
    ];

    if (restrictedStatuses.includes(parcel.status)) {
      throw new ConflictException('Cannot unassign driver from a parcel that has been picked up or is in a later status');
    }

    const updatedParcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        driverId: null,
        status: ParcelStatus.PENDING,
        updatedAt: new Date(),
      },
    });

    await this.prisma.driver.update({
      where: { id: parcel.driverId },
      data: {
        status: 'AVAILABLE',
        canReceiveAssignments: true,
      },
    });

    await this.prisma.parcelStatusLog.create({
      data: {
        parcelId,
        status: ParcelStatus.PENDING,
      },
    });

    return updatedParcel;
  }

  async getDashboardMetrics() {
    const [totalEarnings, totalUsers, parcelsInTransit, parcelsDelivered, recentParcels] = await Promise.all([
      this.prisma.parcel.aggregate({
        where: { status: ParcelStatus.DELIVERED },
        _sum: { price: true },
      }),
      this.authService.getTotalUsers(),
      this.prisma.parcel.count({
        where: { status: ParcelStatus.IN_TRANSIT },
      }),
      this.prisma.parcel.count({
        where: { status: ParcelStatus.DELIVERED },
      }),
      this.prisma.parcel.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          trackingId: true,
          senderName: true,
          receiverName: true,
          status: true,
          updatedAt: true,
          price: true,
        },
      }),
    ]);

    console.log('Dashboard metrics:', {
      totalEarnings: totalEarnings._sum.price,
      totalUsers,
      parcelsInTransit,
      parcelsDelivered,
      recentParcels: recentParcels.map(p => ({ trackingId: p.trackingId, price: p.price, status: p.status })),
    });

    return {
      totalEarnings: totalEarnings._sum.price ?? 0,
      totalUsers,
      parcelsInTransit,
      parcelsDelivered,
      recentParcels: recentParcels.map(parcel => ({
        trackingId: parcel.trackingId,
        senderName: parcel.senderName,
        receiverName: parcel.receiverName,
        status: parcel.status,
        updatedAt: parcel.updatedAt.toISOString(),
      })),
    };
  }
}