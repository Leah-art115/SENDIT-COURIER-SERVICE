import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/notification/notification.service';
import { ParcelService } from '../../services/parcel.service'; // Use your existing ParcelService
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

  constructor(
    private notify: NotificationService,
    private router: Router,
    private parcelService: ParcelService // Use your existing ParcelService
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
              this.renderGoogleMap(this.trackingResult);
            } else {
              console.warn('Map not initialized yet, retrying...');
              setTimeout(() => {
                if (this.mapInitialized && this.trackingResult) {
                  this.renderGoogleMap(this.trackingResult);
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

  async renderGoogleMap(trackingData: TrackingResult): Promise<void> {
    try {
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

      // Create route path
      const path = trackingData.status === 'Delivered' ? 
        [trackingData.pickupLocation, trackingData.destinationLocation] : 
        [trackingData.pickupLocation, trackingData.currentLocation, trackingData.destinationLocation];

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
    }
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

    // Route path
    const path = trackingData.status === 'Delivered' ? 
      [trackingData.pickupLocation, trackingData.destinationLocation] : 
      [trackingData.pickupLocation, trackingData.currentLocation, trackingData.destinationLocation];

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
}