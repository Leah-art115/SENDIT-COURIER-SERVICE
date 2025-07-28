import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles/roles.guard';
import { Roles } from '../guards/roles/roles.decorator';
import { Role, DriverStatus, CourierMode } from '@prisma/client';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Get all drivers (including deleted ones)
  @Get('drivers')
  async getAllDrivers() {
    return this.adminService.getAllDrivers();
  }

  // Get available drivers only
  @Get('drivers/available')
  async getAvailableDrivers() {
    return this.adminService.getAvailableDrivers();
  }

  // Get all parcels
  @Get('parcels')
  async getAllParcels() {
    return this.adminService.getAllParcels();
  }

  // Get driver by ID
  @Get('driver/:id')
  async getDriverById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getDriverById(id);
  }

  // Update driver details
  @Patch('driver/:id')
  async updateDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateDriverDto: {
      name?: string;
      email?: string;
      mode?: CourierMode;
      status?: DriverStatus;
    },
  ) {
    return this.adminService.updateDriver(id, updateDriverDto);
  }

  // Update driver status
  @Patch('driver/:id/status')
  async updateDriverStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateDriverStatusDto,
  ) {
    return this.adminService.updateDriverStatus(id, updateStatusDto.status);
  }

  // Soft delete driver
  @Delete('driver/:id')
  async deleteDriver(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.softDeleteDriver(id);
  }

  // Restore deleted driver
  @Patch('driver/:id/restore')
  async restoreDriver(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.restoreDriver(id);
  }

  // Permanently delete driver
  @Delete('driver/:id/permanent')
  async permanentlyDeleteDriver(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.permanentlyDeleteDriver(id);
  }
}
