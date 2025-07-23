import { CommonModule } from '@angular/common';
import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { environment } from '../../../../environments/environment';

// Declare google as a global variable for TypeScript
declare const google: any;

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

/// <reference types="google.maps" />

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
    if (this.mapInitialized || (window as Window & typeof globalThis & { google?: typeof google }).google?.maps) {
      this.mapInitialized = true;
      return;
    }

    const script = document.createElement('script');
    // Use the modern loading approach with callback and libraries
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&loading=async&libraries=marker&callback=initGoogleMapsSent`;
    script.async = true;
    script.defer = true;
    
    // Create a global callback function with unique name for sent component
    (window as Window & typeof globalThis & { initGoogleMapsSent: () => void }).initGoogleMapsSent = () => {
      this.mapInitialized = true;
      console.log('Google Maps loaded successfully for sent component');
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };

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

  async renderGoogleMap(parcel: Parcel): Promise<void> {
    try {
      const destinationCoords = this.getLatLng(parcel.to);

      // Import the AdvancedMarkerElement library
      const { AdvancedMarkerElement, PinElement } = await (window as any).google.maps.importLibrary("marker");

      const map = new google.maps.Map(document.getElementById('google-map'), {
        center: parcel.currentLocation,
        zoom: 7,
        mapId: 'DEMO_MAP_ID' // Required for AdvancedMarkerElement
      });

      // Create custom pins for better visibility
      const currentLocationPin = new PinElement({
        background: '#22c55e', // Green color
        borderColor: '#16a34a',
        glyphColor: '#ffffff',
        glyph: '📍'
      });

      const destinationPin = new PinElement({
        background: '#ef4444', // Red color
        borderColor: '#dc2626',
        glyphColor: '#ffffff',
        glyph: '🎯'
      });

      // Current location marker using AdvancedMarkerElement
      new AdvancedMarkerElement({
        position: parcel.currentLocation,
        map,
        title: 'Current Location',
        content: currentLocationPin.element
      });

      // Destination marker using AdvancedMarkerElement
      new AdvancedMarkerElement({
        position: destinationCoords,
        map,
        title: 'Destination',
        content: destinationPin.element
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
            strokeColor: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 1
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

      // Add some padding to the bounds
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);

    } catch (error) {
      console.error('Error rendering Google Map:', error);
      // Fallback to legacy markers if AdvancedMarkerElement fails
      this.renderLegacyGoogleMap(parcel);
    }
  }

  // Fallback method using legacy markers (for compatibility)
  renderLegacyGoogleMap(parcel: Parcel): void {
    const destinationCoords = this.getLatLng(parcel.to);

    const map = new google.maps.Map(document.getElementById('google-map'), {
      center: parcel.currentLocation,
      zoom: 7
    });

    // Current location marker (green) - legacy
    new google.maps.Marker({
      position: parcel.currentLocation,
      map,
      title: 'Current Location',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    // Destination marker (red) - legacy
    new google.maps.Marker({
      position: destinationCoords,
      map,
      title: 'Destination',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
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
          strokeColor: '#4285F4',
          fillColor: '#4285F4',
          fillOpacity: 1
        },
        offset: '50%'
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