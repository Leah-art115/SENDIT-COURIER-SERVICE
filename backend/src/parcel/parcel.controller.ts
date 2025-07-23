/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
} from '@nestjs/common';
import { ParcelService } from './parcel.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { Role } from '@prisma/client';
import { Roles } from 'src/guards/roles/roles.decorator';

@Controller('parcels')
export class ParcelController {
  constructor(private parcelService: ParcelService) {}

  // Create new parcel
  @Post()
  async create(@Body() dto: CreateParcelDto) {
    return this.parcelService.createParcel(dto);
  }

  // Get all parcels (admin)
  @Get()
  @Roles(Role.ADMIN)
  async getAll() {
    return this.parcelService.getAllParcels();
  }
  // Get parcel by tracking ID
  @Get(':trackingId')
  async getOne(@Param('trackingId') trackingId: string) {
    return this.parcelService.getParcelByTrackingId(trackingId);
  }

  // Update parcel status (driver only)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.parcelService.updateParcelStatus(id, dto.status, dto.driverId);
  }

  // Assign a driver to a parcel (admin only)
  @Patch(':id/assign-driver')
  async assignDriver(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.parcelService.assignDriver(id, dto.driverId);
  }

  // Get parcel status history
  @Get(':id/status-history')
  async getStatusHistory(@Param('id') id: string) {
    return this.parcelService.getStatusHistory(id);
  }
}
