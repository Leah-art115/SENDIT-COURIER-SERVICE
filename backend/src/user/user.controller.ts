/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

  // 📨 Parcels sent by the logged-in user
  @Get('sent-parcels')
  getSentParcels(@Req() req) {
    const { name, email } = req.user;
    return this.userService.getSentParcels(name, email);
  }

  // 📥 Parcels received by the logged-in user
  @Get('received-parcels')
  getReceivedParcels(@Req() req) {
    const { name, email } = req.user;
    return this.userService.getReceivedParcels(name, email);
  }

  // 📦 Track a parcel by tracking ID
  @Get('track/:trackingId')
  trackParcel(@Param('trackingId') trackingId: string) {
    return this.userService.trackParcel(trackingId);
  }

  // ✅ User marks parcel as collected
  @Patch('mark-collected/:id')
  markParcelCollected(@Req() req, @Param('id') parcelId: string) {
    const userId = req.user.sub;
    return this.userService.markAsCollected(userId, parcelId);
  }

  // ✅ User marks that driver picked up parcel
  @Patch('mark-driver-picked-up/:id')
  markDriverPickedUp(@Req() req, @Param('id') parcelId: string) {
    const userId = req.user.sub;
    return this.userService.markDriverPickedUp(userId, parcelId);
  }
}
