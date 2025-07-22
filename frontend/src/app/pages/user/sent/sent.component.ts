import { CommonModule } from '@angular/common';
import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { environment } from '../../../../environments/environment';

interface Parcel {
  trackingId: string;
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
  selector: 'app-sent',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavbarComponent],
  templateUrl: './sent.component.html',
  styleUrls: ['./sent.component.css']
})
export class SentComponent implements AfterViewInit {
  filterName = '';
  filterStatus = '';
  filterMode = '';
  filterType = '';
  filterDateFrom = '';
  filterDateTo = '';

  showMapModal = false;
  showInfoModal = false;

  selectedParcel: Parcel | null = null;

  mapInitialized = false;

  parcels: Parcel[] = [
    {
      trackingId: 'PKG-1021',
      receiver: 'Brian Mwangi',
      from: 'Nairobi',
      to: 'Kisumu',
      dateSent: '2025-07-15',
      status: 'In Transit',
      description: 'Books and documents',
      type: 'Box',
      weight: '2.5 kg',
      paymentMethod: 'M-Pesa',
      deliveryMode: 'Express',
      expectedDelivery: '2025-07-18',
      currentLocation: { lat: 0.5, lng: 36.3 }
    },
    {
      trackingId: 'PKG-1022',
      receiver: 'Alice Otieno',
      from: 'Mombasa',
      to: 'Nakuru',
      dateSent: '2025-07-12',
      status: 'Delivered',
      description: 'Clothes',
      type: 'Bag',
      weight: '1.2 kg',
      paymentMethod: 'Card',
      deliveryMode: 'Standard',
      expectedDelivery: '2025-07-15',
      currentLocation: { lat: -1.0, lng: 37.0 }
    }
  ];

  get filteredParcels(): Parcel[] {
    return this.parcels.filter(p => {
      const nameMatch = p.receiver.toLowerCase().includes(this.filterName.toLowerCase());
      const statusMatch = this.filterStatus ? p.status === this.filterStatus : true;
      const modeMatch = this.filterMode ? p.deliveryMode === this.filterMode : true;
      const typeMatch = this.filterType ? p.type === this.filterType : true;
      const dateMatch =
        (!this.filterDateFrom || new Date(p.dateSent) >= new Date(this.filterDateFrom)) &&
        (!this.filterDateTo || new Date(p.dateSent) <= new Date(this.filterDateTo));
      return nameMatch && statusMatch && modeMatch && typeMatch && dateMatch;
    });
  }

  ngAfterViewInit(): void {
    this.loadGoogleMapsScript();
  }

  loadGoogleMapsScript(): void {
    if (this.mapInitialized) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => (this.mapInitialized = true);
    document.head.appendChild(script);
  }

  openMap(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showMapModal = true;
    setTimeout(() => {
      if (this.mapInitialized && this.selectedParcel) {
        this.renderGoogleMap(this.selectedParcel);
      }
    }, 300);
  }

  renderGoogleMap(parcel: Parcel): void {
  const destinationCoords = this.getLatLng(parcel.to);

  const map = new google.maps.Map(document.getElementById('google-map'), {
    center: parcel.currentLocation,
    zoom: 7
  });

  // Current location marker (green)
  new google.maps.Marker({
    position: parcel.currentLocation,
    map,
    title: 'Current Location',
    icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
  });

  // Destination marker (red)
  new google.maps.Marker({
    position: destinationCoords,
    map,
    title: 'Destination',
    icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
  });

  // Route line with direction arrow
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
      offset: '50%' // Arrow appears at the center of the line
    }],
    map
  });

  // Fit bounds around both markers
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(parcel.currentLocation);
  bounds.extend(destinationCoords);
  map.fitBounds(bounds);
}


  openInfo(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showInfoModal = true;
  }

  closeModals(): void {
    this.showMapModal = false;
    this.showInfoModal = false;
    this.selectedParcel = null;
  }

  getLatLng(city: string): { lat: number; lng: number } {
    const map: Record<string, { lat: number; lng: number }> = {
      Nairobi: { lat: -1.2921, lng: 36.8219 },
      Kisumu: { lat: 0.0917, lng: 34.7680 },
      Mombasa: { lat: -4.0435, lng: 39.6682 },
      Nakuru: { lat: -0.3031, lng: 36.0800 }
    };
    return map[city] || { lat: 0, lng: 0 };
  }
}
