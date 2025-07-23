import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/notification/notification.service';
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
  currentLocation: {
    lat: number;
    lng: number;
  };
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

  // Mock data for tracking results
  private mockTrackingData: TrackingResult[] = [
    {
      trackingId: 'PKG-1021',
      receiver: 'Brian Mwangi',
      from: 'Nairobi',
      to: 'Kisumu',
      dateSent: '2025-07-20',
      status: 'In Transit',
      description: 'Books and documents',
      type: 'Box',
      weight: '2.5 kg',
      paymentMethod: 'M-Pesa',
      deliveryMode: 'Express',
      expectedDelivery: '2025-07-25',
      currentLocation: { lat: -0.5, lng: 35.5 },
      timeline: [
        { status: 'Package Received', date: '2025-07-20 09:00', location: 'Nairobi Hub', completed: true },
        { status: 'In Transit', date: '2025-07-21 14:30', location: 'Nakuru Station', completed: true },
        { status: 'Out for Delivery', date: '2025-07-25 08:00', location: 'Kisumu Hub', completed: false },
        { status: 'Delivered', date: '2025-07-25 16:00', location: 'Kisumu', completed: false }
      ]
    },
    {
      trackingId: 'PKG-1022',
      receiver: 'Alice Otieno',
      from: 'Mombasa',
      to: 'Nakuru',
      dateSent: '2025-07-18',
      status: 'Delivered',
      description: 'Clothes and accessories',
      type: 'Bag',
      weight: '1.2 kg',
      paymentMethod: 'Card',
      deliveryMode: 'Standard',
      expectedDelivery: '2025-07-22',
      currentLocation: { lat: -0.3031, lng: 36.0800 },
      timeline: [
        { status: 'Package Received', date: '2025-07-18 10:00', location: 'Mombasa Hub', completed: true },
        { status: 'In Transit', date: '2025-07-19 11:00', location: 'Nairobi Hub', completed: true },
        { status: 'Out for Delivery', date: '2025-07-22 09:00', location: 'Nakuru Hub', completed: true },
        { status: 'Delivered', date: '2025-07-22 15:30', location: 'Nakuru', completed: true }
      ]
    }
  ];

  constructor(
    private notify: NotificationService,
    private router: Router
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
    };

    document.head.appendChild(script);
  }

  trackPackage(): void {
    if (!this.trackingId.trim()) {
      this.notify.warning('Please enter a tracking ID.');
      return;
    }

    this.isLoading = true;

    // Simulate API call delay
    setTimeout(() => {
      const result = this.mockTrackingData.find(
        item => item.trackingId.toLowerCase() === this.trackingId.toLowerCase()
      );

      this.isLoading = false;

      if (result) {
        this.trackingResult = result;
        this.showTrackingModal = true;
        
        // Initialize map after modal is shown
        setTimeout(() => {
          if (this.mapInitialized && this.trackingResult) {
            this.renderGoogleMap(this.trackingResult);
          }
        }, 300);

        this.notify.success(`Package found: ${result.trackingId}`);
      } else {
        this.notify.error('Package not found. Please check your tracking ID.');
      }
    }, 1000);
  }

  async renderGoogleMap(trackingData: TrackingResult): Promise<void> {
    try {
      const destinationCoords = this.getLatLng(trackingData.to);
      const originCoords = this.getLatLng(trackingData.from);

      // Import the AdvancedMarkerElement library
      const { AdvancedMarkerElement, PinElement } = await (window as any).google.maps.importLibrary("marker");

      const map = new google.maps.Map(document.getElementById('tracking-map'), {
        center: trackingData.currentLocation,
        zoom: 7,
        mapId: 'TRACKING_MAP_ID'
      });

      // Create custom pins
      const originPin = new PinElement({
        background: '#6c757d',
        borderColor: '#495057',
        glyphColor: '#ffffff',
        glyph: '📤'
      });

      const currentLocationPin = new PinElement({
        background: '#22c55e',
        borderColor: '#16a34a',
        glyphColor: '#ffffff',
        glyph: '🚚'
      });

      const destinationPin = new PinElement({
        background: '#800020',
        borderColor: '#600018',
        glyphColor: '#ffffff',
        glyph: '🎯'
      });

      // Origin marker
      new AdvancedMarkerElement({
        position: originCoords,
        map,
        title: `Origin: ${trackingData.from}`,
        content: originPin.element
      });

      // Current location marker
      new AdvancedMarkerElement({
        position: trackingData.currentLocation,
        map,
        title: 'Current Location',
        content: currentLocationPin.element
      });

      // Destination marker
      new AdvancedMarkerElement({
        position: destinationCoords,
        map,
        title: `Destination: ${trackingData.to}`,
        content: destinationPin.element
      });

      // Route line from origin to current location (completed)
      new google.maps.Polyline({
        path: [originCoords, trackingData.currentLocation],
        geodesic: true,
        strokeColor: '#22c55e',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map
      });

      // Route line from current location to destination (remaining)
      new google.maps.Polyline({
        path: [trackingData.currentLocation, destinationCoords],
        geodesic: true,
        strokeColor: '#800020',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: '#800020',
            fillColor: '#800020',
            fillOpacity: 1
          },
          offset: '50%'
        }],
        map
      });

      // Fit bounds around all markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(originCoords);
      bounds.extend(trackingData.currentLocation);
      bounds.extend(destinationCoords);
      map.fitBounds(bounds);

      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);

    } catch (error) {
      console.error('Error rendering Google Map:', error);
      this.renderLegacyGoogleMap(trackingData);
    }
  }

  renderLegacyGoogleMap(trackingData: TrackingResult): void {
    const destinationCoords = this.getLatLng(trackingData.to);
    const originCoords = this.getLatLng(trackingData.from);

    const map = new google.maps.Map(document.getElementById('tracking-map'), {
      center: trackingData.currentLocation,
      zoom: 7
    });

    // Origin marker (gray)
    new google.maps.Marker({
      position: originCoords,
      map,
      title: `Origin: ${trackingData.from}`,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/grey-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    // Current location marker (green)
    new google.maps.Marker({
      position: trackingData.currentLocation,
      map,
      title: 'Current Location',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    // Destination marker (red)
    new google.maps.Marker({
      position: destinationCoords,
      map,
      title: `Destination: ${trackingData.to}`,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    // Route lines
    new google.maps.Polyline({
      path: [originCoords, trackingData.currentLocation],
      geodesic: true,
      strokeColor: '#22c55e',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map
    });

    new google.maps.Polyline({
      path: [trackingData.currentLocation, destinationCoords],
      geodesic: true,
      strokeColor: '#800020',
      strokeOpacity: 0.6,
      strokeWeight: 3,
      map
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(originCoords);
    bounds.extend(trackingData.currentLocation);
    bounds.extend(destinationCoords);
    map.fitBounds(bounds);
  }

  closeTrackingModal(): void {
    this.showTrackingModal = false;
    this.trackingResult = null;
    this.trackingId = '';
  }

  getLatLng(city: string): { lat: number; lng: number } {
    const map: Record<string, { lat: number; lng: number }> = {
      Nairobi: { lat: -1.2921, lng: 36.8219 },
      Kisumu: { lat: 0.0917, lng: 34.7680 },
      Mombasa: { lat: -4.0435, lng: 39.6682 },
      Nakuru: { lat: -0.3031, lng: 36.0800 },
      Eldoret: { lat: 0.5143, lng: 35.2699 },
      Thika: { lat: -1.0332, lng: 37.0692 }
    };
    return map[city] || { lat: -1.2921, lng: 36.8219 }; // Default to Nairobi
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered': return '#22c55e';
      case 'in transit': return '#f59e0b';
      case 'out for delivery': return '#3b82f6';
      case 'package received': return '#6c757d';
      default: return '#800020';
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