import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DistanceService } from './distance.service';

@Module({
  imports: [HttpModule],
  providers: [DistanceService],
  exports: [DistanceService],
})
export class CommonModule {}
