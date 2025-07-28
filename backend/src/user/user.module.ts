import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles/roles.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, AuthGuard, RolesGuard],
})
export class UserModule {}
