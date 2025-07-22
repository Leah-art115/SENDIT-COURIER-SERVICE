import { ParcelType, TransportMode } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateParcelDto {
  @IsString() @IsNotEmpty() senderName: string;
  @IsEmail() senderEmail: string;

  @IsString() @IsNotEmpty() receiverName: string;
  @IsEmail() receiverEmail: string;

  @IsString() @IsNotEmpty() from: string;
  @IsString() @IsNotEmpty() to: string;

  @IsEnum(ParcelType) type: ParcelType;
  @IsNumber() weight: number;

  @IsEnum(TransportMode) mode: TransportMode;
  @IsString() @IsOptional() description?: string;
}
