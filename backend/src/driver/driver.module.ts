import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt'; // ✅ import this
import { JwtGuard } from '../guards/jwt/jwt.guard';
import { RolesGuard } from '../guards/roles/roles.guard';

@Module({
  imports: [JwtModule.register({})], // ✅ required so JwtService is available
  controllers: [DriverController],
  providers: [DriverService, PrismaService, JwtGuard, RolesGuard],
})
export class DriverModule {}
