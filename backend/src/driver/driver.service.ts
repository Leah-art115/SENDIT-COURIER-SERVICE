/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { geocodeLocationWithFallback } from '../common/utils/geocode';
import { getDistanceInKm } from '../common/utils/distance';
import { ParcelStatus, DriverStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async updateLocation(
    driverId: number,
    parcelId: string,
    locationName: string,
  ): Promise<{ status: ParcelStatus | null; message?: string }> {
    try {
      if (!locationName || locationName.trim() === '') {
        throw new BadRequestException('Location name is required');
      }

      const cleanLocationName = locationName.trim();
      console.log(
        `Driver ${driverId} updating location to: ${cleanLocationName}`,
      );

      const coords = await geocodeLocationWithFallback(cleanLocationName);

      await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          currentLat: coords.lat,
          currentLng: coords.lng,
          updatedAt: new Date(),
        },
      });

      console.log(
        `Driver ${driverId} location updated to coordinates: ${coords.lat}, ${coords.lng}`,
      );

      const parcel = await this.prisma.parcel.findFirst({
        where: {
          id: parcelId,
          driverId,
        },
        include: { driver: true },
      });

      if (!parcel) {
        console.log(
          `❌ Parcel not found for driver ${driverId} with parcel ID ${parcelId}`,
        );
        return {
          status: null,
          message: 'Parcel not assigned to this driver or not found',
        };
      }

      const activeStatuses: ParcelStatus[] = [
        ParcelStatus.PICKED_UP_BY_DRIVER,
        ParcelStatus.IN_TRANSIT,
      ];

      if (!activeStatuses.includes(parcel.status)) {
        console.log(
          `⚠️ Parcel found but in status "${parcel.status}" which is not valid for updates`,
        );
        return {
          status: null,
          message: `Parcel is in status "${parcel.status}" which is not active for location updates`,
        };
      }

      let destinationLat = parcel.destinationLat;
      let destinationLng = parcel.destinationLng;
      if (destinationLat == null || destinationLng == null) {
        console.log(
          `Parcel ${parcelId} has no destination coordinates, attempting to geocode: ${parcel.to}`,
        );
        try {
          const destinationCoords = await geocodeLocationWithFallback(
            parcel.to,
          );
          destinationLat = destinationCoords.lat;
          destinationLng = destinationCoords.lng;

          await this.prisma.parcel.update({
            where: { id: parcelId },
            data: {
              destinationLat,
              destinationLng,
              updatedAt: new Date(),
            },
          });
          console.log(
            `Parcel ${parcelId} updated with destination coordinates: ${destinationLat}, ${destinationLng}`,
          );
        } catch (error) {
          console.error(`Failed to geocode destination: ${parcel.to}`, error);
          return {
            status: null,
            message: `Unable to update location: Failed to geocode destination "${parcel.to}"`,
          };
        }
      }

      const distance = getDistanceInKm(
        coords.lat,
        coords.lng,
        destinationLat,
        destinationLng,
      );

      console.log(`Distance to destination: ${distance.toFixed(3)} km`);

      const newStatus =
        distance <= 0.3 ? ParcelStatus.DELIVERED : ParcelStatus.IN_TRANSIT;

      if (parcel.status !== newStatus) {
        await this.prisma.parcel.update({
          where: { id: parcel.id },
          data: {
            status: newStatus,
            deliveredAt:
              newStatus === ParcelStatus.DELIVERED ? new Date() : undefined,
            updatedAt: new Date(),
          },
        });

        await this.prisma.parcelStatusLog.create({
          data: {
            parcelId: parcel.id,
            status: newStatus,
          },
        });

        console.log(`Parcel ${parcelId} status updated to: ${newStatus}`);

        // 🔥 FIX: Update driver status to AVAILABLE when parcel is delivered
        if (newStatus === ParcelStatus.DELIVERED) {
          await this.prisma.driver.update({
            where: { id: driverId },
            data: {
              status: DriverStatus.AVAILABLE,
              canReceiveAssignments: true,
              updatedAt: new Date(),
            },
          });
          console.log(
            `Driver ${driverId} status updated to AVAILABLE after delivery`,
          );

          try {
            await this.mailerService.sendReceiverPickupNotification(
              parcel.receiverEmail,
              parcel.receiverName,
              parcel.trackingId,
              parcel.to,
              'Please collect your parcel at the designated pickup location.',
              parcel.driver?.name,
            );

            await this.mailerService.sendSenderDeliveryConfirmation(
              parcel.senderEmail,
              parcel.senderName,
              parcel.receiverName,
              parcel.trackingId,
              parcel.to,
              new Date().toLocaleString(),
            );
          } catch (error) {
            console.error('Failed to send delivery notifications:', error);
            // Log but don't throw to avoid blocking status update
          }
        }
      }

      try {
        await this.mailerService.sendLocationUpdateNotification(
          parcel.receiverEmail,
          parcel.receiverName,
          parcel.trackingId,
          cleanLocationName,
          distance <= 0.3
            ? 'Arrived at destination'
            : `Approximately ${distance.toFixed(1)} km from destination`,
        );
      } catch (error) {
        console.error('Failed to send location update notification:', error);
        // Don't throw to avoid blocking location update
      }

      return {
        status: newStatus,
        message:
          newStatus === ParcelStatus.DELIVERED
            ? 'Parcel delivered successfully!'
            : `Location updated. Distance to destination: ${distance.toFixed(3)} km`,
      };
    } catch (error) {
      console.error('Error updating driver location:', error);

      if (error.message?.includes('geocode')) {
        throw new BadRequestException(
          `Unable to find the location "${locationName}". Please check the spelling or try a more specific address (e.g., "Westlands Shopping Mall, Nairobi").`,
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to update location. Please try again.',
      );
    }
  }

  async getMyParcels(driverId: number) {
    try {
      return await this.prisma.parcel.findMany({
        where: { driverId },
        orderBy: { sentAt: 'desc' },
        include: { driver: { select: { currentLat: true, currentLng: true } } },
      });
    } catch (error) {
      console.error('Error fetching driver parcels:', error);
      throw new BadRequestException('Failed to fetch parcels');
    }
  }

  async getAllDrivers() {
    try {
      return await this.prisma.driver.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          currentLat: true,
          currentLng: true,
          createdAt: true,
        },
      });
    } catch (error) {
      console.error('Error fetching drivers:', error);
      throw new BadRequestException('Failed to fetch drivers');
    }
  }

  async markParcelPickedUp(driverId: number, parcelId: string) {
    try {
      const parcelCheck = await this.prisma.parcel.findUnique({
        where: { id: parcelId },
        include: { driver: true },
      });

      console.log('📦 Parcel Found:', parcelCheck);
      console.log('🧑‍✈️ Requesting driverId:', driverId);

      if (!parcelCheck) {
        throw new BadRequestException(`Parcel with ID ${parcelId} not found`);
      }

      if (parcelCheck.driverId !== driverId) {
        throw new BadRequestException(
          `Parcel is not assigned to driver ID ${driverId}`,
        );
      }

      if (parcelCheck.status !== ParcelStatus.ASSIGNED) {
        throw new BadRequestException(
          `Parcel is in status "${parcelCheck.status}", expected ASSIGNED`,
        );
      }

      // 🔥 FIX: Update both parcel and driver status in a transaction
      const [parcel] = await this.prisma.$transaction([
        this.prisma.parcel.update({
          where: { id: parcelId },
          data: {
            status: ParcelStatus.PICKED_UP_BY_DRIVER,
            pickedAt: new Date(),
            updatedAt: new Date(),
          },
        }),
        this.prisma.driver.update({
          where: { id: driverId },
          data: {
            status: DriverStatus.ON_DELIVERY,
            canReceiveAssignments: false,
            updatedAt: new Date(),
          },
        }),
      ]);

      await this.prisma.parcelStatusLog.create({
        data: {
          parcelId: parcel.id,
          status: ParcelStatus.PICKED_UP_BY_DRIVER,
        },
      });

      console.log(
        `✅ Parcel ${parcelId} marked as picked up by driver ${driverId}`,
      );
      console.log(`✅ Driver ${driverId} status updated to ON_DELIVERY`);

      try {
        const adminEmail =
          this.configService.get<string>('ADMIN_EMAIL') ||
          'admin@senditcourier.com';
        await this.mailerService.sendPickupNotification(
          parcel.senderEmail,
          parcel.senderName,
          parcel.trackingId,
          parcel.from,
          parcelCheck.driver?.name,
        );
        await this.mailerService.sendPickupNotification(
          adminEmail,
          'Admin',
          parcel.trackingId,
          parcel.from,
          parcelCheck.driver?.name,
        );
      } catch (error) {
        console.error('Failed to send pickup notifications:', error);
        // Log but don't throw to avoid blocking status update
      }

      return parcel;
    } catch (error) {
      console.error('❌ Error marking parcel as picked up:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to mark parcel as picked up');
    }
  }

  async updateDriverStatus(driverId: number, status: string) {
    const validStatuses = [
      'AVAILABLE',
      'ON_DELIVERY',
      'OUT_SICK',
      'ON_LEAVE',
      'SUSPENDED',
    ];

    if (!validStatuses.includes(status.toUpperCase())) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: status.toUpperCase() as DriverStatus,
        canReceiveAssignments: status.toUpperCase() === 'AVAILABLE',
      },
    });
  }

  async softDeleteDriver(driverId: number) {
    const existing = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!existing) throw new BadRequestException('Driver not found');

    return this.prisma.driver.update({
      where: { id: driverId },
      data: { deletedAt: new Date(), canReceiveAssignments: false },
    });
  }

  async restoreDriver(driverId: number) {
    const existing = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!existing || !existing.deletedAt) {
      throw new BadRequestException('Driver is not deleted or does not exist');
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        deletedAt: null,
        status: DriverStatus.AVAILABLE,
        canReceiveAssignments: true,
      },
    });
  }

  async permanentlyDeleteDriver(driverId: number) {
    const existing = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!existing) throw new BadRequestException('Driver not found');

    return this.prisma.driver.delete({
      where: { id: driverId },
    });
  }
}
