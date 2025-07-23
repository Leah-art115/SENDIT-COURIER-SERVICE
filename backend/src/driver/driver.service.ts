import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { geocodeLocation } from '../common/utils/geocode';
import { getDistanceInKm } from '../common/utils/distance';
import { ParcelStatus } from '@prisma/client';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async updateLocation(
    driverId: number,
    parcelId: string,
    locationName: string,
  ): Promise<{ status: ParcelStatus | null }> {
    const coords = await geocodeLocation(locationName);

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLat: coords.lat,
        currentLng: coords.lng,
      },
    });

    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id: parcelId,
        driverId,
        status: {
          in: [
            ParcelStatus.ASSIGNED,
            ParcelStatus.PICKED_UP_BY_DRIVER,
            ParcelStatus.IN_TRANSIT,
          ],
        },
      },
    });

    if (
      !parcel ||
      parcel.destinationLat == null ||
      parcel.destinationLng == null
    ) {
      return { status: null };
    }

    const distance = getDistanceInKm(
      coords.lat,
      coords.lng,
      parcel.destinationLat,
      parcel.destinationLng,
    );

    const newStatus =
      distance <= 0.3 ? ParcelStatus.DELIVERED : ParcelStatus.IN_TRANSIT;

    await this.prisma.parcel.update({
      where: { id: parcel.id },
      data: {
        status: newStatus,
        deliveredAt:
          newStatus === ParcelStatus.DELIVERED ? new Date() : undefined,
      },
    });

    await this.prisma.parcelStatusLog.create({
      data: {
        parcelId: parcel.id,
        status: newStatus,
      },
    });

    return { status: newStatus };
  }

  async getMyParcels(driverId: number) {
    return this.prisma.parcel.findMany({
      where: { driverId },
      orderBy: { sentAt: 'desc' },
    });
  }

  async getAllDrivers() {
    return this.prisma.driver.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markParcelPickedUp(driverId: number, parcelId: string) {
    const parcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: ParcelStatus.PICKED_UP_BY_DRIVER, // ✅ Correct enum
        pickedAt: new Date(),
      },
    });

    await this.prisma.parcelStatusLog.create({
      data: {
        parcelId: parcel.id,
        status: ParcelStatus.PICKED_UP_BY_DRIVER,
      },
    });

    return parcel;
  }
}
