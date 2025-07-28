import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { UserService, UserProfile } from '../../../services/user.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, map, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

declare const google: any;

interface Parcel {
  id: string;
  trackingId: string;
  sender: string;
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
  price: string;
  currentLocation: { lat: number; lng: number };
  pickupLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
}

@Component({
  selector: 'app-received',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavbarComponent],
  templateUrl: './received.component.html',
  styleUrls: ['./received.component.css']
})
export class ReceivedComponent implements OnInit, AfterViewInit {
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
    private notificationService: NotificationService
  ) {}

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

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

  ngOnInit(): void {
    this.loadParcels();
  }

  ngAfterViewInit(): void {
    this.loadGoogleMapsScript();
  }

  loadParcels(): void {
    this.userService.getUserProfile().pipe(
      switchMap((profile: UserProfile) => {
        return this.http.get<any[]>(`${this.baseUrl}/user/received-parcels`, { headers: this.getAuthHeaders() }).pipe(
          map(parcels =>
            parcels.map(parcel => ({
              id: parcel.id,
              trackingId: parcel.trackingId,
              sender: parcel.senderName,
              from: parcel.from,
              to: parcel.to,
              dateSent: new Date(parcel.sentAt).toISOString().split('T')[0],
              status: parcel.status,
              description: parcel.description || 'No description',
              type: parcel.type,
              weight: `${parcel.weight} kg`,
              paymentMethod: 'Unknown',
              deliveryMode: parcel.mode,
              expectedDelivery: parcel.deliveredAt
                ? new Date(parcel.deliveredAt).toISOString().split('T')[0]
                : new Date(new Date(parcel.sentAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              price: `KSh ${parcel.price.toFixed(2)}`,
              pickupLocation: { lat: parcel.fromLat || 0, lng: parcel.fromLng || 0 },
              currentLocation: { lat: parcel.status === 'DELIVERED' ? parcel.destinationLat || 0 : (parcel.currentLat || parcel.fromLat || 0), lng: parcel.status === 'DELIVERED' ? parcel.destinationLng || 0 : (parcel.currentLng || parcel.fromLng || 0) },
              destinationLocation: { lat: parcel.destinationLat || 0, lng: parcel.destinationLng || 0 }
            }))
          ),
          catchError(err => {
            this.notificationService.error('Failed to load received parcels.');
            return throwError(() => new Error('Failed to load received parcels'));
          })
        );
      })
    ).subscribe({
      next: mapped => (this.parcels = mapped),
      error: err => this.notificationService.error('Error processing parcels.')
    });
  }

  isValidCoord(coord: { lat: number; lng: number }): boolean {
    return coord && isFinite(coord.lat) && isFinite(coord.lng) && (coord.lat !== 0 || coord.lng !== 0);
  }

  openMap(parcel: Parcel): void {
    if (!this.isValidCoord(parcel.pickupLocation) || !this.isValidCoord(parcel.destinationLocation)) {
      this.notificationService.error('Invalid coordinates for this parcel.');
      return;
    }
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
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');
      const map = new google.maps.Map(document.getElementById('google-map'), {
        center: parcel.status === 'DELIVERED' ? parcel.destinationLocation : parcel.currentLocation,
        zoom: 7,
        mapId: 'DEMO_MAP_ID'
      });

      const bounds = new google.maps.LatLngBounds();

      const pickupPin = new PinElement({
        background: '#3b82f6',
        borderColor: '#2563eb',
        glyphColor: '#ffffff',
        glyph: '📍'
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
        position: parcel.pickupLocation,
        map,
        title: 'Pickup Location',
        content: pickupPin.element
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

      const path = parcel.status === 'DELIVERED' ? [parcel.pickupLocation, parcel.destinationLocation] : [parcel.pickupLocation, parcel.currentLocation, parcel.destinationLocation];

      new google.maps.Polyline({
        path,
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

      bounds.extend(parcel.pickupLocation);
      if (parcel.status !== 'DELIVERED') {
        bounds.extend(parcel.currentLocation);
      }
      bounds.extend(parcel.destinationLocation);
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } catch (error) {
      console.error('Map load failed:', error);
      this.notificationService.error('Failed to render map.');
      this.renderLegacyGoogleMap(parcel);
    }
  }

  renderLegacyGoogleMap(parcel: Parcel): void {
    const map = new google.maps.Map(document.getElementById('google-map'), {
      center: parcel.status === 'DELIVERED' ? parcel.destinationLocation : parcel.currentLocation,
      zoom: 7
    });

    new google.maps.Marker({
      position: parcel.pickupLocation,
      map,
      title: 'Pickup Location',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
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

    const path = parcel.status === 'DELIVERED' ? [parcel.pickupLocation, parcel.destinationLocation] : [parcel.pickupLocation, parcel.currentLocation, parcel.destinationLocation];

    new google.maps.Polyline({
      path,
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
    bounds.extend(parcel.pickupLocation);
    if (parcel.status !== 'DELIVERED') {
      bounds.extend(parcel.currentLocation);
    }
    bounds.extend(parcel.destinationLocation);
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  markAsPickedUp(parcel: Parcel): void {
    if (parcel.status !== 'DELIVERED') {
      this.notificationService.error('Parcel must be delivered before marking as picked up.');
      return;
    }
    this.http.patch(`${this.baseUrl}/user/mark-driver-picked-up/${parcel.id}`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError(err => {
        this.notificationService.error('Failed to mark as picked up.');
        return throwError(() => new Error('Failed to mark picked up'));
      }))
      .subscribe(() => {
        this.parcels = this.parcels.map(p => p.id === parcel.id ? { ...p, status: 'PICKED_UP_BY_DRIVER' } : p);
        this.notificationService.success('Marked as picked up.');
      });
  }

  markAsComplete(parcel: Parcel): void {
    if (parcel.status !== 'PICKED_UP_BY_DRIVER') {
      this.notificationService.error('Parcel must be picked up first.');
      return;
    }
    this.http.patch(`${this.baseUrl}/user/mark-collected/${parcel.id}`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError(err => {
        this.notificationService.error('Failed to mark as complete.');
        return throwError(() => new Error('Failed to mark complete'));
      }))
      .subscribe(() => {
        this.parcels = this.parcels.map(p => p.id === parcel.id ? { ...p, status: 'COLLECTED_BY_RECEIVER' } : p);
        this.notificationService.success('Marked as complete.');
      });
  }

  closeModals(): void {
    this.showMapModal = false;
    this.showInfoModal = false;
    this.selectedParcel = null;
  }

  loadGoogleMapsScript(): void {
    if (this.mapInitialized || (window as any).google?.maps) {
      this.mapInitialized = true;
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&loading=async&libraries=marker&callback=initMapCallback`;
    script.async = true;
    script.defer = true;

    (window as any).initMapCallback = () => {
      this.mapInitialized = true;
    };

    script.onerror = () => {
      this.notificationService.error('Failed to load Google Maps.');
    };

    document.head.appendChild(script);
  }

  openInfo(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showInfoModal = true;
  }
}