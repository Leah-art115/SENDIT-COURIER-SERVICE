/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ParcelService } from './parcel.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { Role } from '@prisma/client';
import { Roles } from 'src/guards/roles/roles.decorator';
import { RolesGuard } from 'src/guards/roles/roles.guard';
import { JwtGuard } from 'src/guards/jwt/jwt.guard';

// FIXED: Changed from 'api/parcels' to just 'parcels'
// Your Angular baseUrl already includes '/api'
@Controller('parcels')
export class ParcelController {
  constructor(private parcelService: ParcelService) {}

  @Post()
  @UseGuards(JwtGuard)
  async create(@Body() dto: CreateParcelDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    console.log('🔐 Creating parcel with authenticated user:', {
      userId,
      senderEmail: dto.senderEmail,
    });
    return this.parcelService.createParcel(dto, userId);
  }

  @Get('tracking/:trackingId')
  async getByTrackingId(@Param('trackingId') trackingId: string) {
    return this.parcelService.getParcelByTrackingId(trackingId);
  }

  @Get('dashboard/metrics')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getDashboardMetrics() {
    return this.parcelService.getDashboardMetrics();
  }

  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAll() {
    return this.parcelService.getAllParcels();
  }

  @Get(':trackingId')
  async getOne(@Param('trackingId') trackingId: string) {
    return this.parcelService.getParcelByTrackingId(trackingId);
  }

  @Patch(':id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.ADMIN)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.parcelService.updateParcelStatus(id, dto.status, dto.driverId);
  }

  @Patch('user/mark-collected/:id')
  @UseGuards(JwtGuard)
  async markCollected(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.parcelService.markParcelCollectedByReceiver(id, userId);
  }

  @Patch(':id/assign-driver')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
