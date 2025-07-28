import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParcelStatus } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getSentParcels(userId: number) {
    return this.prisma.parcel.findMany({
      where: { senderId: userId },
      orderBy: { sentAt: 'desc' },
    });
  }

  async getReceivedParcels(userId: number) {
    return this.prisma.parcel.findMany({
      where: { receiverId: userId },
      orderBy: { sentAt: 'desc' },
    });
  }

  async trackParcel(trackingId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { trackingId },
      include: {
        statusHistory: {
          orderBy: { updatedAt: 'desc' },
        },
        driver: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    return parcel;
  }

  async markAsCollected(userId: number, parcelId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.status !== ParcelStatus.DELIVERED) {
      throw new BadRequestException(
        'Parcel must be delivered before it can be collected',
      );
    }

    if (parcel.receiverId && parcel.receiverId !== userId) {
      throw new BadRequestException('Only the receiver can mark as collected');
    }

    const updated = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: ParcelStatus.COLLECTED_BY_RECEIVER,
        updatedAt: new Date(),
      },
    });

    await this.prisma.parcelStatusLog.create({
      data: {
        parcelId,
        status: ParcelStatus.COLLECTED_BY_RECEIVER,
      },
    });

    return updated;
  }
}
