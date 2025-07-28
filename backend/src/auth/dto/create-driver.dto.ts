import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export enum CourierMode {
  BICYCLE = 'BICYCLE',
  SKATES = 'SKATES',
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
}

export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  ON_DELIVERY = 'ON_DELIVERY',
  OUT_SICK = 'OUT_SICK',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
}

// For creating new drivers
export class CreateDriverDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsEnum(CourierMode)
  mode: CourierMode;
}

// For admin updating driver details
export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(CourierMode)
  mode?: CourierMode;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}

// For updating just driver status
export class UpdateDriverStatusDto {
  @IsEnum(DriverStatus)
  status: DriverStatus;
}
