import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- Add this import
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true, // <-- Add this if using standalone components
  imports: [CommonModule, DriverNavbarComponent], // <-- Add CommonModule here
  templateUrl: './driver-dashboard.component.html',
  styleUrls: ['./driver-dashboard.component.css']
})
export class DriverDashboardComponent implements OnInit {
  driverName = 'Alex Kipkoech'; // Replace with real name from service
  totalDeliveries = 34;
  inTransit = 5;
  completed = 29;

  recentDeliveries = [
    {
      trackingId: 'TRK-9843',
      recipient: 'Grace Wanjiru',
      status: 'Delivered',
      date: '2025-07-21'
    },
    {
      trackingId: 'TRK-9821',
      recipient: 'Brian Omondi',
      status: 'In Transit',
      date: '2025-07-21'
    },
    {
      trackingId: 'TRK-9732',
      recipient: 'Susan Njeri',
      status: 'Delivered',
      date: '2025-07-20'
    }
  ];

  get firstName(): string {
    return this.driverName.split(' ')[0];
  }

  constructor() {}

  ngOnInit(): void {
    // TODO: Replace static data with API fetch using Driver ID/token
  }
}