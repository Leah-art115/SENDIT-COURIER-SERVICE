import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../shared/notification/notification.service';
import { AbstractControl, ValidationErrors } from '@angular/forms';


@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  currentStep: 'email' | 'otp' | 'reset' = 'email';

  emailForm: FormGroup<{
    email: FormControl<string>;
  }>;

  otpForm: FormGroup<{
    otp: FormControl<string>;
  }>;

  resetForm: FormGroup<{
    newPassword: FormControl<string>;
    confirmPassword: FormControl<string>;
  }>;

  constructor(
    private fb: FormBuilder,
    private notifications: NotificationService
  ) {
    // Step 1: Email form
    this.emailForm = this.fb.nonNullable.group({
      email: this.fb.nonNullable.control('', [Validators.required, Validators.email])
    });

    // Step 2: OTP form
    this.otpForm = this.fb.nonNullable.group({
      otp: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)])
    });

    // Step 3: Reset password form
    this.resetForm = this.fb.nonNullable.group(
      {
        newPassword: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
        confirmPassword: this.fb.nonNullable.control('', [Validators.required])
      },
      { validators: this.passwordMatchValidator }
    );
  }

  // Custom validator for password matching
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const group = control as FormGroup;
  const password = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { mismatch: true };
}


  // Step 1: Send OTP to email
  onSendOtp(): void {
    if (this.emailForm.valid) {
      const email = this.emailForm.getRawValue().email;
      // TODO: Replace with actual API call
      console.log('Sending OTP to:', email);
      this.notifications.success('OTP sent to your email!');
      this.currentStep = 'otp';
    }
  }

  // Step 2: Verify OTP
  onVerifyOtp(): void {
    if (this.otpForm.valid) {
      const otp = this.otpForm.getRawValue().otp;
      // TODO: Replace with actual API call
      console.log('Verifying OTP:', otp);
      this.notifications.success('OTP verified successfully!');
      this.currentStep = 'reset';
    }
  }

  // Step 3: Reset password
  onResetPassword(): void {
    if (this.resetForm.valid) {
      const { newPassword } = this.resetForm.getRawValue();
      // TODO: Replace with actual API call
      console.log('Resetting password:', newPassword);
      this.notifications.success('Password reset successfully!');
      // this.router.navigate(['/auth/login']);
    }
  }

  // Go back to previous step
  goBack(): void {
    if (this.currentStep === 'otp') {
      this.currentStep = 'email';
    } else if (this.currentStep === 'reset') {
      this.currentStep = 'otp';
    }
  }
}
