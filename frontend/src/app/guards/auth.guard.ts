import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    // ✅ TEMPORARY: Always allow access during development
    // 🔒 TODO: Re-enable real auth check when backend is ready
    return true;

    /*
    // 🔐 Uncomment this block when backend + login are working
    if (this.authService.isAuthenticated()) {
      return true;
    } else {
      this.router.navigate(['/auth/login']);
      return false;
    }
    */
  }
}
