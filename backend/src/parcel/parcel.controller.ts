/* eslint-disable @typescript-eslint/require-await */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ParcelService } from './parcel.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { Role } from '@prisma/client';
import { Roles } from 'src/guards/roles/roles.decorator';
import { RolesGuard } from 'src/guards/roles/roles.guard';
import { JwtGuard } from 'src/guards/jwt/jwt.guard';

@Controller('parcels')
export class ParcelController {
  constructor(private parcelService: ParcelService) {}

  @Post()
  async create(@Body() dto: CreateParcelDto) {
    return this.parcelService.createParcel(dto);
  }

  // Add this new route for public tracking (no auth required)
  @Get('tracking/:trackingId')
  async getByTrackingId(@Param('trackingId') trackingId: string) {
    return this.parcelService.getParcelByTrackingId(trackingId);
  }

  // Move specific routes BEFORE parameterized routes
  @Get('dashboard/metrics')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getDashboardMetrics() {
    return this.parcelService.getDashboardMetrics();
  }

  @Get()
  @Roles(Role.ADMIN)
  async getAll() {
    return this.parcelService.getAllParcels();
  }

  // Parameterized routes should come AFTER specific routes
  @Get(':trackingId')
  async getOne(@Param('trackingId') trackingId: string) {
    return this.parcelService.getParcelByTrackingId(trackingId);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.parcelService.updateParcelStatus(id, dto.status, dto.driverId);
  }

  @Patch(':id/assign-driver')
  async assignDriver(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.parcelService.assignDriver(id, dto.driverId);
  }

  @Get(':id/status-history')
  async getStatusHistory(@Param('id') id: string) {
    return this.parcelService.getStatusHistory(id);
  }

  @Patch(':id/unassign-driver')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async unassignDriver(@Param('id') parcelId: string) {
    return this.parcelService.unassignDriver(parcelId);
  }

  @Post(':id/notify-delivery')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async manualDeliveryNotification(@Param('id') parcelId: string) {
    return this.parcelService.sendManualDeliveryNotification(parcelId);
  }

  @Post(':id/notify-location')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async manualLocationNotification(
    @Param('id') parcelId: string,
    @Body() dto: { location: string; message?: string },
  ) {
    return this.parcelService.sendManualLocationNotification(
      parcelId,
      dto.location,
      dto.message,
    );
  }
}
