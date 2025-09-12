/* eslint-disable prefer-const */
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
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MailerService } from '../mailer/mailer.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { generateUniqueTrackingId } from './utils/tracking-id';
import { calculateParcelPrice } from './utils/price-calculator';
import { ParcelStatus, DriverStatus } from '@prisma/client';
import axios from 'axios';
import { geocodeLocationWithFallback } from 'src/common/utils/geocode';

@Injectable()
export class ParcelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async createParcel(dto: CreateParcelDto, authenticatedUserId?: number) {
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

    const [senderUser, receiverUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email: dto.senderEmail }
      }),
      this.prisma.user.findUnique({
        where: { email: dto.receiverEmail }
      })
    ]);

    const trackingId = await generateUniqueTrackingId(this.prisma);
    const distance = await this.getDistanceInKm(dto.from, dto.to);
    const price = calculateParcelPrice(dto.type, dto.weight, distance, dto.mode);

    console.log('Calculated price for parcel:', { 
      trackingId, 
      price, 
      type: dto.type, 
      weight: dto.weight, 
      distance, 
      mode: dto.mode 
    });

    const destinationCoords = await geocodeLocationWithFallback(dto.to);
    const fromCoords = await geocodeLocationWithFallback(dto.from);

    const parcel = await this.prisma.parcel.create({
      data: {
        trackingId,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
        receiverName: dto.receiverName,
        receiverEmail: dto.receiverEmail,
        senderId: senderUser?.id || authenticatedUserId,
        receiverId: receiverUser?.id,
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

    console.log('✅ Parcel created with user links:', {
      trackingId,
      senderId: parcel.senderId,
      receiverId: parcel.receiverId,
      senderEmail: dto.senderEmail,
      receiverEmail: dto.receiverEmail
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

  async markParcelCollectedByReceiver(parcelId: string, userId: number) {
    try {
      const parcel = await this.prisma.parcel.findUnique({
        where: { id: parcelId },
        include: { driver: true },
      });

      if (!parcel) {
        throw new NotFoundException('Parcel not found');
      }

      if (parcel.receiverId !== userId) {
        throw new BadRequestException('You are not the receiver of this parcel');
      }

      if (parcel.status !== ParcelStatus.DELIVERED) {
        throw new BadRequestException(
          `Parcel must be in DELIVERED status to be collected. Current status: ${parcel.status}`
        );
      }

      let driverUpdates: any[] = [];
      if (parcel.driverId) {
        const activeParcels = await this.prisma.parcel.count({
          where: {
            driverId: parcel.driverId,
            status: {
              in: [ParcelStatus.PICKED_UP_BY_DRIVER, ParcelStatus.IN_TRANSIT, ParcelStatus.DELIVERED],
            },
            id: { not: parcelId },
          },
        });

        if (activeParcels === 0) {
          driverUpdates.push(
            this.prisma.driver.update({
              where: { id: parcel.driverId },
              data: {
                status: DriverStatus.AVAILABLE,
                canReceiveAssignments: true,
                updatedAt: new Date(),
              },
            })
          );
        }
      }

      const [updatedParcel] = await this.prisma.$transaction([
        this.prisma.parcel.update({
          where: { id: parcelId },
          data: {
            status: ParcelStatus.COLLECTED_BY_RECEIVER,
            updatedAt: new Date(),
          },
        }),
        ...driverUpdates,
      ]);

      await this.prisma.parcelStatusLog.create({
        data: {
          parcelId: parcel.id,
          status: ParcelStatus.COLLECTED_BY_RECEIVER,
        },
      });

      console.log(`✅ Parcel ${parcelId} marked as collected by receiver`);
      if (driverUpdates.length > 0 && parcel.driverId) {
        console.log(`✅ Driver ${parcel.driverId} status updated to AVAILABLE after collection`);
      }

      return updatedParcel;
    } catch (error) {
      console.error('❌ Error marking parcel as collected:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to mark parcel as collected');
    }
  }

  async updateParcelStatusGeneral(parcelId: string, newStatus: ParcelStatus) {
    try {
      const parcel = await this.prisma.parcel.findUnique({
        where: { id: parcelId },
        include: { driver: true },
      });

      if (!parcel) {
        throw new NotFoundException('Parcel not found');
      }

      const now = new Date();
      let driverUpdates: any[] = [];

      if (parcel.driverId && (newStatus === ParcelStatus.COLLECTED_BY_RECEIVER || newStatus === ParcelStatus.CANCELLED)) {
        const activeParcels = await this.prisma.parcel.count({
          where: {
            driverId: parcel.driverId,
            status: {
              in: [ParcelStatus.PICKED_UP_BY_DRIVER, ParcelStatus.IN_TRANSIT, ParcelStatus.DELIVERED],
            },
            id: { not: parcelId },
          },
        });

        if (activeParcels === 0) {
          driverUpdates.push(
            this.prisma.driver.update({
              where: { id: parcel.driverId },
              data: {
                status: DriverStatus.AVAILABLE,
                canReceiveAssignments: true,
                updatedAt: now,
              },
            })
          );
        }
      } else if (parcel.status === ParcelStatus.DELIVERED && newStatus !== ParcelStatus.COLLECTED_BY_RECEIVER) {
        throw new BadRequestException('Cannot set driver to AVAILABLE when parcel is still DELIVERED');
      }

      const [updatedParcel] = await this.prisma.$transaction([
        this.prisma.parcel.update({
          where: { id: parcelId },
          data: {
            status: newStatus,
            pickedAt: newStatus === ParcelStatus.PICKED_UP_BY_DRIVER ? now : parcel.pickedAt,
            deliveredAt: newStatus === ParcelStatus.DELIVERED ? now : parcel.deliveredAt,
            updatedAt: now,
          },
        }),
        ...driverUpdates,
      ]);

      await this.prisma.parcelStatusLog.create({
        data: {
          parcelId: parcel.id,
          status: newStatus,
          updatedAt: now,
        },
      });

      console.log(`Parcel ${parcelId} status updated to ${newStatus}`);
      if (driverUpdates.length > 0 && parcel.driverId) {
        console.log(`Driver ${parcel.driverId} status updated to AVAILABLE`);
      }

      return updatedParcel;
    } catch (error) {
      console.error('❌ Error updating parcel status:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update parcel status');
    }
  }

  async assignDriver(parcelId: string, driverId: number) {
    try {
      const parcel = await this.prisma.parcel.findUnique({
        where: { id: parcelId },
      });

      if (!parcel) {
        throw new BadRequestException('Parcel not found');
      }

      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw new BadRequestException('Driver not found');
      }

      if (!driver.canReceiveAssignments || driver.status !== DriverStatus.AVAILABLE) {
        throw new BadRequestException(`Driver is not available for assignments. Current status: ${driver.status}`);
      }

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

      await this.prisma.parcelStatusLog.create({
        data: {
          parcelId: parcel.id,
          status: ParcelStatus.ASSIGNED,
        },
      });

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

        console.log(`Assignment email sent to driver ${driver.name} for parcel ${parcel.trackingId}`);
      } catch (emailError) {
        console.error('Failed to send assignment email to driver:', emailError);
      }

      return updatedParcel;
    } catch (error) {
      console.error('Error assigning driver:', error);
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

    const [updatedParcel] = await this.prisma.$transaction([
      this.prisma.parcel.update({
        where: { id: parcelId },
        data: {
          driverId: null,
          status: ParcelStatus.PENDING,
          updatedAt: new Date(),
        },
      }),
      this.prisma.driver.update({
        where: { id: parcel.driverId },
        data: {
          status: DriverStatus.AVAILABLE,
          canReceiveAssignments: true,
          updatedAt: new Date(),
        },
      }),
    ]);

    await this.prisma.parcelStatusLog.create({
      data: {
        parcelId,
        status: ParcelStatus.PENDING,
      },
    });

    console.log(`Driver ${parcel.driverId} status updated to AVAILABLE after unassignment`);

    return updatedParcel;
  }

  // FIXED: Admin Dashboard Metrics with proper calculations
  async getDashboardMetrics() {
    const [
      totalEarningsResult, 
      totalUsers, 
      totalDrivers,
      parcelsInTransit, 
      parcelsDelivered, 
      recentParcels
    ] = await Promise.all([
      // Calculate total earnings from ALL parcels that have been processed (not just delivered)
      this.prisma.parcel.aggregate({
        where: {
          status: {
            in: [
              ParcelStatus.ASSIGNED,
              ParcelStatus.PICKED_UP_BY_DRIVER,
              ParcelStatus.IN_TRANSIT,
              ParcelStatus.DELIVERED,
              ParcelStatus.COLLECTED_BY_RECEIVER
            ]
          }
        },
        _sum: { price: true },
      }),
      this.authService.getTotalUsers(),
      // Add total drivers count
      this.prisma.driver.count({
        where: {
          deletedAt: null // Only count active drivers
        }
      }),
      this.prisma.parcel.count({
        where: { 
          status: { 
            in: [ParcelStatus.IN_TRANSIT, ParcelStatus.PICKED_UP_BY_DRIVER] 
          } 
        },
      }),
      this.prisma.parcel.count({
        where: { 
          status: { 
            in: [ParcelStatus.DELIVERED, ParcelStatus.COLLECTED_BY_RECEIVER] 
          } 
        },
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

    const result = {
      totalEarnings: Number(totalEarningsResult._sum.price) || 0,
      totalUsers: Number(totalUsers) || 0,
      totalDrivers: Number(totalDrivers) || 0,
      parcelsInTransit: Number(parcelsInTransit) || 0,
      parcelsDelivered: Number(parcelsDelivered) || 0,
      recentParcels: recentParcels.map(parcel => ({
        trackingId: parcel.trackingId,
        senderName: parcel.senderName,
        receiverName: parcel.receiverName,
        status: parcel.status,
        updatedAt: parcel.updatedAt.toISOString(),
      })),
    };

    // console.log('Dashboard metrics calculated:', {
    //   totalEarnings: result.totalEarnings,
    //   totalUsers: result.totalUsers,
    //   totalDrivers: result.totalDrivers,
    //   parcelsInTransit: result.parcelsInTransit,
    //   parcelsDelivered: result.parcelsDelivered,
    //   recentParcelsCount: result.recentParcels.length,
    
    //   samplePrices: recentParcels.map(p => ({ id: p.trackingId, price: p.price })),
    // });

    return result;
  }

  async sendManualDeliveryNotification(parcelId: string): Promise<void> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    try {
      await this.mailerService.sendDeliveryNotification(
        parcel.receiverEmail,
        parcel.receiverName,
        parcel.trackingId,
        parcel.to,
        parcel.deliveredAt?.toLocaleString()
      );
      console.log(`Sent delivery notification for parcel ${parcelId} to ${parcel.receiverEmail}`);
    } catch (error) {
      console.error(`Failed to send delivery notification for parcel ${parcelId}:`, error);
      throw new InternalServerErrorException('Failed to send delivery notification');
    }
  }

  async sendManualLocationNotification(parcelId: string, location: string, message?: string): Promise<void> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    try {
      await this.mailerService.sendLocationUpdateNotification(
        parcel.receiverEmail,
        parcel.receiverName,
        parcel.trackingId,
        location,
        message
      );
      console.log(`Sent location notification for parcel ${parcelId} to ${parcel.receiverEmail}`);
    } catch (error) {
      console.error(`Failed to send location notification for parcel ${parcelId}:`, error);
      throw new InternalServerErrorException('Failed to send location notification');
    }
  }
}