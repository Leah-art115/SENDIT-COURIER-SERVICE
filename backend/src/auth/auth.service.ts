/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
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
        role: 'USER',
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
      role: 'DRIVER',
    });

    return {
      message: 'Driver created successfully',
      access_token: token,
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

  // Fetch all users with role USER
  async getAllUsers() {
    return this.prisma.user.findMany({
      where: { role: 'USER' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  // New method to get total users count
  async getTotalUsers() {
    return this.prisma.user.count({
      where: { role: 'USER' },
    });
  }

  // New method to permanently delete a user
  async permanentlyDeleteUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async getMe(userId: number, role: string) {
    if (role === 'DRIVER') {
      const driver = await this.prisma.driver.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          mode: true,
          status: true,
          createdAt: true,
        },
      });

      if (!driver) throw new NotFoundException('Driver not found');

      return {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        role: 'DRIVER',
        mode: driver.mode,
        status: driver.status,
        createdAt: driver.createdAt,
      };
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) throw new NotFoundException('User not found');

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      };
    }
  }

  // Add these methods to your AuthService class

  async updateUserProfile(
    userId: number,
    updateData: { name: string; email: string; phone?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Check if email is already taken by another user
    if (updateData.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateData.email },
      });
      if (existingUser) throw new ForbiddenException('Email already exists');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: updateData.name,
        email: updateData.email,
        phone: updateData.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  async changeUserPassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid)
      throw new ForbiddenException('Current password is incorrect');

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
