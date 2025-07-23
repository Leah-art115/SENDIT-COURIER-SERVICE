import { IsString } from 'class-validator';

export class UpdateLocationDto {
  @IsString()
  location: string;
}
