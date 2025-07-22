import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // ✅ Import this
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ParcelModule } from './parcel/parcel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ✅ Add this line
    AuthModule,
    PrismaModule,
    ParcelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
