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

@Controller('parcels')
export class ParcelController {
  constructor(private parcelService: ParcelService) {}

  // Create new parcel
  @Post()
  async create(@Body() dto: CreateParcelDto) {
    return this.parcelService.createParcel(dto); // ✅ updated
  }

  // Get all parcels (admin)
  @Get()
  async getAll() {
    return this.parcelService.getAllParcels();
  }

  // Get parcel by tracking ID
  @Get(':trackingId')
  async getOne(@Param('trackingId') trackingId: string) {
    return this.parcelService.getParcelByTrackingId(trackingId);
  }

  // Update parcel status (admin)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.parcelService.updateParcelStatus(id, dto.status);
  }

  // Get parcel status history
  @Get(':id/status-history')
  async getStatusHistory(@Param('id') id: string) {
    return this.parcelService.getStatusHistory(id);
  }

  // Optionally: get parcels for a specific user
  // @Get('/user/:email')
  // async getParcelsForUser(@Param('email') email: string) {
  //   return this.parcelService.getParcelsForUser(email);
  // }
}
