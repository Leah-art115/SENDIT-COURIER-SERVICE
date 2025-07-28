import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';
import { DriverService, DriverProfile } from '../../../services/driver.service';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, DriverNavbarComponent],
  templateUrl: './driver-profile.component.html',
  styleUrls: ['./driver-profile.component.css']
})
export class DriverProfileComponent implements OnInit {
  driver: any = {
    name: '',
    email: '',
    mode: '',
    status: '',
    joined: ''
  };

  showPasswordModal = false;
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor(private driverService: DriverService) {}

  ngOnInit(): void {
    this.loadDriverProfile();
  }

  loadDriverProfile(): void {
    this.driverService.getDriverProfile().subscribe({
      next: (profile) => {
        this.driver = {
          name: profile.name,
          email: profile.email,
          mode: profile.mode || 'N/A',
          status: profile.status || 'N/A',
          joined: profile.createdAt ? new Date(profile.createdAt).toDateString() : 'N/A'
        };
      },
      error: (error) => {
        console.error('Error loading driver profile:', error);
      }
    });
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  changePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    // Simulate password change
    alert('Password changed successfully!');
    this.closePasswordModal();
  }
}