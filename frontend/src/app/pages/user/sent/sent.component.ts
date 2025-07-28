import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { UserService, UserProfile } from '../../../services/user.service';
import { NotificationService } from '../../../shared/notification/notification.service'; // Added
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, map, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Declare google as a global variable for TypeScript
declare const google: any;

interface Parcel {
  trackingId: string;
  receiver: string;
  from: string;
  to: string;
  dateSent: string;
  status: string;
  description: string | null;
  type: string;
  weight: string;
  paymentMethod: string;
  deliveryMode: string;
  expectedDelivery: string;
  price: string; // Added
  currentLocation: {
    lat: number;
    lng: number;
  };
  destinationLocation: {
    lat: number;
    lng: number;
  };
}

@Component({
  selector: 'app-sent',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavbarComponent],
  templateUrl: './sent.component.html',
  styleUrls: ['./sent.component.css']
})
export class SentComponent implements OnInit, AfterViewInit {
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
  parcels: Parcel[] = [];

  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(
    private userService: UserService,
    private http: HttpClient,
    private notificationService: NotificationService // Added
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

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

  ngOnInit(): void {
    this.loadParcels();
  }

  ngAfterViewInit(): void {
    this.loadGoogleMapsScript();
  }

  private loadParcels(): void {
    this.userService.getUserProfile().pipe(
      switchMap((profile: UserProfile) => {
        return this.http.get<any[]>(`${this.baseUrl}/user/sent-parcels`, { headers: this.getAuthHeaders() }).pipe(
          map((parcels: any[]) => parcels.map((parcel: any) => ({
            trackingId: parcel.trackingId,
            receiver: parcel.receiverName,
            from: parcel.from,
            to: parcel.to,
            dateSent: new Date(parcel.sentAt).toISOString().split('T')[0],
            status: parcel.status,
            description: parcel.description || 'No description',
            type: parcel.type,
            weight: `${parcel.weight} kg`,
            paymentMethod: 'Unknown', // Not in backend schema, default value
            deliveryMode: parcel.mode,
            expectedDelivery: parcel.deliveredAt
              ? new Date(parcel.deliveredAt).toISOString().split('T')[0]
              : new Date(new Date(parcel.sentAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: parcel.price != null ? `KSh ${parcel.price.toFixed(2)}` : 'N/A', // Added
            currentLocation: { lat: parcel.fromLat || 0, lng: parcel.fromLng || 0 },
            destinationLocation: { lat: parcel.destinationLat || 0, lng: parcel.destinationLng || 0 }
          }))),
          catchError((error: unknown) => {
            console.error('Failed to load sent parcels:', error);
            this.notificationService.error('Failed to load sent parcels.'); // Updated
            return throwError(() => new Error('Failed to load sent parcels'));
          })
        );
      })
    ).subscribe({
      next: (mappedParcels: Parcel[]) => {
        this.parcels = mappedParcels;
      },
      error: (error: unknown) => {
        console.error('Error processing parcels:', error);
        this.notificationService.error('Error processing parcels.'); // Updated
      }
    });
  }

  loadGoogleMapsScript(): void {
    if (this.mapInitialized || (window as Window & typeof globalThis & { google?: typeof google }).google?.maps) {
      this.mapInitialized = true;
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&loading=async&libraries=marker&callback=initGoogleMapsSent`;
    script.async = true;
    script.defer = true;

    (window as Window & typeof globalThis & { initGoogleMapsSent: () => void }).initGoogleMapsSent = () => {
      this.mapInitialized = true;
      console.log('Google Maps loaded successfully for sent component');
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      this.notificationService.error('Failed to load Google Maps.'); // Updated
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
      const { AdvancedMarkerElement, PinElement } = await (window as any).google.maps.importLibrary("marker");

      const map = new google.maps.Map(document.getElementById('google-map'), {
        center: parcel.currentLocation,
        zoom: 7,
        mapId: 'DEMO_MAP_ID'
      });

      const currentLocationPin = new PinElement({
        background: '#22c55e',
        borderColor: '#16a34a',
        glyphColor: '#ffffff',
        glyph: '📍'
      });

      const destinationPin = new PinElement({
        background: '#ef4444',
        borderColor: '#dc2626',
        glyphColor: '#ffffff',
        glyph: '🎯'
      });

      new AdvancedMarkerElement({
        position: parcel.currentLocation,
        map,
        title: 'Current Location',
        content: currentLocationPin.element
      });

      new AdvancedMarkerElement({
        position: parcel.destinationLocation,
        map,
        title: 'Destination',
        content: destinationPin.element
      });

      const routeLine = new google.maps.Polyline({
        path: [parcel.currentLocation, parcel.destinationLocation],
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

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(parcel.currentLocation);
      bounds.extend(parcel.destinationLocation);
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });

    } catch (error) {
      console.error('Error rendering Google Map:', error);
      this.notificationService.error('Failed to render Google Map.'); // Updated
      this.renderLegacyGoogleMap(parcel);
    }
  }

  renderLegacyGoogleMap(parcel: Parcel): void {
    const map = new google.maps.Map(document.getElementById('google-map'), {
      center: parcel.currentLocation,
      zoom: 7
    });

    new google.maps.Marker({
      position: parcel.currentLocation,
      map,
      title: 'Current Location',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    new google.maps.Marker({
      position: parcel.destinationLocation,
      map,
      title: 'Destination',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    const routeLine = new google.maps.Polyline({
      path: [parcel.currentLocation, parcel.destinationLocation],
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

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(parcel.currentLocation);
    bounds.extend(parcel.destinationLocation);
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
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
}