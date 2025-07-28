/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../mailer/mailer.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mailerService: MailerService,
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

    // Send welcome email (non-blocking)
    this.sendWelcomeEmailAsync(user.email, user.name);

    return { message: 'Registration successful' };
  }

  // Private method to send welcome email asynchronously
  private async sendWelcomeEmailAsync(email: string, name: string) {
    try {
      await this.mailerService.sendWelcomeEmail(email, name);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
    }
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

  // New method: Request password reset
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email (non-blocking)
    this.sendPasswordResetEmailAsync(user.email, user.name, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  // Private method to send password reset email
  private async sendPasswordResetEmailAsync(
    email: string,
    name: string,
    resetToken: string,
  ) {
    try {
      await this.mailerService.sendPasswordResetEmail(email, name, resetToken);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );
    }
  }

  // New method: Reset password with token
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Update user password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successful' };
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

    // Send welcome email to driver (non-blocking)
    this.sendDriverWelcomeEmailAsync(driver.email, driver.name);

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

  // Private method to send driver welcome email
  private async sendDriverWelcomeEmailAsync(email: string, name: string) {
    try {
      await this.mailerService.sendWelcomeEmail(email, name);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to driver ${email}:`,
        error,
      );
    }
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
