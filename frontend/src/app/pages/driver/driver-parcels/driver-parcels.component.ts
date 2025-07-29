import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/notification/notification.service';
import { DriverService } from '../../../services/driver.service'; 
import { interval, Subscription } from 'rxjs';
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';
import { RouteService } from '../../../services/route.service';

interface Parcel {
  id: string;
  trackingId: string;
  senderName: string;
  receiverName: string;
  from: string;
  to: string;
  dateSent: string;
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP_BY_DRIVER' | 'IN_TRANSIT' | 'DELIVERED' | 'COLLECTED_BY_RECEIVER' | 'CANCELLED';
  description: string | null;
  type: 'BOXED_PACKAGE' | 'ENVELOPE' | 'BAG' | 'SUITCASE';
  weight: number;
  mode: 'STANDARD' | 'EXPRESS';
  price: string;
  distance?: number;
  fromLat?: number;
  fromLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  pickedAt?: string;
  deliveredAt?: string;
  driverId?: number;
  currentLocation?: { lat: number; lng: number };
  currentLocationInput?: string;
  senderEmail?: string;
  receiverEmail?: string;
}

declare const google: any;

@Component({
  selector: 'app-driver-parcels',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DriverNavbarComponent
  ],
  templateUrl: './driver-parcels.component.html',
  styleUrls: ['./driver-parcels.component.css']
})
export class DriverParcelsComponent implements AfterViewInit, OnDestroy {
  filterName = '';
  filterStatus = '';
  filterMode = '';
  filterType = '';
  filterFromDate = '';
  filterToDate = '';

  showMapModal = false;
  showInfoModal = false;
  selectedParcel: Parcel | null = null;
  mapInitialized = false;

  parcels: Parcel[] = [];
  private pollingSubscription: Subscription | null = null;

  constructor(
    private notification: NotificationService,
    private driverService: DriverService,
      private routeService: RouteService
  ) {}

  ngAfterViewInit(): void {
    this.loadGoogleMapsScript();
    this.loadParcels();
    this.pollingSubscription = interval(30000).subscribe(() => this.loadParcels());
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  loadParcels(): void {
    this.driverService.getMyParcels().subscribe({
      next: (parcels) => {
        console.log('Received parcels:', parcels);
        console.log('Number of parcels:', parcels.length);

        this.parcels = parcels.map((p: any) => ({
          id: p.id,
          trackingId: p.trackingId,
          senderName: p.senderName,
          receiverName: p.receiverName,
          from: p.from,
          to: p.to,
          dateSent: p.sentAt,
          status: p.status,
          description: p.description,
          type: p.type,
          weight: p.weight,
          mode: p.mode,
          price: p.price != null ? `KSh ${p.price.toFixed(2)}` : 'N/A',
          distance: p.distance,
          fromLat: p.fromLat,
          fromLng: p.fromLng,
          destinationLat: p.destinationLat,
          destinationLng: p.destinationLng,
          pickedAt: p.pickedAt,
          deliveredAt: p.deliveredAt,
          driverId: p.driverId,
          senderEmail: p.senderEmail,
          receiverEmail: p.receiverEmail,
          currentLocation: {
            lat: (p.driver?.currentLat !== null && p.driver?.currentLat !== undefined)
              ? p.driver.currentLat
              : p.fromLat || 0,
            lng: (p.driver?.currentLng !== null && p.driver?.currentLng !== undefined)
              ? p.driver.currentLng
              : p.fromLng || 0
          },
          currentLocationInput: '',
        }));

        console.log('Mapped parcels:', this.parcels);
      },
      error: (err) => {
        console.error('Error loading parcels:', err);
        this.notification.error('Failed to load parcels');
      }
    });
  }

  loadGoogleMapsScript(): void {
    if (this.mapInitialized) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.mapInitialized = true;
    };
    document.head.appendChild(script);
  }

  get filteredParcels(): Parcel[] {
    const filtered = this.parcels.filter(p => {
      const nameMatch = p.senderName?.toLowerCase().includes(this.filterName.toLowerCase()) || false;
      const statusMatch = this.filterStatus ? p.status === this.filterStatus : true;
      const modeMatch = this.filterMode ? p.mode === this.filterMode : true;
      const typeMatch = this.filterType ? p.type === this.filterType : true;
      const dateMatch =
        (!this.filterFromDate || new Date(p.dateSent) >= new Date(this.filterFromDate)) &&
        (!this.filterToDate || new Date(p.dateSent) <= new Date(this.filterToDate));
      return nameMatch && statusMatch && modeMatch && typeMatch && dateMatch;
    });

    console.log('Filtered parcels:', filtered);
    console.log('Filter values:', {
      filterName: this.filterName,
      filterStatus: this.filterStatus,
      filterMode: this.filterMode,
      filterType: this.filterType
    });

    return filtered;
  }

  canMarkPickedUp(parcel: Parcel): boolean {
    return parcel.status === 'ASSIGNED';
  }

  canUpdateLocation(parcel: Parcel): boolean {
    return parcel.status === 'PICKED_UP_BY_DRIVER' || parcel.status === 'IN_TRANSIT';
  }

