import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverStatus, CourierMode } from '@prisma/client';

@Injectable()
export class AdminService {
  resendEmails: any;
  constructor(private readonly prisma: PrismaService) {}

  // Get all drivers (including deleted ones for admin panel)
  async getAllDrivers() {
    return this.prisma.driver.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            parcels: true,
          },
        },
      },
    });
  }

  async getAvailableDrivers() {
    return this.prisma.driver.findMany({
      where: {
        status: DriverStatus.AVAILABLE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
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
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        parcels: {
          take: 10,
          orderBy: { sentAt: 'desc' },
        },
        _count: {
          select: {
            parcels: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    return driver;
  }

  // Update driver details (name, email, mode, status)
  async updateDriver(
    id: number,
    updateData: {
      name?: string;
      email?: string;
      mode?: CourierMode;
      status?: DriverStatus;
    },
  ) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.deletedAt)
      throw new BadRequestException('Cannot update a deleted driver');

    // Validate email if provided
    if (updateData.email) {
      const existingEmail = await this.prisma.driver.findFirst({
        where: {
          email: updateData.email,
          id: { not: id },
        },
      });
      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    const updatedDriver = await this.prisma.driver.update({
      where: { id },
      data: {
        ...updateData,
        canReceiveAssignments: updateData.status
          ? updateData.status === DriverStatus.AVAILABLE
          : driver.canReceiveAssignments,
        updatedAt: new Date(),
      },
    });

    return updatedDriver;
  }

  async updateDriverStatus(id: number, status: DriverStatus) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.deletedAt)
      throw new BadRequestException('Cannot update a deleted driver');

    return this.prisma.driver.update({
      where: { id },
      data: {
        status,
        canReceiveAssignments: status === DriverStatus.AVAILABLE,
        updatedAt: new Date(),
      },
    });
  }

  async restoreDriver(id: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (!driver.deletedAt)
      throw new BadRequestException('Driver is not deleted');

    return this.prisma.driver.update({
      where: { id },
      data: {
        deletedAt: null,
        status: DriverStatus.AVAILABLE,
        canReceiveAssignments: true,
        updatedAt: new Date(),
      },
    });
  }

  async softDeleteDriver(id: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.deletedAt)
      throw new BadRequestException('Driver already deleted');

    return this.prisma.driver.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: DriverStatus.SUSPENDED,
        canReceiveAssignments: false,
        updatedAt: new Date(),
      },
    });
  }

  // Permanently delete driver
  async permanentlyDeleteDriver(id: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');

    // Check if driver has any parcels - prevent deletion if they do
    const parcelCount = await this.prisma.parcel.count({
      where: { driverId: id },
    });
    if (parcelCount > 0) {
      throw new BadRequestException(
        'Cannot permanently delete driver with assigned parcels. Please reassign parcels first.',
      );
    }

    return this.prisma.driver.delete({
      where: { id },
    });
  }
}
