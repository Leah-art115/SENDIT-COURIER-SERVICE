import { Module } from '@nestjs/common';
import { ParcelService } from './parcel.service';
import { ParcelController } from './parcel.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles/roles.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, AuthModule, JwtModule.register({}), ConfigModule], // Added AuthModule
  controllers: [ParcelController],
  providers: [ParcelService, AuthGuard, RolesGuard],
})
export class ParcelModule {}
