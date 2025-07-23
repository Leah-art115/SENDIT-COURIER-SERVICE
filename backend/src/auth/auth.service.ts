/* eslint-disable @typescript-eslint/no-unused-vars */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateDriverDto } from './dto/create-driver.dto'; // ✅ New import
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ForbiddenException('Email already exists');

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hash,
        role: 'USER', // Default role
      },
    });

    return { message: 'Registration successful' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const driver = !user
      ? await this.prisma.driver.findUnique({
          where: { email: dto.email },
        })
      : null;

    if (!user && !driver) {
      throw new ForbiddenException('Invalid credentials');
    }

    const account = user ?? driver;
    if (!account) throw new ForbiddenException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, account.password);
    if (!isMatch) throw new ForbiddenException('Invalid credentials');

    const role = user ? user.role : 'DRIVER';

    const token = await this.jwt.signAsync({
      sub: account.id,
      email: account.email,
      role,
    });

    return {
      message: 'Login successful',
      access_token: token,
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        role,
        createdAt: account.createdAt,
      },
    };
  }

  // ✅ NEW METHOD: Admin-only — used to create driver accounts
  // ✅ UPDATED METHOD: Admin-only — creates driver + returns token
  async createDriver(dto: CreateDriverDto) {
    const existing = await this.prisma.driver.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ForbiddenException('Driver with that email already exists');

    const hash = await bcrypt.hash(dto.password, 10);

    const driver = await this.prisma.driver.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hash,
        mode: dto.mode,
        status: 'AVAILABLE',
        canReceiveAssignments: true,
      },
    });

    const token = await this.jwt.signAsync({
      sub: driver.id,
      email: driver.email,
      role: 'DRIVER', // ✅ REQUIRED for RolesGuard
    });

    return {
      message: 'Driver created successfully',
      access_token: token, // ✅ Now you're returning a valid JWT
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        mode: driver.mode,
        status: driver.status,
        createdAt: driver.createdAt,
      },
    };
  }
}
