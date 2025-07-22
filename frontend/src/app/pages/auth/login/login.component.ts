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

  onLogin(form: NgForm) {
    if (form.valid) {
      if (this.authService.login(this.credentials.email, this.credentials.password)) {
        this.notify.success('Logged in successfully ✅');
        this.router.navigate(['/dashboard']);
      } else {
        this.notify.error('Invalid credentials');
      }
    }
  }
}