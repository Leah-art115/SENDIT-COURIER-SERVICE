import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';

interface Activity {
  id: string;
  type: 'Sent' | 'Received';
  date: string;
  status: 'Delivered' | 'In Transit' | 'Cancelled' | string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, UserNavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  userName: string = 'Leah'; // Replace with actual user data later

  totalSent: number = 42;
  totalReceived: number = 35;
  inTransit: number = 7;

  recentActivities: Activity[] = [
    { id: 'PKG-1001', type: 'Sent', date: '2025-07-15', status: 'Delivered' },
    { id: 'PKG-1002', type: 'Received', date: '2025-07-14', status: 'In Transit' },
    { id: 'PKG-1003', type: 'Sent', date: '2025-07-13', status: 'Delivered' },
    { id: 'PKG-1004', type: 'Received', date: '2025-07-12', status: 'Cancelled' },
    { id: 'PKG-1005', type: 'Sent', date: '2025-07-11', status: 'In Transit' },
    { id: 'PKG-1006', type: 'Received', date: '2025-07-10', status: 'Delivered' },
    { id: 'PKG-1007', type: 'Sent', date: '2025-07-09', status: 'In Transit' },
    { id: 'PKG-1008', type: 'Received', date: '2025-07-08', status: 'Delivered' }
  ];
}