  isParcelCompleted(parcel: Parcel): boolean {
    return parcel.status === 'DELIVERED' || parcel.status === 'COLLECTED_BY_RECEIVER' || parcel.status === 'CANCELLED';
  }

  markPickedUp(parcel: Parcel): void {
    if (!parcel.id) {
      this.notification.error('Parcel ID is missing');
      return;
    }

    this.driverService.markPickedUp(parcel.id).subscribe({
      next: (response: any) => {
        this.notification.success('Parcel marked as picked up successfully.');
        this.loadParcels();
      },
      error: (err) => {
        console.error('Error marking as picked up:', err);
        const errorMessage = err.status === 404 ? 'Parcel not found. Please try again.' :
                            err.status === 400 ? err.error?.message || 'Invalid request.' :
                            'Failed to mark parcel as picked up.';
        this.notification.error(errorMessage);
      },
    });
  }

  updateLocation(parcel: Parcel, location: string | undefined): void {
    if (!location || location.trim() === '') {
      this.notification.error('Please enter a location');
      return;
    }

    if (!parcel.id) {
      this.notification.error('Parcel ID is missing');
      return;
    }

    this.driverService.updateLocation(parcel.id, location.trim()).subscribe({
      next: (response) => {
        if (response.status) {
          this.notification.success(response.message || 'Location updated successfully.');
          const targetParcel = this.parcels.find(p => p.id === parcel.id);
          if (targetParcel) {
            targetParcel.currentLocationInput = '';
          }
          this.loadParcels();
        } else {
          this.notification.error(response.message || 'Failed to update location.');
        }
      },
      error: (err) => {
        console.error('Error updating location:', err);
        this.notification.error(err.error?.message || 'Failed to update location.');
      },
    });
  }

  openMap(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showMapModal = true;

    setTimeout(() => {
      if (this.mapInitialized && this.selectedParcel) {
        this.renderGoogleMap(this.selectedParcel);
      } else {
        this.notification.error('Google Maps API not loaded yet. Please try again shortly.');
      }
    }, 300);
  }

  async renderGoogleMap(parcel: Parcel): Promise<void> {
  const map = new google.maps.Map(document.getElementById('google-map'), {
    center: parcel.currentLocation,
    zoom: 7
  });

  const pickupCoords = {
    lat: parcel.fromLat || 0,
    lng: parcel.fromLng || 0
  };

  const destinationCoords = {
    lat: parcel.destinationLat || 0,
    lng: parcel.destinationLng || 0
  };

  const currentCoords = {
    lat: parcel.currentLocation?.lat || 0,
    lng: parcel.currentLocation?.lng || 0
  };

  const bounds = new google.maps.LatLngBounds();
  bounds.extend(pickupCoords);
  bounds.extend(currentCoords);
  bounds.extend(destinationCoords);
  map.fitBounds(bounds);

  // Markers
  new google.maps.Marker({
    position: pickupCoords,
    map,
    title: 'Pickup Location',
    icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
  });

  new google.maps.Marker({
    position: destinationCoords,
    map,
    title: 'Destination',
    icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
  });

  new google.maps.Marker({
    position: currentCoords,
    map,
    title: 'Current Location',
    icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
  });

  // Use RouteService to calculate route with fallback
  try {
    const routeResult = await this.routeService.calculateRouteWithFallback(currentCoords, destinationCoords);

    const decodedPath = this.routeService.decodePolyline(routeResult.polyline || '');

    const polyline = new google.maps.Polyline({
      path: decodedPath,
      geodesic: true,
      strokeColor: '#4285F4',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: '#4285F4'
          },
          offset: '50%'
        }
      ],
      map
    });

    this.routeService.calculateRouteWithFallback(currentCoords, destinationCoords).then(route => {
  const decodedPath = this.routeService.decodePolyline(route.polyline || '');

  const routePolyline = new google.maps.Polyline({
    path: decodedPath,
    geodesic: true,
    strokeColor: '#FF0000', // red route
    strokeOpacity: 0.9,
    strokeWeight: 4,
    icons: [{
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 3,
        strokeColor: '#FF0000'
      },
      offset: '50%'
    }]
  });

  routePolyline.setMap(map);

  // Adjust map bounds to fit route
  const bounds = new google.maps.LatLngBounds();
  decodedPath.forEach(point => bounds.extend(point));
  map.fitBounds(bounds);
}).catch(err => {
  this.notification.error('Could not render route: ' + err.message);
});


    console.log('🛣️ Road-following route rendered with', decodedPath.length, 'points');
  } catch (error: any) {
    console.error('Failed to render route:', error);
    this.notification.error(error.message || 'Unable to render road route. Showing straight line instead.');

    // Fallback straight line
    new google.maps.Polyline({
      path: [currentCoords, destinationCoords],
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 0.6,
      strokeWeight: 4,
      map
    });
  }
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
      Kisumu: { lat: 0.0917, lng: 34.768 },
      Eldoret: { lat: 0.5143, lng: 35.2698 },
      Mombasa: { lat: -4.0435, lng: 39.6682 }
    };
    return map[city] || { lat: 0, lng: 0 };
  }
}