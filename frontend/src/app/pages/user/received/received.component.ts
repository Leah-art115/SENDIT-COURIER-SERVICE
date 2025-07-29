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
import { RouteService, RouteResult, RouteStep } from '../../../services/route.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

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
  timeline?: {
    status: string;
    date: string;
    location: string;
    completed: boolean;
  }[];
}

@Component({
  selector: 'app-received',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UserNavbarComponent,
    MatDialogModule,
    MatSnackBarModule
  ],
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
  isLoadingRoute = false;

  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(
    private userService: UserService,
    private http: HttpClient,
    private notificationService: NotificationService,
    private routeService: RouteService
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
              paymentMethod: 'M-Pesa',
              deliveryMode: parcel.mode,
              expectedDelivery: parcel.deliveredAt
                ? new Date(parcel.deliveredAt).toISOString().split('T')[0]
                : new Date(new Date(parcel.sentAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              price: `KSh ${parcel.price.toFixed(2)}`,
              pickupLocation: { lat: parcel.fromLat || 0, lng: parcel.fromLng || 0 },
              currentLocation: { lat: parcel.status === 'DELIVERED' ? parcel.destinationLat || 0 : (parcel.currentLat || parcel.fromLat || 0), lng: parcel.status === 'DELIVERED' ? parcel.destinationLng || 0 : (parcel.currentLng || parcel.fromLng || 0) },
              destinationLocation: { lat: parcel.destinationLat || 0, lng: parcel.destinationLng || 0 },
              timeline: []
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

  isValidLocation(location: { lat: number; lng: number }): boolean {
    const isValid = location && 
           typeof location.lat === 'number' && 
           typeof location.lng === 'number' &&
           isFinite(location.lat) && 
           isFinite(location.lng) &&
           (location.lat !== 0 || location.lng !== 0);
    if (!isValid) {
      console.warn('Invalid location detected:', location);
    }
    return isValid;
  }

  openMap(parcel: Parcel): void {
    if (!this.isValidLocation(parcel.pickupLocation) || !this.isValidLocation(parcel.destinationLocation) || !this.isValidLocation(parcel.currentLocation)) {
      this.notificationService.error('Invalid coordinates for this parcel. Cannot display route.');
      console.error('Invalid coordinates:', {
        pickup: parcel.pickupLocation,
        current: parcel.currentLocation,
        destination: parcel.destinationLocation
      });
      return;
    }
    this.selectedParcel = parcel;
    this.showMapModal = true;
    setTimeout(() => {
      if (this.mapInitialized && this.selectedParcel) {
        console.log('Attempting to render map for parcel:', this.selectedParcel.trackingId);
        this.renderGoogleMapWithRoute(this.selectedParcel);
      } else {
        console.warn('Map not initialized or no parcel selected');
        this.notificationService.error('Map not ready. Please try again.');
      }
    }, 500);
  }

  async renderGoogleMapWithRoute(parcel: Parcel): Promise<void> {
    try {
      this.isLoadingRoute = true;
      console.log('Rendering map for parcel:', parcel.trackingId, 'Status:', parcel.status);

      if (!google || !google.maps) {
        throw new Error('Google Maps API not loaded');
      }

      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

      const map = new google.maps.Map(document.getElementById('google-map'), {
        center: parcel.status === 'DELIVERED' ? parcel.destinationLocation : parcel.currentLocation,
        zoom: 7,
        mapId: 'DEMO_MAP_ID'
      });

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

      try {
        if (parcel.status === 'DELIVERED') {
          console.log('Calculating route from pickup to destination:', parcel.pickupLocation, parcel.destinationLocation);
          const routeResult = await this.routeService.calculateRouteWithFallback(
            parcel.pickupLocation,
            parcel.destinationLocation,
            'DRIVING'
          );
          console.log('Route result:', routeResult);
          this.drawRouteOnMap(map, routeResult, '#22c55e', 'Completed Route');
        } else {
          if (this.isValidLocation(parcel.currentLocation) && 
              (parcel.currentLocation.lat !== parcel.pickupLocation.lat || 
               parcel.currentLocation.lng !== parcel.pickupLocation.lng)) {
            
            console.log('Calculating completed route from pickup to current:', parcel.pickupLocation, parcel.currentLocation);
            const completedRoute = await this.routeService.calculateRouteWithFallback(
              parcel.pickupLocation,
              parcel.currentLocation,
              'DRIVING'
            );
            console.log('Completed route result:', completedRoute);
            this.drawRouteOnMap(map, completedRoute, '#22c55e', 'Completed Route');
          }

          console.log('Calculating remaining route from current to destination:', parcel.currentLocation, parcel.destinationLocation);
          const remainingRoute = await this.routeService.calculateRouteWithFallback(
            parcel.currentLocation,
            parcel.destinationLocation,
            'DRIVING'
          );
          console.log('Remaining route result:', remainingRoute);
          this.drawRouteOnMap(map, remainingRoute, '#ff6b6b', 'Remaining Route', true);
        }

        this.displayRouteInfo(parcel);

      } catch (routeError) {
        console.error('Route calculation failed:', routeError);
        this.notificationService.warning('Using approximate route - detailed routing unavailable');
        this.drawStraightLineRoute(map, parcel);
      }

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(parcel.pickupLocation);
      if (parcel.status !== 'DELIVERED') {
        bounds.extend(parcel.currentLocation);
      }
      bounds.extend(parcel.destinationLocation);
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });

    } catch (error) {
      console.error('Error rendering Google Map:', error);
      this.notificationService.error('Failed to render Google Map.');
      this.renderLegacyGoogleMap(parcel);
    } finally {
      this.isLoadingRoute = false;
    }
  }

  private drawRouteOnMap(
    map: any, 
    routeResult: RouteResult, 
    color: string, 
    title: string, 
    isDashed: boolean = false
  ): void {
    let routePath: { lat: number; lng: number }[];

    if (routeResult.polyline) {
      console.log('🗺️ Using encoded polyline for accurate route');
      routePath = this.routeService.decodePolyline(routeResult.polyline);
      console.log('Decoded polyline points:', routePath.length);
    } else {
      console.warn('📍 No polyline, using route steps');
      routePath = routeResult.steps.map((step: RouteStep) => ({ lat: step.lat, lng: step.lng }));
    }

    if (routePath.length < 2) {
      console.error('Route path too short:', routePath);
      this.notificationService.error('Invalid route data. Showing straight line.');
      return;
    }

    console.log(`🛣️ Drawing route with ${routePath.length} points`);

    const polylineOptions: any = {
      path: routePath,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: isDashed ? 0.7 : 0.9,
      strokeWeight: 4,
      icons: [{
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 3,
          strokeColor: color,
          fillColor: color,
          fillOpacity: 1
        },
        offset: '50%'
      }],
      map,
      title: title
    };

    if (isDashed) {
      polylineOptions.strokeOpacity = 0.6;
      polylineOptions.icons.push({
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 2
        },
        offset: '0',
        repeat: '20px'
      });
    }

    new google.maps.Polyline(polylineOptions);
  }

  private drawStraightLineRoute(map: any, parcel: Parcel): void {
    console.warn('Drawing straight line as fallback for parcel:', parcel.trackingId);
    const path = parcel.status === 'DELIVERED' 
      ? [parcel.pickupLocation, parcel.destinationLocation] 
      : [parcel.pickupLocation, parcel.currentLocation, parcel.destinationLocation];

    new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#ff0000',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      icons: [{
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 3,
          strokeColor: '#ff0000',
          fillColor: '#ff0000',
          fillOpacity: 1
        },
        offset: '50%'
      }],
      map
    });
  }

  private displayRouteInfo(parcel: Parcel): void {
    console.log('Route information for parcel:', parcel.trackingId);
  }

  renderLegacyGoogleMap(parcel: Parcel): void {
    console.warn('Rendering legacy map for parcel:', parcel.trackingId);
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

    this.drawStraightLineRoute(map, parcel);

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(parcel.pickupLocation);
    if (parcel.status !== 'DELIVERED') {
      bounds.extend(parcel.currentLocation);
    }
    bounds.extend(parcel.destinationLocation);
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered': return '#22c55e';
      case 'in_transit': return '#f59e0b';
      case 'picked_up_by_driver': return '#3b82f6';
      case 'pending': return '#6c757d';
      case 'assigned': return '#8b5cf6';
      case 'cancelled': return '#ef4444';
      case 'collected_by_receiver': return '#22c55e';
      default: return '#64748b';
    }
  }

  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'Package Received',
      'ASSIGNED': 'Assigned to Driver',
      'PICKED_UP_BY_DRIVER': 'Picked Up',
      'IN_TRANSIT': 'In Transit',
      'DELIVERED': 'Delivered',
      'COLLECTED_BY_RECEIVER': 'Collected by Receiver',
      'CANCELLED': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  createTimeline(parcel: Parcel): any[] {
    const timeline: any[] = [];
    
    const statusOrder = ['PENDING', 'ASSIGNED', 'PICKED_UP_BY_DRIVER', 'IN_TRANSIT', 'DELIVERED', 'COLLECTED_BY_RECEIVER'];
    const currentStatusIndex = statusOrder.indexOf(parcel.status);
    
    statusOrder.forEach((status, index) => {
      if (index <= currentStatusIndex) {
        timeline.push({
          status: this.formatStatus(status),
          date: new Date(parcel.dateSent).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          location: this.getStatusLocation(status, parcel),
          completed: true
        });
      }
    });
    
    return timeline;
  }

  private getStatusLocation(status: string, parcel: Parcel): string {
    if (status === 'DELIVERED' || status === 'COLLECTED_BY_RECEIVER') {
      return parcel.to;
    }
    return parcel.from;
  }

  markAsComplete(parcel: Parcel): void {
    if (parcel.status !== 'DELIVERED') {
      this.notificationService.error('Parcel must be delivered first.');
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
    if (this.mapInitialized || (window as Window & typeof globalThis & { google?: typeof google }).google?.maps) {
      this.mapInitialized = true;
      console.log('Google Maps already loaded');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&loading=async&libraries=marker,directions&callback=initGoogleMapsReceived`;
    script.async = true;
    script.defer = true;

    (window as Window & typeof globalThis & { initGoogleMapsReceived: () => void }).initGoogleMapsReceived = () => {
      this.mapInitialized = true;
      console.log('Google Maps loaded successfully for received component');
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      this.notificationService.error('Failed to load Google Maps.');
      this.mapInitialized = false;
    };

    document.head.appendChild(script);
  }

  openInfo(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showInfoModal = true;
  }
}