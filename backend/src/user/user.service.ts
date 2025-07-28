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

  async getSentParcels(name: string, email: string) {
    return this.prisma.parcel.findMany({
      where: {
        senderName: name,
        senderEmail: email,
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  async getReceivedParcels(name: string, email: string) {
    return this.prisma.parcel.findMany({
      where: {
        receiverName: name,
        receiverEmail: email,
      },
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

  async markDriverPickedUp(userId: number, parcelId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.status !== ParcelStatus.ASSIGNED) {
      throw new BadRequestException(
        'Parcel must be assigned before being marked as picked up',
      );
    }

    const updated = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: ParcelStatus.PICKED_UP_BY_DRIVER,
        pickedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await this.prisma.parcelStatusLog.create({
      data: {
        parcelId,
        status: ParcelStatus.PICKED_UP_BY_DRIVER,
      },
    });

    return updated;
  }
}
