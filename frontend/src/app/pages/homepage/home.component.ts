import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // ✅ Import Router
import { NotificationService } from '../../shared/notification/notification.service';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomepageComponent implements OnInit {
  trackingId: string = '';

  constructor(
    private notify: NotificationService,
    private router: Router // ✅ Inject Router properly
  ) {}

  ngOnInit(): void {
    this.initializeAnimations();
  }

  trackPackage(): void {
    if (this.trackingId) {
      this.notify.info(`Tracking package: ${this.trackingId}`);
    } else {
      this.notify.warning('Please enter a tracking ID.');
    }
  }

  showLoginForm() {
    this.router.navigate(['/auth/login']);
  }

  showRegisterForm() {
    this.router.navigate(['/auth/register']);
  }

  startShipping(): void {
    this.notify.success('Redirecting to shipping form or dashboard...');
  }

  private initializeAnimations(): void {
    window.addEventListener('scroll', this.animateOnScroll.bind(this));
    setTimeout(() => this.animateOnScroll(), 100);
  }

  private animateOnScroll(): void {
    const elements = document.querySelectorAll<HTMLElement>('.service-item, .step, .feature-card');
    elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (elementTop < windowHeight - 100) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }
    });
  }
}
