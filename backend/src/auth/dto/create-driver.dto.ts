import { IsEmail, IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum CourierMode {
  BICYCLE = 'BICYCLE',
  SKATES = 'SKATES',
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
}

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
