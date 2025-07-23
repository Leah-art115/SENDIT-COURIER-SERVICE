import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Roles } from '../guards/roles/roles.decorator';
import { RolesGuard } from '../guards/roles/roles.guard';
import { JwtGuard } from '../guards/jwt/jwt.guard';
import { CreateDriverDto } from './dto/create-driver.dto';

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

  @Post('create-driver')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  createDriver(@Body() dto: CreateDriverDto) {
    return this.authService.createDriver(dto);
  }
}
