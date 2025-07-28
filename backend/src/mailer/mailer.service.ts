/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

interface ParcelInfo {
  trackingNumber: string;
  receiverName: string;
  senderName?: string;
}

interface LocationInfo {
  address: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    private readonly mailerService: NestMailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Welcome to SendItCourier!',
        template: 'welcome-user',
        context: {
          name,
          appName: 'SendItCourier',
          loginUrl: this.configService.get<string>('FRONTEND_LOGIN_URL'),
        },
      });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error.stack);
      throw error;
    }
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Verify Your SendItCourier Account Email',
        template: 'email-verification',
        context: {
          name,
          otp,
          appName: 'SendItCourier',
          expiresIn: 10, // OTP expires in 10 minutes
        },
      });
      this.logger.log(`OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error.stack);
      throw error;
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    try {
      const expiresIn = 60; // 1 hour in minutes

      await this.mailerService.sendMail({
        to,
        subject: 'Reset Your SendItCourier Account Password',
        template: 'password-reset-otp',
        context: {
          name,
          otp,
          expiresIn,
          appName: 'SendItCourier',
        },
      });
      this.logger.log(`Password reset OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset OTP email to ${to}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendDeliveryNotification(
    to: string,
    name: string,
    trackingNumber: string,
    address: string,
    deliveryTime?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `Your SendIt Parcel ${trackingNumber} Has Been Delivered!`,
        template: 'parcel-delivered',
        context: {
          name,
          trackingNumber,
          address,
          deliveryTime: deliveryTime || new Date().toLocaleString(),
          appName: 'SendIt Courier Services',
          trackingUrl: `${this.configService.get<string>('FRONTEND_URL')}/track/${trackingNumber}`,
          supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
        },
      });
      this.logger.log(
        `Delivery notification sent to ${to} for parcel ${trackingNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send delivery notification to ${to}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendLocationUpdateNotification(
    to: string,
    name: string,
    trackingNumber: string,
    location: string,
    estimatedArrival?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `SendIt Parcel ${trackingNumber} Location Update`,
        template: 'parcel-location-update',
        context: {
          name,
          trackingNumber,
          location,
          updateTime: new Date().toLocaleString(),
          estimatedArrival,
          appName: 'SendIt Courier Services',
          trackingUrl: `${this.configService.get<string>('FRONTEND_URL')}/track/${trackingNumber}`,
          supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
        },
      });
      this.logger.log(
        `Location update notification sent to ${to} for parcel ${trackingNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send location update notification to ${to}`,
        error.stack,
      );
      // Don't throw error for location updates to avoid blocking driver location updates
    }
  }

  async sendParcelAssignmentNotification(
    driverEmail: string,
    driverName: string,
    parcelInfo: ParcelInfo,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: driverEmail,
        subject: `New Parcel Assignment - ${parcelInfo.trackingNumber}`,
        template: 'parcel-assignment',
        context: {
          driverName,
          trackingNumber: parcelInfo.trackingNumber,
          receiverName: parcelInfo.receiverName,
          senderName: parcelInfo.senderName,
          appName: 'SendIt Courier Services',
          driverPortalUrl: `${this.configService.get<string>('FRONTEND_URL')}/driver/dashboard`,
          supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
        },
      });
      this.logger.log(
        `Parcel assignment notification sent to driver ${driverEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send parcel assignment notification to ${driverEmail}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendPickupNotification(
    to: string,
    name: string,
    trackingNumber: string,
    pickupLocation: string,
    driverName?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `Your SendIt Parcel ${trackingNumber} Has Been Picked Up`,
        template: 'parcel-pickup',
        context: {
          name,
          trackingNumber,
          pickupLocation,
          pickupTime: new Date().toLocaleString(),
          driverName,
          appName: 'SendIt Courier Services',
          trackingUrl: `${this.configService.get<string>('FRONTEND_URL')}/track/${trackingNumber}`,
          supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
        },
      });
      this.logger.log(
        `Pickup notification sent to ${to} for parcel ${trackingNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send pickup notification to ${to}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendReceiverPickupNotification(
    to: string,
    name: string,
    trackingNumber: string,
    pickupLocation: string,
    pickupInstructions?: string,
    driverName?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `Your SendIt Parcel ${trackingNumber} is Ready for Pickup!`,
        template: 'receiver-pickup-notification',
        context: {
          name,
          trackingNumber,
          pickupLocation,
          pickupInstructions,
          driverName,
          arrivalTime: new Date().toLocaleString(),
          appName: 'SendIt Courier Services',
          trackingUrl: `${this.configService.get<string>('FRONTEND_URL')}/track/${trackingNumber}`,
          supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
        },
      });
      this.logger.log(
        `Receiver pickup notification sent to ${to} for parcel ${trackingNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send receiver pickup notification to ${to}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendSenderDeliveryConfirmation(
    to: string,
    senderName: string,
    receiverName: string,
    trackingNumber: string,
    deliveryAddress: string,
    deliveryTime?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `Your SendIt Parcel ${trackingNumber} Has Been Successfully Delivered`,
        template: 'sender-delivery-confirmation',
        context: {
          senderName,
          receiverName,
          trackingNumber,
          deliveryAddress,
          deliveryTime: deliveryTime || new Date().toLocaleString(),
          appName: 'SendIt Courier Services',
          trackingUrl: `${this.configService.get<string>('FRONTEND_URL')}/track/${trackingNumber}`,
          supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
        },
      });
      this.logger.log(
        `Sender delivery confirmation sent to ${to} for parcel ${trackingNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send sender delivery confirmation to ${to}`,
        error.stack,
      );
      throw error;
    }
  }
}
