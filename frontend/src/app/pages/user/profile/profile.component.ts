import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  profilePicture: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  user: UserProfile = {
    fullName: 'Leah Achieng',
    email: 'leah@example.com',
    phone: '0712345678',
    gender: 'Female',
    profilePicture: 'https://via.placeholder.com/120'
  };

  newProfilePic: string | ArrayBuffer | null = null;

  showEditModal = false;
  showPasswordModal = false;

  emailCode: string = '';
  oldPassword: string = '';
  newPassword: string = '';

  triggerEditProfile(): void {
    this.showEditModal = true;
  }

  triggerChangePassword(): void {
    this.showPasswordModal = true;
    // 🔔 Later: call backend to send email verification code
  }

  closeModals(): void {
    this.showEditModal = false;
    this.showPasswordModal = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        this.newProfilePic = reader.result;
        this.user.profilePicture = reader.result as string;
      };

      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    this.closeModals();
    // 🔔 Later: Save updated profile to backend
  }

  changePassword(): void {
    this.closeModals();
    // 🔔 Later: Send email code, validate and update password in backend
  }
}
