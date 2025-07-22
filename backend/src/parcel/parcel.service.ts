/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { generateUniqueTrackingId } from './utils/tracking-id';
import { calculateParcelPrice } from './utils/price-calculator';
import { ParcelStatus } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class ParcelService {
  constructor(private prisma: PrismaService) {}

  async createParcel(dto: CreateParcelDto) {
    // 1. Generate tracking ID
    const trackingId = await generateUniqueTrackingId(this.prisma);

    // 2. Calculate distance using Google Maps
    const distance = await this.getDistanceInKm(dto.from, dto.to);

    // 3. Calculate price
    const price = calculateParcelPrice(dto.type, dto.weight, distance, dto.mode);

    // 4. Save parcel
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
      },
    });

    // 5. Log initial status
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
        return Math.round(meters / 1000); // Convert to kilometers
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
      },
    });
  }

  async getParcelById(id: string) {
    return this.prisma.parcel.findUnique({
      where: { id },
      include: { statusHistory: true },
    });
  }

  async getParcelByTrackingId(trackingId: string) {
    return this.prisma.parcel.findUnique({
      where: { trackingId },
      include: { statusHistory: true },
    });
  }

  async getStatusHistory(parcelId: string) {
    return this.prisma.parcelStatusLog.findMany({
      where: { parcelId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateParcelStatus(parcelId: string, newStatus: ParcelStatus) {
    const now = new Date();

    const parcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: newStatus,
        pickedAt: newStatus === ParcelStatus.PICKED_UP ? now : undefined,
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

    return parcel;
  }
}
