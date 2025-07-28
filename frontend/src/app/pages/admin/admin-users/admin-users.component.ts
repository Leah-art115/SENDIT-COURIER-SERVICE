import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/notification/notification.service';
import { AdminService } from '../../../services/admin.service';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | string;
  status: 'Active' | string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  searchTerm = '';
  users: User[] = [];

  constructor(
    private notificationService: NotificationService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: 'Active', // No deletedAt in schema, all users are Active
          createdAt: new Date(user.createdAt).toISOString()
        }));
      },
      error: (error) => {
        this.notificationService.error('Failed to load users: ' + error.message);
      }
    });
  }

  get filteredUsers(): User[] {
    return this.users.filter(u =>
      u.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  permanentlyDeleteUser(userId: number): void {
    this.notificationService.confirm('Are you sure you want to permanently delete this user?', result => {
      if (result === 'yes') {
        this.adminService.permanentlyDeleteUser(userId).subscribe({
          next: () => {
            this.users = this.users.filter(u => u.id !== userId);
            this.notificationService.success('User permanently deleted successfully.');
          },
          error: (error) => {
            this.notificationService.error('Failed to delete user: ' + error.message);
          }
        });
      }
    });
  }
}