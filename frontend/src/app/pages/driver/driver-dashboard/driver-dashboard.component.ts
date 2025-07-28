import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';
import { DriverService, Parcel } from '../../../services/driver.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { Subscription } from 'rxjs';

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
  private subscriptions: Subscription = new Subscription();

  constructor(
    private driverService: DriverService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDriverProfile();
    this.loadParcels();
  }

  loadDriverProfile() {
    this.subscriptions.add(
      this.driverService.getDriverProfile().subscribe({
        next: (profile) => {
          this.driverName = profile.name || 'Driver';
        },
        error: (error) => {
          this.notificationService.error(error.message);
          this.driverName = 'Driver';
        }
      })
    );
  }

  loadParcels() {
    this.subscriptions.add(
      this.driverService.getMyParcels().subscribe({
        next: (parcels) => {
          this.totalDeliveries = parcels.length;
          this.inTransit = parcels.filter(p => p.status === 'IN_TRANSIT' || p.status === 'PICKED_UP_BY_DRIVER').length;
          this.completed = parcels.filter(p => p.status === 'DELIVERED').length;
          this.recentDeliveries = parcels.slice(0, 5).map(parcel => ({
            trackingId: parcel.trackingId,
            recipient: parcel.receiverName,
            status: parcel.status,
            date: new Date(parcel.updatedAt).toLocaleDateString()
          }));
        },
        error: (error) => {
          this.notificationService.error(error.message);
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
          this.loadParcels(); // Refresh parcels
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
          this.loadParcels();
        },
        error: (error) => {
          this.notificationService.error(error.message);
        }
      })
    );
  }

  get firstName(): string {
    return this.driverName.split(' ')[0] || 'Driver';
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}