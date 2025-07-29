/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
    const userEmails = await this.getUserEmails(userId);

    return this.prisma.parcel.findMany({
      where: {
        OR: [
          { senderId: userId }, // Direct user ID match
          {
            senderEmail: {
              in: userEmails, // Email match for parcels created before user linking
            },
          },
        ],
      },
      orderBy: { sentAt: 'desc' },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            mode: true,
            status: true,
          },
        },
        statusHistory: {
          orderBy: { updatedAt: 'desc' },
          take: 10, // Limit to recent status updates
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getReceivedParcels(userId: number) {
    const userEmails = await this.getUserEmails(userId);

    console.log('🔍 Fetching received parcels for user:', {
      userId,
      userEmails,
    });

    const parcels = await this.prisma.parcel.findMany({
      where: {
        OR: [
          { receiverId: userId }, // Direct user ID match
          {
            receiverEmail: {
              in: userEmails, // Email match for parcels created before user linking
            },
          },
        ],
      },
      orderBy: { sentAt: 'desc' },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            mode: true,
            status: true,
          },
        },
        statusHistory: {
          orderBy: { updatedAt: 'desc' },
          take: 10, // Limit to recent status updates
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('📦 Found received parcels:', {
      count: parcels.length,
      trackingIds: parcels.map((p) => p.trackingId),
      parcels: parcels.map((p) => ({
        trackingId: p.trackingId,
        receiverId: p.receiverId,
        receiverEmail: p.receiverEmail,
        status: p.status,
      })),
    });

    return parcels;
  }

  async trackParcel(trackingId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { trackingId },
      include: {
        statusHistory: {
          orderBy: { updatedAt: 'desc' },
        },
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            mode: true,
            status: true,
            currentLat: true,
            currentLng: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
      include: {
        receiver: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.status !== ParcelStatus.DELIVERED) {
      throw new BadRequestException(
        'Parcel must be delivered before it can be collected',
      );
    }

    // Check if user can collect this parcel
    const canCollect = await this.canUserAccessParcel(
      userId,
      parcel,
      'receiver',
    );
    if (!canCollect) {
      throw new BadRequestException(
        'Only the receiver can mark this parcel as collected',
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

    console.log('✅ Parcel marked as collected:', {
      trackingId: parcel.trackingId,
      userId,
      parcelId,
    });

    return updated;
  }

  // Helper method to get user's email addresses
  private async getUserEmails(userId: number): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return user ? [user.email] : [];
  }

  // Helper method to check if user can access a parcel
  private async canUserAccessParcel(
    userId: number,
    parcel: any,
    role: 'sender' | 'receiver',
  ): Promise<boolean> {
    const userEmails = await this.getUserEmails(userId);

    if (role === 'sender') {
      return (
        parcel.senderId === userId || userEmails.includes(parcel.senderEmail)
      );
    } else {
      return (
        parcel.receiverId === userId ||
        userEmails.includes(parcel.receiverEmail)
      );
    }
  }

  // Additional helper methods for better functionality
  async getUserParcelStats(userId: number) {
    const userEmails = await this.getUserEmails(userId);

    const [sentStats, receivedStats] = await Promise.all([
      // Sent parcels stats
      this.prisma.parcel.groupBy({
        by: ['status'],
        where: {
          OR: [{ senderId: userId }, { senderEmail: { in: userEmails } }],
        },
        _count: true,
      }),
      // Received parcels stats
      this.prisma.parcel.groupBy({
        by: ['status'],
        where: {
          OR: [{ receiverId: userId }, { receiverEmail: { in: userEmails } }],
        },
        _count: true,
      }),
    ]);

    return {
      sent: sentStats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      received: receivedStats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  // Get all parcels for a user (both sent and received)
  async getAllUserParcels(userId: number) {
    const userEmails = await this.getUserEmails(userId);

    return this.prisma.parcel.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
          { senderEmail: { in: userEmails } },
          { receiverEmail: { in: userEmails } },
        ],
      },
      orderBy: { sentAt: 'desc' },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            mode: true,
            status: true,
          },
        },
        statusHistory: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
      },
    });
  }
}
