import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isMenuOpen = false;
  isDropdownOpen = false;
  isHomePage = true; // Track if we're on the home page

  constructor(
    public router: Router, 
    public authService: AuthService
  ) {}

  ngOnInit() {
    // Check initial route
    this.checkIfHomePage();
    
    // Subscribe to route changes to update isHomePage
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.checkIfHomePage();
    });
  }

  // Check if current route is home page
  private checkIfHomePage() {
    this.isHomePage = this.router.url === '/';
  }

  // Listen for clicks on the document to close dropdown
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.user-dropdown-container');
    
    if (dropdown && !dropdown.contains(target)) {
      this.isDropdownOpen = false;
    }
  }

  // Mobile menu toggle
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isDropdownOpen = false;
    }
  }

  // User dropdown toggle
  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.isMenuOpen = false;
    }
  }

  // Navigate to dashboard based on user role
  navigateToDashboard(event: Event) {
    event.stopPropagation();
    
    this.isDropdownOpen = false;
    
    const userRole = this.authService.getCurrentUser()?.role;
    
    switch (userRole) {
      case 'ADMIN':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'DRIVER':
        this.router.navigate(['/driver/dashboard']);
        break;
      case 'USER':
        this.router.navigate(['/user/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  // Navigate to profile based on user role
  navigateToProfile(event: Event) {
    event.stopPropagation();
    
    this.isDropdownOpen = false;
    
    const userRole = this.authService.getCurrentUser()?.role;
    
    switch (userRole) {
      case 'ADMIN':
        // Admin doesn't have a profile page, redirect to dashboard
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'DRIVER':
        this.router.navigate(['/driver/profile']);
        break;
      case 'USER':
        this.router.navigate(['/user/profile']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  // Perform logout
  performLogout(event: Event) {
    event.stopPropagation();
    
    this.isDropdownOpen = false;
    this.authService.logout();
  }

  // Navigate to home page
  navigateToHome() {
    this.router.navigate(['/']);
    this.isMenuOpen = false;
    this.isDropdownOpen = false;
  }

  // Scroll to section functionality
  scrollToSection(sectionId: string) {
    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    this.isMenuOpen = false;
    this.isDropdownOpen = false;
  }

  // Show login form
  showLoginForm() {
    this.isMenuOpen = false;
    this.isDropdownOpen = false;
    this.router.navigate(['/auth/login']);
  }

  // Show register form
  showRegisterForm() {
    this.isMenuOpen = false;
    this.isDropdownOpen = false;
    this.router.navigate(['/auth/register']);
  }
}