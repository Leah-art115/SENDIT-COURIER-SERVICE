import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { environment } from '../../../../environments/environment';

interface Parcel {
  trackingId: string;
  sender: string;
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
  selector: 'app-received',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavbarComponent],
  templateUrl: './received.component.html',
  styleUrls: ['./received.component.css']
})
export class ReceivedComponent implements AfterViewInit {
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
      trackingId: 'PKG-2011',
      sender: 'Daniel Mutiso',
      from: 'Eldoret',
      to: 'Nairobi',
      dateSent: '2025-07-14',
      status: 'In Transit',
      description: 'Electronics',
      type: 'Box',
      weight: '3.5 kg',
      paymentMethod: 'M-Pesa',
      deliveryMode: 'Express',
      expectedDelivery: '2025-07-18',
      currentLocation: { lat: 0.3, lng: 36.2 }
    },
    {
      trackingId: 'PKG-2012',
      sender: 'Faith Wanjiku',
      from: 'Kisumu',
      to: 'Nairobi',
      dateSent: '2025-07-10',
      status: 'Delivered',
      description: 'Gift package',
      type: 'Envelope',
      weight: '0.5 kg',
      paymentMethod: 'Cash',
      deliveryMode: 'Standard',
      expectedDelivery: '2025-07-13',
      currentLocation: { lat: -1.2921, lng: 36.8219 }
    }
  ];

  get filteredParcels(): Parcel[] {
    return this.parcels.filter(p => {
      const nameMatch = p.sender.toLowerCase().includes(this.filterName.toLowerCase());
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
      Eldoret: { lat: 0.5143, lng: 35.2698 },
      Mombasa: { lat: -4.0435, lng: 39.6682 }
    };
    return map[city] || { lat: 0, lng: 0 };
  }
}
