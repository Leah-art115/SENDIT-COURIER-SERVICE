import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { NotificationService } from '../../../shared/notification/notification.service';

interface DashboardMetrics {
  totalEarnings: number;
  totalUsers: number;
  parcelsInTransit: number;
  parcelsDelivered: number;
  recentParcels: {
    trackingId: string;
    senderName: string;
    receiverName: string;
    status: string;
    updatedAt: string;
  }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  metrics: DashboardMetrics | null = null;
  private subscription: Subscription | null = null;

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.subscription = this.adminService.getDashboardMetrics().subscribe({
      next: (metrics: DashboardMetrics) => {
        this.metrics = {
          totalEarnings: metrics.totalEarnings,
          totalUsers: metrics.totalUsers,
          parcelsInTransit: metrics.parcelsInTransit,
          parcelsDelivered: metrics.parcelsDelivered,
          recentParcels: metrics.recentParcels.map((parcel: {
            trackingId: string;
            senderName: string;
            receiverName: string;
            status: string;
            updatedAt: string;
          }) => ({
            trackingId: parcel.trackingId,
            senderName: parcel.senderName,
            receiverName: parcel.receiverName,
            status: parcel.status,
            updatedAt: new Date(parcel.updatedAt).toISOString()
          }))
        };
      },
      error: (error: any) => {
        console.error('Failed to load dashboard metrics:', error);
        this.notificationService.error('Failed to load dashboard metrics: ' + error.message);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}