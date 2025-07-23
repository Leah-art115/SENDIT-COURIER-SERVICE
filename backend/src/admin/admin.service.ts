import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllDrivers() {
    return this.prisma.driver.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllParcels() {
    return this.prisma.parcel.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        driver: true,
        statusHistory: true,
      },
    });
  }

  async getParcelStatusHistory(parcelId: string) {
    return this.prisma.parcelStatusLog.findMany({
      where: { parcelId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getDriverById(id: number) {
    return this.prisma.driver.findUnique({
      where: { id },
    });
  }
}
