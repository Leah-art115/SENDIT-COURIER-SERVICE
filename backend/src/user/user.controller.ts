/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../guards/auth.guard';
import { Roles } from '../guards/roles/roles.decorator';
import { RolesGuard } from '../guards/roles/roles.guard';
import { Role } from '@prisma/client';

@Controller('user')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.USER)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('sent-parcels')
  getSentParcels(@Req() req) {
    return this.userService.getSentParcels(req.user.sub);
  }

  @Get('received-parcels')
  getReceivedParcels(@Req() req) {
    return this.userService.getReceivedParcels(req.user.sub);
  }

  @Get('track/:trackingId')
  trackParcel(@Param('trackingId') trackingId: string) {
    return this.userService.trackParcel(trackingId);
  }

  @Patch('mark-collected/:id')
  markParcelCollected(@Req() req, @Param('id') parcelId: string) {
    return this.userService.markAsCollected(req.user.sub, parcelId);
  }
}
