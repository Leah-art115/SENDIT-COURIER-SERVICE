import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../guards/roles/roles.decorator';
import { JwtGuard } from '../guards/jwt/jwt.guard';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('drivers')
  getAllDrivers() {
    return this.adminService.getAllDrivers();
  }

  @Get('parcels')
  getAllParcels() {
    return this.adminService.getAllParcels();
  }

  @Get('parcel/:id/status-history')
  getParcelStatusHistory(@Param('id') parcelId: string) {
    return this.adminService.getParcelStatusHistory(parcelId);
  }

  @Get('driver/:id')
  getDriverById(@Param('id') id: number) {
    return this.adminService.getDriverById(Number(id));
  }
}
