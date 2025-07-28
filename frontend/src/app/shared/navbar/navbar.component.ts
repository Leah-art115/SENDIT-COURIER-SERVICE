import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // ✅ import

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  isMenuOpen = false;

  constructor(public router: Router, public authService: AuthService) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  scrollToSection(sectionId: string) {
  if (this.router.url !== '/') {
    // Navigate to home first
    this.router.navigate(['/']).then(() => {
      // Wait a moment for the DOM to render
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    });
  } else {
    // Already on home
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  this.isMenuOpen = false;
}


  showLoginForm() {
    this.isMenuOpen = false;
    this.router.navigate(['/auth/login']);
  }

  showRegisterForm() {
    this.isMenuOpen = false;
    this.router.navigate(['/auth/register']);
  }

  goToDashboard(): void {
  if (this.authService.isAdmin()) {
    this.router.navigate(['/admin']);
  } else if (this.authService.isDriver()) {
    this.router.navigate(['/driver']);
  } else {
    this.router.navigate(['/user']);
  }
}

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  hideAuthButtons(): boolean {
    return this.router.url.startsWith('/user') || this.router.url.startsWith('/admin');
  }
}
