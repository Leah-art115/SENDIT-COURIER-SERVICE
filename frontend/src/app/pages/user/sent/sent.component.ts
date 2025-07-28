import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { UserService, UserProfile } from '../../../services/user.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { RouteService, RouteResult } from '../../../services/route.service';
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
  price: string;
  pickupLocation: { lat: number; lng: number };
  currentLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
  timeline?: {
    status: string;
    date: string;
    location: string;
    completed: boolean;
  }[];
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
  isLoadingRoute = false;

  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(
    private userService: UserService,
    private http: HttpClient,
    private notificationService: NotificationService,
    private routeService: RouteService
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
            paymentMethod: 'Unknown',
            deliveryMode: parcel.mode,
            expectedDelivery: parcel.deliveredAt
              ? new Date(parcel.deliveredAt).toISOString().split('T')[0]
              : new Date(new Date(parcel.sentAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: parcel.price != null ? `KSh ${parcel.price.toFixed(2)}` : 'N/A',
            pickupLocation: { lat: parcel.fromLat || 0, lng: parcel.fromLng || 0 },
            currentLocation: { lat: parcel.status === 'DELIVERED' ? parcel.destinationLat : (parcel.fromLat || 0), lng: parcel.status === 'DELIVERED' ? parcel.destinationLng : (parcel.fromLng || 0) },
            destinationLocation: { lat: parcel.destinationLat || 0, lng: parcel.destinationLng || 0 }
          }))),
          catchError((error: unknown) => {
            console.error('Failed to load sent parcels:', error);
            this.notificationService.error('Failed to load sent parcels.');
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
        this.notificationService.error('Error processing parcels.');
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
      this.notificationService.error('Failed to load Google Maps.');
    };

    document.head.appendChild(script);
  }

  openMap(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showMapModal = true;
    setTimeout(() => {
      if (this.mapInitialized && this.selectedParcel) {
        this.renderGoogleMapWithRoute(this.selectedParcel);
      }
    }, 300);
  }

  async renderGoogleMapWithRoute(parcel: Parcel): Promise<void> {
    try {
      this.isLoadingRoute = true;
      
      const { AdvancedMarkerElement, PinElement } = await (window as any).google.maps.importLibrary("marker");

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
          const routeResult = await this.routeService.calculateRouteWithFallback(
            parcel.pickupLocation,
            parcel.destinationLocation,
            'DRIVING'
          );
          this.drawRouteOnMap(map, routeResult, '#22c55e', 'Completed Route');
        } else {
          if (this.isValidLocation(parcel.currentLocation) && 
              (parcel.currentLocation.lat !== parcel.pickupLocation.lat || 
               parcel.currentLocation.lng !== parcel.pickupLocation.lng)) {
            
            const completedRoute = await this.routeService.calculateRouteWithFallback(
              parcel.pickupLocation,
              parcel.currentLocation,
              'DRIVING'
            );
            this.drawRouteOnMap(map, completedRoute, '#22c55e', 'Completed Route');
          }

          const remainingRoute = await this.routeService.calculateRouteWithFallback(
            parcel.currentLocation,
            parcel.destinationLocation,
            'DRIVING'
          );
          this.drawRouteOnMap(map, remainingRoute, '#ff6b6b', 'Remaining Route', true);
        }

        this.displayRouteInfo(parcel);

      } catch (routeError) {
        console.error('Route calculation failed, falling back to straight lines:', routeError);
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
    } else {
      console.log('📍 Using route steps');
      routePath = routeResult.steps.map(step => ({ lat: step.lat, lng: step.lng }));
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
    const path = parcel.status === 'DELIVERED' 
      ? [parcel.pickupLocation, parcel.destinationLocation] 
      : [parcel.pickupLocation, parcel.currentLocation, parcel.destinationLocation];

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
  }

  private displayRouteInfo(parcel: Parcel): void {
    console.log('Route information for parcel:', parcel.trackingId);
  }

  private isValidLocation(location: { lat: number; lng: number }): boolean {
    return location && 
           typeof location.lat === 'number' && 
           typeof location.lng === 'number' &&
           isFinite(location.lat) && 
           isFinite(location.lng) &&
           (location.lat !== 0 || location.lng !== 0);
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

    this.drawStraightLineRoute(map, parcel);

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(parcel.pickupLocation);
    if (parcel.status !== 'DELIVERED') {
      bounds.extend(parcel.currentLocation);
    }
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

  public formatStatus(status: string): string {
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

  public createTimeline(parcel: Parcel): any[] {
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
}