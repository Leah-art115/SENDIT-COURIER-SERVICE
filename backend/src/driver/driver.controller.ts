/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Patch,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { DriverService } from './driver.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { AuthGuard } from '../guards/auth.guard';
import { Roles } from '../guards/roles/roles.decorator';
import { RolesGuard } from '../guards/roles/roles.guard';
import { Role } from '@prisma/client';

@Controller('driver')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.DRIVER)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Patch('location/:parcelId')
  async updateLocation(
    @Req() req,
    @Param('parcelId') parcelId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    const driverId = req.user.sub;
    return this.driverService.updateLocation(driverId, parcelId, dto.location);
  }

  @Get('my-parcels')
  async getAssignedParcels(@Req() req) {
    const driverId = req.user.sub;
    return this.driverService.getMyParcels(driverId);
  }

  @Patch('mark-picked-up/:id')
  async markPickedUp(@Req() req, @Param('id') parcelId: string) {
    const driverId = req.user.sub;
    return this.driverService.markParcelPickedUp(driverId, parcelId);
  }
}
