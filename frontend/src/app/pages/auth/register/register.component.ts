import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../shared/notification/notification.service';
import { AuthService } from '../../../services/auth.service';

interface RegisterFormModel {
  fullName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup<RegisterFormModel>;

  constructor(
    private fb: FormBuilder,
    private notifications: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.nonNullable.group({
      fullName: this.fb.nonNullable.control('', Validators.required),
      email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
      phone: this.fb.nonNullable.control('', Validators.required),
      password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)])
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const formData = this.registerForm.getRawValue();
      const success = this.authService.register(formData);

      if (success) {
        this.notifications.success('Registered successfully!');
        this.router.navigate(['/dashboard']);
      } else {
        this.notifications.error('Registration failed. Please try again.');
      }
    }
  }
}
