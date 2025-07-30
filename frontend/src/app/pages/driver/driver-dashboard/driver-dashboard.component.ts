import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';
import { DriverService, Parcel, DriverDashboardMetrics } from '../../../services/driver.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DriverNavbarComponent],
  templateUrl: './driver-dashboard.component.html',
  styleUrls: ['./driver-dashboard.component.css']
})
export class DriverDashboardComponent implements OnInit, OnDestroy {
  driverName: string = '';
  totalDeliveries: number = 0;
  inTransit: number = 0;
  completed: number = 0;
  recentDeliveries: { trackingId: string, recipient: string, status: string, date: string }[] = [];
  location: string = '';
  selectedParcelId: string = '';
  loading: boolean = true;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private driverService: DriverService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDriverProfile();
    this.loadDashboardMetrics();
    this.startPolling();
  }

  loadDriverProfile() {
    this.subscriptions.add(
      this.driverService.getDriverProfile().subscribe({
        next: (profile) => {
          this.driverName = profile.name || 'Driver';
          console.log('🚛 Driver profile loaded:', profile);
        },
        error: (error) => {
          console.error('❌ Failed to load driver profile:', error);
          this.notificationService.error(error.message);
          this.driverName = 'Driver';
        }
      })
    );
  }

  // NEW: Load dashboard metrics using dedicated endpoint
  loadDashboardMetrics() {
    this.loading = true;
    this.subscriptions.add(
      this.driverService.getDriverDashboardMetrics().subscribe({
        next: (metrics: DriverDashboardMetrics) => {
          console.log('📊 Driver dashboard metrics loaded:', metrics);
          
          this.totalDeliveries = Number(metrics.totalDeliveries) || 0;
          this.inTransit = Number(metrics.inTransit) || 0;
          this.completed = Number(metrics.completed) || 0;
          this.recentDeliveries = (metrics.recentDeliveries || []).map(delivery => ({
            trackingId: delivery.trackingId || 'N/A',
            recipient: delivery.recipient || 'N/A',
            status: delivery.status || 'UNKNOWN',
            date: delivery.date ? new Date(delivery.date).toLocaleDateString() : 'N/A'
          }));
          
          this.loading = false;
          console.log('✅ Driver metrics processed:', {
            totalDeliveries: this.totalDeliveries,
            inTransit: this.inTransit,
            completed: this.completed,
            recentCount: this.recentDeliveries.length
          });
        },
        error: (error) => {
          console.error('❌ Failed to load driver dashboard metrics:', error);
          this.loading = false;
          this.notificationService.error(error.message || 'Failed to load dashboard metrics');
          
          // Set default values
          this.totalDeliveries = 0;
          this.inTransit = 0;
          this.completed = 0;
          this.recentDeliveries = [];
        }
      })
    );
  }

  // DEPRECATED: Keep for backward compatibility, but use loadDashboardMetrics instead
  loadParcels() {
    this.subscriptions.add(
      this.driverService.getMyParcels().subscribe({
        next: (parcels) => {
          console.log('📦 Parcels loaded (legacy method):', parcels);
          
          this.totalDeliveries = parcels.filter(p => p.status === 'DELIVERED').length;
          this.inTransit = parcels.filter(p => p.status === 'IN_TRANSIT' || p.status === 'PICKED_UP_BY_DRIVER').length;
          this.completed = parcels.filter(p => p.status === 'DELIVERED' || p.status === 'COLLECTED_BY_RECEIVER').length;
          this.recentDeliveries = parcels.slice(0, 5).map(parcel => ({
            trackingId: parcel.trackingId,
            recipient: parcel.receiverName,
            status: parcel.status,
            date: new Date(parcel.updatedAt).toLocaleDateString()
          }));
        },
        error: (error) => {
          console.error('❌ Failed to load parcels:', error);
          this.notificationService.error(error.message);
        }
      })
    );
  }

  // Add polling for real-time updates
  startPolling(): void {
    // Poll every 30 seconds
    this.subscriptions.add(
      timer(30000, 30000).pipe(
        switchMap(() => this.driverService.getDriverDashboardMetrics())
      ).subscribe({
        next: (metrics: DriverDashboardMetrics) => {
          console.log('🔄 Driver metrics polling update:', metrics);
          
          this.totalDeliveries = Number(metrics.totalDeliveries) || 0;
          this.inTransit = Number(metrics.inTransit) || 0;
          this.completed = Number(metrics.completed) || 0;
          this.recentDeliveries = (metrics.recentDeliveries || []).map(delivery => ({
            trackingId: delivery.trackingId || 'N/A',
            recipient: delivery.recipient || 'N/A',
            status: delivery.status || 'UNKNOWN',
            date: delivery.date ? new Date(delivery.date).toLocaleDateString() : 'N/A'
          }));
        },
        error: (error) => {
          console.error('❌ Driver metrics polling failed:', error);
          // Don't show notification for polling errors to avoid spam
        }
      })
    );
  }

  updateLocation() {
    if (!this.selectedParcelId || !this.location) {
      this.notificationService.error('Please select a parcel and enter a location');
      return;
    }
    this.subscriptions.add(
      this.driverService.updateLocation(this.selectedParcelId, this.location).subscribe({
        next: (response) => {
          this.notificationService.success(response.message || 'Location updated');
          this.loadDashboardMetrics(); // Refresh metrics
          this.location = '';
          this.selectedParcelId = '';
        },
        error: (error) => {
          this.notificationService.error(error.message);
        }
      })
    );
  }

  markPickedUp(parcelId: string) {
    this.subscriptions.add(
      this.driverService.markParcelPickedUp(parcelId).subscribe({
        next: () => {
          this.notificationService.success('Parcel marked as picked up');
          this.loadDashboardMetrics(); // Refresh metrics
        },
        error: (error) => {
          this.notificationService.error(error.message);
        }
      })
    );
  }

  // Manual refresh method
  refresh(): void {
    this.loadDashboardMetrics();
  }

  get firstName(): string {
    return this.driverName.split(' ')[0] || 'Driver';
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}