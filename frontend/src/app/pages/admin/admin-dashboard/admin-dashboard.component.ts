import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ParcelSummary {
  id: string;
  sender: string;
  receiver: string;
  status: 'Delivered' | 'In Transit' | string;
  date: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  totalEarnings = 245000; // placeholder
  totalUsers = 120;       // placeholder
  parcelsInTransit = 25;  // placeholder
  parcelsDelivered = 80;  // placeholder

  recentParcels: ParcelSummary[] = [
    { id: 'PKG-0012', sender: 'Leah A.', receiver: 'Mark K.', status: 'Delivered', date: '2025-07-18' },
    { id: 'PKG-0013', sender: 'John M.', receiver: 'Daisy O.', status: 'In Transit', date: '2025-07-18' },
    { id: 'PKG-0014', sender: 'Daisy O.', receiver: 'Tony B.', status: 'Delivered', date: '2025-07-18' },
    { id: 'PKG-0015', sender: 'Tony B.', receiver: 'Leah A.', status: 'In Transit', date: '2025-07-18' }
  ];

  ngOnInit() {
    console.log('recentParcels:', this.recentParcels);
  }
}