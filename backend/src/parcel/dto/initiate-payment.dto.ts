import { IsString, Matches } from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  @Matches(/^2547\d{8}$/, {
    message: 'Phone number must be in the format 2547XXXXXXXX',
  })
  phoneNumber: string;
}
