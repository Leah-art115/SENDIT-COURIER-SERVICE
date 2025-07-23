import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; 
import { NotificationService } from '../../../shared/notification/notification.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  constructor(
    private notify: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  credentials = {
    email: '',
    password: ''
  };

  onLogin(form: NgForm): void {
    if (form.valid) {
      this.authService.login(this.credentials.email, this.credentials.password).subscribe({
        next: (success) => {
          if (success) {
            this.notify.success('Logged in successfully ✅');
            // Let AuthService handle navigation completely
          } else {
            this.notify.error('Invalid credentials');
          }
        },
        error: (error) => {
          console.error('Login error:', error);
          this.notify.error('Login failed. Please try again.');
        }
      });
    }
  }
}