/* eslint-disable @typescript-eslint/no-unused-vars */
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
