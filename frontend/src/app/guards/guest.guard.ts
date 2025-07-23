import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.authService.isAuthenticated()) {
      return true;
    }

    const role = this.authService.getCurrentUser()?.role;

    switch (role) {
      case 'ADMIN':
        this.router.navigate(['/admin']);
        break;
      case 'DRIVER':
        this.router.navigate(['/driver']);
        break;
      default:
        this.router.navigate(['/dashboard']);
    }

    return false;
  }
}
