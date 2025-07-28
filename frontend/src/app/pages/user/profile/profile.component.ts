import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { UserService, UserProfile } from '../../../services/user.service';
import { NotificationService } from '../../../shared/notification/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any = {
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    profilePicture: null // Changed from placeholder to null
  };

  originalUser: any = {}; // Store original data for cancel functionality
  loading = false;

  newProfilePic: string | ArrayBuffer | null = null;

  showEditModal = false;
  showPasswordModal = false;

  emailCode: string = '';
  oldPassword: string = '';
  newPassword: string = '';

  constructor(
    private userService: UserService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.loading = true;
    this.userService.getUserProfile().subscribe({
      next: (profile) => {
        this.user = {
          fullName: profile.name,
          email: profile.email,
          phone: profile.phone || '',
          gender: '', // This field might not exist in your backend, you can add it later
          profilePicture: this.getSavedProfileImage(profile.id) // Load saved image if exists
        };
        this.originalUser = { ...this.user }; // Store original data
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.notificationService.error('Failed to load profile data');
        this.loading = false;
      }
    });
  }

  // Get saved profile image from localStorage
  getSavedProfileImage(userId: number): string | null {
    return localStorage.getItem(`profile_image_${userId}`) || null;
  }

  // Save profile image to localStorage
  saveProfileImageToStorage(userId: number, imageData: string): void {
    localStorage.setItem(`profile_image_${userId}`, imageData);
  }

  // Remove profile image from localStorage
  removeProfileImageFromStorage(userId: number): void {
    localStorage.removeItem(`profile_image_${userId}`);
  }

  triggerEditProfile(): void {
    this.originalUser = { ...this.user }; // Store current data before editing
    this.showEditModal = true;
  }

  triggerChangePassword(): void {
    this.showPasswordModal = true;
    this.oldPassword = '';
    this.newPassword = '';
    this.emailCode = '';
  }

  closeModals(): void {
    // Reset user data to original if editing was cancelled
    if (this.showEditModal) {
      this.user = { ...this.originalUser };
    }
    
    this.showEditModal = false;
    this.showPasswordModal = false;
    
    // Clear password fields
    this.oldPassword = '';
    this.newPassword = '';
    this.emailCode = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.error('File size should not exceed 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        this.notificationService.error('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.newProfilePic = reader.result;
        this.user.profilePicture = reader.result as string;
        
        // Save to localStorage immediately
        this.userService.getUserProfile().subscribe({
          next: (profile) => {
            this.saveProfileImageToStorage(profile.id, reader.result as string);
          }
        });
      };
      reader.readAsDataURL(file);
    }
  }

  // Method to remove profile picture
  removeProfilePicture(): void {
    this.user.profilePicture = null;
    this.newProfilePic = null;
    
    // Remove from localStorage
    this.userService.getUserProfile().subscribe({
      next: (profile) => {
        this.removeProfileImageFromStorage(profile.id);
        this.notificationService.success('Profile picture removed');
      }
    });
  }

  saveProfile(): void {
    if (!this.user.fullName || !this.user.email) {
      this.notificationService.error('Name and email are required');
      return;
    }

    this.loading = true;
    const updateData = {
      name: this.user.fullName,
      email: this.user.email,
      phone: this.user.phone
    };

    this.userService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.notificationService.success('Profile updated successfully');
        this.originalUser = { ...this.user }; // Update original data
        this.closeModals();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.notificationService.error('Failed to update profile');
        this.loading = false;
      }
    });
  }

  changePassword(): void {
    if (!this.oldPassword || !this.newPassword) {
      this.notificationService.error('Both old and new passwords are required');
      return;
    }

    if (this.newPassword.length < 6) {
      this.notificationService.error('New password must be at least 6 characters long');
      return;
    }

    this.loading = true;
    this.userService.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: (response) => {
        this.notificationService.success('Password changed successfully');
        this.closeModals();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error changing password:', error);
        this.notificationService.error(error.message || 'Failed to change password');
        this.loading = false;
      }
    });
  }
}