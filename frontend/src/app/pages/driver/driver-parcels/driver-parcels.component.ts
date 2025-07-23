import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/notification/notification.service';
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';

interface Parcel {
  trackingId: string;
  sender: string;
  receiver: string;
  from: string;
  to: string;
  dateSent: string;
  status: string;
  description: string;
  type: string;
  weight: string;
  paymentMethod: string;
  deliveryMode: string;
  expectedDelivery: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
}

declare const google: any;

@Component({
  selector: 'app-driver-parcels',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DriverNavbarComponent
  ],
  templateUrl: './driver-parcels.component.html',
  styleUrls: ['./driver-parcels.component.css']
})
export class DriverParcelsComponent implements AfterViewInit {
  filterName = '';
  filterStatus = '';
  filterMode = '';
  filterType = '';
  filterFromDate = '';
  filterToDate = '';

  showMapModal = false;
  showInfoModal = false;
  selectedParcel: Parcel | null = null;
  mapInitialized = false;

  parcels: Parcel[] = [
    {
      trackingId: 'PKG-1001',
      sender: 'Admin Office',
      receiver: 'Leah Achieng',
      from: 'Nairobi',
      to: 'Kisumu',
      dateSent: '2025-07-18',
      status: 'Pending',
      description: 'Stationery delivery',
      type: 'Box',
      weight: '5 kg',
      paymentMethod: 'Prepaid',
      deliveryMode: 'Standard',
      expectedDelivery: '2025-07-21',
      currentLocation: { lat: -1.2921, lng: 36.8219 }
    }
  ];

  constructor(private notification: NotificationService) {}

  ngAfterViewInit(): void {
    this.loadGoogleMapsScript();
  }

  loadGoogleMapsScript(): void {
    if (this.mapInitialized) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.mapInitialized = true;
    };
    document.head.appendChild(script);
  }

  get filteredParcels(): Parcel[] {
    return this.parcels.filter(p => {
      const nameMatch = p.sender.toLowerCase().includes(this.filterName.toLowerCase());
      const statusMatch = this.filterStatus ? p.status === this.filterStatus : true;
      const modeMatch = this.filterMode ? p.deliveryMode === this.filterMode : true;
      const typeMatch = this.filterType ? p.type === this.filterType : true;
      const dateMatch =
        (!this.filterFromDate || new Date(p.dateSent) >= new Date(this.filterFromDate)) &&
        (!this.filterToDate || new Date(p.dateSent) <= new Date(this.filterToDate));
      return nameMatch && statusMatch && modeMatch && typeMatch && dateMatch;
    });
  }

  openMap(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showMapModal = true;

    setTimeout(() => {
      if (this.mapInitialized && this.selectedParcel) {
        this.renderGoogleMap(this.selectedParcel);
      } else {
        this.notification.error('Google Maps API not loaded yet. Please try again shortly.');
      }
    }, 300);
  }

  renderGoogleMap(parcel: Parcel): void {
    const destinationCoords = this.getLatLng(parcel.to);

    const map = new google.maps.Map(document.getElementById('google-map'), {
      center: parcel.currentLocation,
      zoom: 7
    });

    new google.maps.Marker({
      position: parcel.currentLocation,
      map,
      title: 'Current Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    });

    new google.maps.Marker({
      position: destinationCoords,
      map,
      title: 'Destination',
      icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });

    const routeLine = new google.maps.Polyline({
      path: [parcel.currentLocation, destinationCoords],
      geodesic: true,
      strokeColor: '#4285F4',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      icons: [{
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 3,
          strokeColor: '#4285F4'
        },
        offset: '50%'
      }],
      map
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(parcel.currentLocation);
    bounds.extend(destinationCoords);
    map.fitBounds(bounds);
  }

  openInfo(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showInfoModal = true;
  }

  updateStatus(status: string): void {
    if (this.selectedParcel) {
      this.selectedParcel.status = status;
      this.notification.success(`Status updated to "${status}"`);
      this.closeModals();
    }
  }

  closeModals(): void {
    this.showMapModal = false;
    this.showInfoModal = false;
    this.selectedParcel = null;
  }

  getLatLng(city: string): { lat: number; lng: number } {
    const map: Record<string, { lat: number; lng: number }> = {
      Nairobi: { lat: -1.2921, lng: 36.8219 },
      Kisumu: { lat: 0.0917, lng: 34.768 },
      Eldoret: { lat: 0.5143, lng: 35.2698 },
      Mombasa: { lat: -4.0435, lng: 39.6682 }
    };
    return map[city] || { lat: 0, lng: 0 };
  }
}
