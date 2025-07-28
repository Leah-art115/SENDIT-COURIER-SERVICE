/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Delete,
  Param,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Roles } from '../guards/roles/roles.decorator';
import { RolesGuard } from '../guards/roles/roles.guard';
import { JwtGuard } from '../guards/jwt/jwt.guard';
import { CreateDriverDto } from './dto/create-driver.dto';
import { GetUser } from '../guards/jwt/get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // New endpoint: Request password reset
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // New endpoint: Reset password with token
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('create-driver')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  createDriver(@Body() dto: CreateDriverDto) {
    return this.authService.createDriver(dto);
  }

  @Get('users')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Delete('users/:id/permanent')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  permanentlyDeleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.authService.permanentlyDeleteUser(id);
  }

  @Get('users/count')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  getTotalUsers() {
    return this.authService.getTotalUsers();
  }

  @Get('me')
  @UseGuards(JwtGuard)
  getMe(@GetUser() user: any) {
    return this.authService.getMe(user.id, user.role);
  }

  @Patch('profile')
  @UseGuards(JwtGuard)
  updateProfile(
    @GetUser() user: any,
    @Body() updateData: { name: string; email: string; phone?: string },
  ) {
    return this.authService.updateUserProfile(user.id, updateData);
  }

  @Patch('change-password')
  @UseGuards(JwtGuard)
  changePassword(
    @GetUser() user: any,
    @Body() passwordData: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changeUserPassword(
      user.id,
      passwordData.oldPassword,
      passwordData.newPassword,
    );
  }
}
