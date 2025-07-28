/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
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

  @Post('emails/resend/:parcelId')
  async resendEmails(
    @Param('parcelId') parcelId: string,
    @Body()
    dto: { emailType: 'pickup' | 'delivery' | 'location' | 'assignment' },
  ) {
    return this.adminService.resendEmails(parcelId, dto.emailType);
  }

  // Get email sending status/logs (if you implement email logging)
  @Get('emails/logs')
  async getEmailLogs() {
    // This would require implementing email logging in your mailer service
    return { message: 'Email logging not yet implemented' };
  }
}
