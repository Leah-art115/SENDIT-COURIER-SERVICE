import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
  loading = true;

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadMetrics();
    this.startPolling();
  }

  loadMetrics(): void {
    this.loading = true;
    this.adminService.getDashboardMetrics().subscribe({
      next: (metrics: DashboardMetrics) => {
        console.log('📊 Dashboard metrics received:', metrics);
        
        this.metrics = {
          totalEarnings: Number(metrics.totalEarnings) || 0,
          totalUsers: Number(metrics.totalUsers) || 0,
          parcelsInTransit: Number(metrics.parcelsInTransit) || 0,
          parcelsDelivered: Number(metrics.parcelsDelivered) || 0,
          recentParcels: (metrics.recentParcels || []).map(parcel => ({
            trackingId: parcel.trackingId || 'N/A',
            senderName: parcel.senderName || 'N/A',
            receiverName: parcel.receiverName || 'N/A',
            status: parcel.status || 'UNKNOWN',
            updatedAt: parcel.updatedAt || new Date().toISOString()
          }))
        };
        
        this.loading = false;
        console.log('✅ Metrics processed:', this.metrics);
      },
      error: (error: any) => {
        console.error('❌ Failed to load dashboard metrics:', error);
        this.loading = false;
        this.notificationService.error('Failed to load dashboard metrics: ' + error.message);
        
        // Set default values to prevent template errors
        this.metrics = {
          totalEarnings: 0,
          totalUsers: 0,
          parcelsInTransit: 0,
          parcelsDelivered: 0,
          recentParcels: []
        };
      }
    });
  }

  startPolling(): void {
    // Poll every 30 seconds (instead of 5 seconds to reduce server load)
    this.subscription = timer(30000, 30000).pipe(
      switchMap(() => this.adminService.getDashboardMetrics())
    ).subscribe({
      next: (metrics: DashboardMetrics) => {
        console.log('🔄 Polling update - Dashboard metrics:', metrics);
        
        this.metrics = {
          totalEarnings: Number(metrics.totalEarnings) || 0,
          totalUsers: Number(metrics.totalUsers) || 0,
          parcelsInTransit: Number(metrics.parcelsInTransit) || 0,
          parcelsDelivered: Number(metrics.parcelsDelivered) || 0,
          recentParcels: (metrics.recentParcels || []).map(parcel => ({
            trackingId: parcel.trackingId || 'N/A',
            senderName: parcel.senderName || 'N/A',
            receiverName: parcel.receiverName || 'N/A',
            status: parcel.status || 'UNKNOWN',
            updatedAt: parcel.updatedAt || new Date().toISOString()
          }))
        };
      },
      error: (error: any) => {
        console.error('❌ Polling failed:', error);
        // Don't show notification for polling errors to avoid spam
      }
    });
  }

  // Method to manually refresh
  refresh(): void {
    this.loadMetrics();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}