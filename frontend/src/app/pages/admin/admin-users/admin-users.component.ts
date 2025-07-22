import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/notification/notification.service'; 

interface User {
  id: number;
  name: string;
  email: string;
  role: 'User' | 'Admin' | string;
  status: 'Active' | 'Suspended' | string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent {
  searchTerm = '';

  constructor(private notificationService: NotificationService) {} 

  users: User[] = [
    {
      id: 1,
      name: 'Leah Achieng',
      email: 'leah@example.com',
      role: 'User',
      status: 'Active',
      createdAt: '2025-06-30'
    },
    {
      id: 2,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'User',
      status: 'Active',
      createdAt: '2025-07-01'
    },
    {
      id: 3,
      name: 'Grace Mwangi',
      email: 'grace@example.com',
      role: 'User',
      status: 'Suspended',
      createdAt: '2025-07-02'
    }
  ];

  get filteredUsers(): User[] {
    return this.users.filter(u =>
      u.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  deleteUser(userId: number): void {
    this.notificationService.confirm('Are you sure you want to delete this user?', result => {
      if (result === 'yes') {
        this.users = this.users.filter(u => u.id !== userId);
        this.notificationService.success('User deleted successfully.');
      }
    });
  }
}
