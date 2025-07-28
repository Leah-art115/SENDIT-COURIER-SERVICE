import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/notification/notification.service';
import { ParcelService } from '../../services/parcel.service'; // Use your existing ParcelService
import { RouteService, RouteResult } from '../../services/route.service'; // Import the route service
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// Declare google as a global variable for TypeScript
declare const google: any;



interface TrackingResult {
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
  pickupLocation: { lat: number; lng: number };
  currentLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
  timeline: {
    status: string;
    date: string;
    location: string;
    completed: boolean;
  }[];
}

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomepageComponent implements OnInit, AfterViewInit {
  trackingId: string = '';
  showTrackingModal = false;
  trackingResult: TrackingResult | null = null;
  mapInitialized = false;
  isLoading = false;
  isLoadingRoute = false; // Add loading state for route calculation

  constructor(
    private notify: NotificationService,
    private router: Router,
    private parcelService: ParcelService, // Use your existing ParcelService
    private routeService: RouteService // Inject route service
  ) {}

  ngOnInit(): void {
    this.initializeAnimations();
  }

  ngAfterViewInit(): void {
    this.loadGoogleMapsScript();
  }

  loadGoogleMapsScript(): void {
    if (this.mapInitialized || (window as any).google?.maps) {
      this.mapInitialized = true;
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&loading=async&libraries=marker&callback=initGoogleMapsHome`;
    script.async = true;
    script.defer = true;
    
    (window as any).initGoogleMapsHome = () => {
      this.mapInitialized = true;
      console.log('Google Maps loaded successfully for home component');
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      this.notify.error('Failed to load Google Maps.');
    };

    document.head.appendChild(script);
  }

  trackPackage(): void {
    if (!this.trackingId.trim()) {
      this.notify.warning('Please enter a tracking ID.');
      return;
    }

    this.isLoading = true;
    
    console.log('Tracking ID:', this.trackingId.trim());

    // Use your existing ParcelService
    this.parcelService.getParcelByTrackingId(this.trackingId.trim())
      .pipe(
        map(parcel => {
          console.log('Received parcel data:', parcel);
          
          const result: TrackingResult = {
            trackingId: parcel.trackingId,
            receiver: parcel.receiverName,
            from: parcel.from,
            to: parcel.to,
            dateSent: new Date(parcel.updatedAt).toISOString().split('T')[0],
            status: this.formatStatus(parcel.status),
            description: parcel.description || 'No description available',
            type: this.formatType(parcel.type),
            weight: `${parcel.weight || 0} kg`,
            paymentMethod: 'Not specified', // Add if available in your parcel model
            deliveryMode: parcel.mode || 'STANDARD',
            expectedDelivery: parcel.deliveredAt
              ? new Date(parcel.deliveredAt).toISOString().split('T')[0]
              : this.calculateExpectedDelivery(parcel.updatedAt, parcel.mode),
            pickupLocation: this.getPickupLocation(parcel),
            currentLocation: this.getCurrentLocation(parcel),
            destinationLocation: this.getDestinationLocation(parcel),
            timeline: this.createTimeline(parcel)
          };
          
          console.log('Final tracking result:', result);
          return result;
        }),
        catchError((err: any) => {
          this.isLoading = false;
          console.error('Tracking error:', err);
          
          let errorMessage = `Package with tracking ID "${this.trackingId}" not found. Please verify the tracking number.`;
          
          if (err.message?.includes('not found') || err.message?.includes('404')) {
            errorMessage = `Package with tracking ID "${this.trackingId}" not found. Please verify the tracking number.`;
          } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
            errorMessage = 'Authentication required. Please log in to track packages.';
          } else if (err.message?.includes('network') || err.message?.includes('connection')) {
            errorMessage = 'Unable to connect to server. Please check your internet connection.';
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          this.notify.error(errorMessage);
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (result) => {
          this.isLoading = false;
          this.trackingResult = result;
          this.showTrackingModal = true;
          
          // Initialize map after modal is shown
          setTimeout(() => {
            if (this.mapInitialized && this.trackingResult) {
              this.renderGoogleMapWithRoute(this.trackingResult);
            } else {
              console.warn('Map not initialized yet, retrying...');
              setTimeout(() => {
                if (this.mapInitialized && this.trackingResult) {
                  this.renderGoogleMapWithRoute(this.trackingResult);
                }
              }, 1000);
            }
          }, 300);

          this.notify.success(`Package found: ${result.trackingId}`);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Final tracking error:', err);
        }
      });
  }

  private getPickupLocation(parcel: any): { lat: number; lng: number } {
    // Try to get coordinates from parcel data, fallback to city lookup
    if (parcel.fromLat && parcel.fromLng) {
      return { lat: parcel.fromLat, lng: parcel.fromLng };
    }
    return this.getLatLng(parcel.from);
  }

  private getCurrentLocation(parcel: any): { lat: number; lng: number } {
    // If delivered, current location is destination
    if (parcel.status === 'DELIVERED' || parcel.status === 'COLLECTED_BY_RECEIVER') {
      return this.getDestinationLocation(parcel);
    }
    
    // If driver has current location, use that
    if (parcel.driver?.currentLat && parcel.driver?.currentLng) {
      return {
        lat: parcel.driver.currentLat,
        lng: parcel.driver.currentLng
      };
    }
    
    // Otherwise, use pickup location as default
    return this.getPickupLocation(parcel);
  }

  private getDestinationLocation(parcel: any): { lat: number; lng: number } {
    // Try to get coordinates from parcel data, fallback to city lookup
    if (parcel.destinationLat && parcel.destinationLng) {
      return { lat: parcel.destinationLat, lng: parcel.destinationLng };
    }
    return this.getLatLng(parcel.to);
  }

  private formatStatus(status: string): string {
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

  private formatType(type: string): string {
    const typeMap: Record<string, string> = {
      'BOXED_PACKAGE': 'Boxed Package',
      'ENVELOPE': 'Envelope',
      'BAG': 'Bag',
      'SUITCASE': 'Suitcase'
    };
    return typeMap[type] || type;
  }

  private calculateExpectedDelivery(sentDate: string, mode: string): string {
    const sent = new Date(sentDate);
    const daysToAdd = mode === 'EXPRESS' ? 1 : 3;
    const expected = new Date(sent.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return expected.toISOString().split('T')[0];
  }

  activeFaqIndex: number | null = null;

toggleFaq(index: number): void {
  this.activeFaqIndex = this.activeFaqIndex === index ? null : index;
}


  private createTimeline(parcel: any): any[] {
    const timeline: any[] = [];
    
    // Create basic timeline based on current status
    const statusOrder = ['PENDING', 'ASSIGNED', 'PICKED_UP_BY_DRIVER', 'IN_TRANSIT', 'DELIVERED', 'COLLECTED_BY_RECEIVER'];
    const currentStatusIndex = statusOrder.indexOf(parcel.status);
    
    statusOrder.forEach((status, index) => {
      if (index <= currentStatusIndex) {
        let date = parcel.updatedAt;
        
        // Use specific dates if available
        if (status === 'PICKED_UP_BY_DRIVER' && parcel.pickedAt) {
          date = parcel.pickedAt;
        } else if (status === 'DELIVERED' && parcel.deliveredAt) {
          date = parcel.deliveredAt;
        }
        
        timeline.push({
          status: this.formatStatus(status),
          date: new Date(date).toLocaleString('en-US', {
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

  private getStatusLocation(status: string, parcel: any): string {
    if (status === 'DELIVERED' || status === 'COLLECTED_BY_RECEIVER') {
      return parcel.to;
    }
    return parcel.from;
  }

  // Helper method for city coordinates
  getLatLng(city: string): { lat: number; lng: number } {
    const map: Record<string, { lat: number; lng: number }> = {
      'Nairobi': { lat: -1.2921, lng: 36.8219 },
      'Kisumu': { lat: 0.0917, lng: 34.768 },
      'Eldoret': { lat: 0.5143, lng: 35.2698 },
      'Mombasa': { lat: -4.0435, lng: 39.6682 },
      'Nakuru': { lat: -0.3031, lng: 36.0800 },
      'Thika': { lat: -1.0332, lng: 37.0692 },
      'Chuka': { lat: -0.3334, lng: 37.6501 }
    };
    return map[city] || { lat: -1.2921, lng: 36.8219 }; // Default to Nairobi
  }

  // 🚀 NEW: Enhanced map rendering with actual road routes
  async renderGoogleMapWithRoute(trackingData: TrackingResult): Promise<void> {
    try {
      this.isLoadingRoute = true;
      
      // Check if the map container exists
      const mapContainer = document.getElementById('tracking-map');
      if (!mapContainer) {
        console.error('Map container not found');
        return;
      }

      // Try to use the new Advanced Markers API
      const { AdvancedMarkerElement, PinElement } = await (window as any).google.maps.importLibrary("marker");

      const map = new google.maps.Map(mapContainer, {
        center: trackingData.status === 'Delivered' ? trackingData.destinationLocation : trackingData.currentLocation,
        zoom: 7,
        mapId: 'TRACKING_MAP_ID'
      });

      // Create custom pins
      const originPin = new PinElement({
        background: '#3b82f6',
        borderColor: '#2563eb',
        glyphColor: '#ffffff',
        glyph: '📦'
      });

      const currentLocationPin = new PinElement({
        background: '#22c55e',
        borderColor: '#16a34a',
        glyphColor: '#ffffff',
        glyph: '🚛'
      });

      const destinationPin = new PinElement({
        background: '#ef4444',
        borderColor: '#dc2626',
        glyphColor: '#ffffff',
        glyph: '🎯'
      });

      // Add markers
      new AdvancedMarkerElement({
        position: trackingData.pickupLocation,
        map,
        title: `Origin: ${trackingData.from}`,
        content: originPin.element
      });

      // Only show current location marker if not delivered
      if (trackingData.status !== 'Delivered') {
        new AdvancedMarkerElement({
          position: trackingData.currentLocation,
          map,
          title: 'Current Location',
          content: currentLocationPin.element
        });
      }

      new AdvancedMarkerElement({
        position: trackingData.destinationLocation,
        map,
        title: `Destination: ${trackingData.to}`,
        content: destinationPin.element
      });

      // 🚀 NEW: Calculate and display actual road routes
      try {
        if (trackingData.status === 'Delivered') {
          // Show completed route from pickup to destination
          console.log('📍 Using route steps for delivered parcel');
          const routeResult = await this.routeService.calculateRouteWithFallback(
            trackingData.pickupLocation,
            trackingData.destinationLocation,
            'DRIVING'
          );
          this.drawRouteOnMap(map, routeResult, '#22c55e', 'Completed Route');
        } else {
          // Show route from pickup to current location (completed part)
          if (this.isValidLocation(trackingData.currentLocation) && 
              (trackingData.currentLocation.lat !== trackingData.pickupLocation.lat || 
               trackingData.currentLocation.lng !== trackingData.pickupLocation.lng)) {
            
            console.log('🛣️ Drawing completed route to current location');
            const completedRoute = await this.routeService.calculateRouteWithFallback(
              trackingData.pickupLocation,
              trackingData.currentLocation,
              'DRIVING'
            );
            this.drawRouteOnMap(map, completedRoute, '#22c55e', 'Completed Route');
          }

          // Show remaining route from current location to destination (dashed line)
          console.log('🛣️ Drawing remaining route to destination');
          const remainingRoute = await this.routeService.calculateRouteWithFallback(
            trackingData.currentLocation,
            trackingData.destinationLocation,
            'DRIVING'
          );
          this.drawRouteOnMap(map, remainingRoute, '#ff6b6b', 'Remaining Route', true);
        }

        // Display route information
        this.displayRouteInfo(trackingData);

      } catch (routeError) {
        console.error('Route calculation failed, falling back to straight lines:', routeError);
        this.notify.warning('Using approximate route - detailed routing unavailable');
        
        // Fallback to straight lines
        this.drawStraightLineRoute(map, trackingData);
      }

      // Fit map to show all markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(trackingData.pickupLocation);
      if (trackingData.status !== 'Delivered') {
        bounds.extend(trackingData.currentLocation);
      }
      bounds.extend(trackingData.destinationLocation);
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });

    } catch (error) {
      console.error('Error with Advanced Markers, falling back to legacy markers:', error);
      this.renderLegacyGoogleMap(trackingData);
    } finally {
      this.isLoadingRoute = false;
    }
  }

  // 🚀 NEW: Draw route on map using route data
  private drawRouteOnMap(
    map: any, 
    routeResult: RouteResult, 
    color: string, 
    title: string, 
    isDashed: boolean = false
  ): void {
    let routePath: { lat: number; lng: number }[];

    // Use encoded polyline if available (more accurate), otherwise use steps
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

    // Add dashed line effect for remaining route
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

  // 🚀 NEW: Fallback to straight line route
  private drawStraightLineRoute(map: any, trackingData: TrackingResult): void {
    const path = trackingData.status === 'Delivered' 
      ? [trackingData.pickupLocation, trackingData.destinationLocation] 
      : [trackingData.pickupLocation, trackingData.currentLocation, trackingData.destinationLocation];

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

  // 🚀 NEW: Display route information
  private displayRouteInfo(trackingData: TrackingResult): void {
    // You can add route information to the UI here
    // For example, add distance and duration to the modal
    console.log('Route information for tracking:', trackingData.trackingId);
  }

  // 🚀 NEW: Validate location coordinates
  private isValidLocation(location: { lat: number; lng: number }): boolean {
    return location && 
           typeof location.lat === 'number' && 
           typeof location.lng === 'number' &&
           isFinite(location.lat) && 
           isFinite(location.lng) &&
           (location.lat !== 0 || location.lng !== 0);
  }

  renderLegacyGoogleMap(trackingData: TrackingResult): void {
    const mapContainer = document.getElementById('tracking-map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    const map = new google.maps.Map(mapContainer, {
      center: trackingData.status === 'Delivered' ? trackingData.destinationLocation : trackingData.currentLocation,
      zoom: 7
    });

    // Origin marker
    new google.maps.Marker({
      position: trackingData.pickupLocation,
      map,
      title: `Origin: ${trackingData.from}`,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    // Current location marker (only if not delivered)
    if (trackingData.status !== 'Delivered') {
      new google.maps.Marker({
        position: trackingData.currentLocation,
        map,
        title: 'Current Location',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        }
      });
    }

    // Destination marker
    new google.maps.Marker({
      position: trackingData.destinationLocation,
      map,
      title: `Destination: ${trackingData.to}`,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    // Use straight line as fallback
    this.drawStraightLineRoute(map, trackingData);

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(trackingData.pickupLocation);
    if (trackingData.status !== 'Delivered') {
      bounds.extend(trackingData.currentLocation);
    }
    bounds.extend(trackingData.destinationLocation);
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  closeTrackingModal(): void {
    this.showTrackingModal = false;
    this.trackingResult = null;
    this.trackingId = '';
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered': return '#22c55e';
      case 'in transit': return '#f59e0b';
      case 'picked up': return '#3b82f6';
      case 'package received': return '#6c757d';
      case 'assigned to driver': return '#8b5cf6';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  }

  showLoginForm(): void {
    this.router.navigate(['/auth/login']);
  }

  showRegisterForm(): void {
    this.router.navigate(['/auth/register']);
  }

  startShipping(): void {
    this.notify.success('Redirecting to shipping form or dashboard...');
  }

  private initializeAnimations(): void {
    window.addEventListener('scroll', this.animateOnScroll.bind(this));
    setTimeout(() => this.animateOnScroll(), 100);
  }

  private animateOnScroll(): void {
    const elements = document.querySelectorAll<HTMLElement>('.service-item, .step, .feature-card');
    elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (elementTop < windowHeight - 100) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }
    });
  }

  currentYear = new Date().getFullYear();

  currentPage = 1;
itemsPerPage = 6;

parcelPrices = [
  // 💌 ENVELOPES
  { type: 'Envelope', weight: '0.3 kg', mode: 'Skates', distance: '2 km', standard: 310, express: 465 },
  { type: 'Envelope', weight: 'Up to 0.5 kg', mode: 'Skates', distance: '3 km', standard: 330, express: 495 },
  { type: 'Envelope', weight: 'Up to 1 kg', mode: 'Bicycle', distance: '4 km', standard: 370, express: 555 },
  { type: 'Envelope', weight: '1.5 kg', mode: 'Motorbike', distance: '5 km', standard: 420, express: 630 },
  { type: 'Envelope', weight: '2–3 kg', mode: 'Motorbike', distance: '6 km', standard: 480, express: 720 },
  { type: 'Envelope', weight: '3–5 kg', mode: 'Motorbike', distance: '7 km', standard: 540, express: 810 },

  // 📦 BOXED PACKAGES
  { type: 'Boxed Package', weight: '3–10 kg', mode: 'Motorbike', distance: '5 km', standard: 550, express: 825 },
  { type: 'Boxed Package', weight: '5–12 kg', mode: 'Motorbike', distance: '6 km', standard: 610, express: 915 },
  { type: 'Boxed Package', weight: '10 kg', mode: 'Motorbike', distance: '7 km', standard: 670, express: 1005 },
  { type: 'Boxed Package', weight: '12–20 kg', mode: 'Car', distance: '9 km', standard: 850, express: 1275 },
  { type: 'Boxed Package', weight: '20–25 kg', mode: 'Car / Van', distance: '14 km', standard: 990, express: 1485 },
  { type: 'Boxed Package', weight: '25–30 kg', mode: 'Van', distance: '16 km', standard: 1120, express: 1680 },

  // 🎒 BAGS
  { type: 'Bag', weight: '8–15 kg', mode: 'Motorbike / Car', distance: '8 km', standard: 760, express: 1140 },
  { type: 'Bag', weight: '10–18 kg', mode: 'Car', distance: '10 km', standard: 890, express: 1335 },
  { type: 'Bag', weight: '18–22 kg', mode: 'Car', distance: '11 km', standard: 1050, express: 1575 },
  { type: 'Bag', weight: '22–28 kg', mode: 'Car / SUV', distance: '13 km', standard: 1190, express: 1785 },
  { type: 'Bag', weight: '28–35 kg', mode: 'SUV', distance: '15 km', standard: 1320, express: 1980 },
  { type: 'Bag', weight: '35–40 kg', mode: 'SUV', distance: '17 km', standard: 1450, express: 2175 },

  // 🧳 SUITCASES
  { type: 'Suitcase', weight: '15–25 kg', mode: 'Car / SUV', distance: '12 km', standard: 1190, express: 1785 },
  { type: 'Suitcase', weight: '20–30 kg', mode: 'SUV', distance: '15 km', standard: 1350, express: 2025 },
  { type: 'Suitcase', weight: '25–40 kg', mode: 'SUV', distance: '18 km', standard: 1480, express: 2220 },
  { type: 'Suitcase', weight: '35–50 kg', mode: 'SUV / Van', distance: '20 km', standard: 1600, express: 2400 },
  { type: 'Suitcase', weight: '50–65 kg', mode: 'Van', distance: '25 km', standard: 1750, express: 2625 },
  { type: 'Suitcase', weight: '65–80 kg', mode: 'Van / Truck', distance: '30 km', standard: 1950, express: 2925 }
];


get totalPages() {
  return Math.ceil(this.parcelPrices.length / this.itemsPerPage);
}

get paginatedItems() {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  return this.parcelPrices.slice(start, start + this.itemsPerPage);
}

nextPage() {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
  }
}

prevPage() {
  if (this.currentPage > 1) {
    this.currentPage--;
  }
}


}