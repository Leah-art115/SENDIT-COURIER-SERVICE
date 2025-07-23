import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service'; // ✅ Make sure this path is correct

@Component({
  selector: 'app-user-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-navbar.component.html',
  styleUrls: ['./user-navbar.component.css']
})
export class UserNavbarComponent {
  constructor(private router: Router, private authService: AuthService) {}

  logout() {
    this.authService.logout(); // ✅ Perform actual logout
    this.router.navigate(['/auth/login']); // ✅ Redirect to login
  }
}
