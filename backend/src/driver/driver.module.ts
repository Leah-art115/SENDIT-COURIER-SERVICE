import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles/roles.guard';
import { ParcelService } from '../parcel/parcel.service';
import { AppMailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [PrismaModule, AppMailerModule, AuthModule],
  controllers: [DriverController],
  providers: [DriverService, ParcelService, AuthGuard, RolesGuard],
})
export class DriverModule {}
