import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule], // ✅ include RouterModule
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  isMenuOpen = false;

  constructor(private router: Router) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.isMenuOpen = false;
  }

  showLoginForm() {
    this.isMenuOpen = false;
    this.router.navigate(['/auth/login']); // ✅ navigate to login
  }

  showRegisterForm() {
    this.isMenuOpen = false;
    this.router.navigate(['/auth/register']); // ✅ navigate to register
  }

  hideAuthButtons(): boolean {
  return this.router.url.startsWith('/user') || this.router.url.startsWith('/admin');
}

}
