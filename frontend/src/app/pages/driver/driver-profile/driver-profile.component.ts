import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, DriverNavbarComponent],
  templateUrl: './driver-profile.component.html',
  styleUrls: ['./driver-profile.component.css']
})
export class DriverProfileComponent {
  driver = {
    name: 'Leah Achieng',
    email: 'leah.driver@sendit.com',
    mode: 'Motorcycle',
    status: 'Available',
    joined: '2025-05-12'
  };

  showPasswordModal = false;
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

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
