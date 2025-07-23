import { IsEnum, IsInt } from 'class-validator';
import { ParcelStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(ParcelStatus)
  status: ParcelStatus;

  @IsInt()
  driverId: number;
}
