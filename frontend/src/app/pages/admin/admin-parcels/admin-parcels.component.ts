import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/notification/notification.service';
import { environment } from '../../../../environments/environment';
import { AdminParcelService } from '../../../services/admin-parcel.service';

interface LatLng { lat: number; lng: number; }

interface Driver { id: string; name: string; }

interface Parcel {
  id: string;
  trackingId: string;
  senderName: string;
  receiverName: string;
  senderEmail: string;
  receiverEmail: string;
  status: string;
  from: string;
  to: string;
  mode: string;
  type: string;
  weight: string;
  price: string;
  description: string;
  dateSent: string;
  pickupLocation: LatLng;
  currentLocation: LatLng;
  destinationLocation: LatLng;
  assignedDriver?: Driver | null;
}

declare const google: any;

@Component({
  selector: 'app-admin-parcels',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-parcels.component.html',
  styleUrls: ['./admin-parcels.component.css'],
})
export class AdminParcelsComponent implements AfterViewInit {
  filterPerson = '';
  filterLocation = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterStatus = '';
  filterMode = '';
  filterType = '';

  parcels: Parcel[] = [];
  drivers: Driver[] = [];

  showMapModal = false;
  showInfoModal = false;
  showConfirmModal = false;
  selectedParcel: Parcel | null = null;
  parcelToUnassign: Parcel | null = null;
  mapInitialized = false;
  mapScriptLoaded = false;

  currentPage = 1;
  itemsPerPage = 6;

  constructor(
    private adminParcelService: AdminParcelService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadParcels();
    this.loadDrivers();
  }

  ngAfterViewInit(): void {
    if (!this.mapScriptLoaded) {
      this.loadGoogleMapsScript();
    }
  }

  loadParcels(): void {
    this.adminParcelService.getAllParcels().subscribe({
      next: (data) => {
        this.parcels = data.map((p: any) => ({
          id: p.id,
          trackingId: p.trackingId,
          senderName: p.senderName,
          receiverName: p.receiverName,
          senderEmail: p.senderEmail || '',
          receiverEmail: p.receiverEmail || '',
          status: p.status,
          from: p.from,
          to: p.to,
          mode: p.mode,
          type: p.type,
          weight: p.weight.toString(),
          price: p.price.toString(),
          description: p.description || '',
          dateSent: p.sentAt,
          pickupLocation: {
            lat: p.fromLat,
            lng: p.fromLng
          },
          currentLocation: {
            lat: p.status === 'DELIVERED' ? p.destinationLat : (p.driver?.currentLat ?? p.fromLat),
            lng: p.status === 'DELIVERED' ? p.destinationLng : (p.driver?.currentLng ?? p.fromLng),
          },
          destinationLocation: {
            lat: p.destinationLat,
            lng: p.destinationLng,
          },
          assignedDriver: p.driver
            ? { id: p.driver.id.toString(), name: p.driver.name }
            : null,
        }));
      },
      error: () => this.notificationService.error('Failed to load parcels.'),
    });
  }

  loadDrivers(): void {
    this.adminParcelService.getAvailableDrivers().subscribe({
      next: (data) => (this.drivers = data),
      error: () => this.notificationService.error('Failed to load drivers.'),
    });
  }

  assignDriver(parcel: Parcel, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const driverId = select.value;
    if (!driverId) return;

    this.adminParcelService.assignDriver(parcel.id, driverId).subscribe({
      next: (updated) => {
        this.parcels = this.parcels.map((p) =>
          p.id === parcel.id
            ? {
                ...p,
                status: updated.status,
                assignedDriver: updated.assignedDriver
                  ? { id: updated.assignedDriver.id.toString(), name: updated.assignedDriver.name }
                  : null,
              }
            : p
        );
        this.notificationService.success(`Driver assigned to parcel ${parcel.trackingId}`);
        this.loadDrivers();
      },
      error: (err) => {
        console.error('Assign driver failed:', err);
        this.notificationService.error(err.error?.message || 'Failed to assign driver.');
      },
    });
  }

  confirmUnassign(parcel: Parcel): void {
    this.parcelToUnassign = parcel;
    this.showConfirmModal = true;
  }

  unassignDriver(): void {
    if (!this.parcelToUnassign?.assignedDriver) return;

    this.adminParcelService.unassignDriver(this.parcelToUnassign.id).subscribe({
      next: (updated) => {
        this.parcels = this.parcels.map((p) =>
          p.id === this.parcelToUnassign!.id
            ? { ...p, status: updated.status, assignedDriver: null }
            : p
        );
        this.notificationService.success('Driver unassigned successfully.');
        this.loadDrivers();
        this.cancelUnassign();
      },
      error: (err) => {
        console.error('Unassign driver failed:', err);
        this.notificationService.error(err.error?.message || 'Failed to unassign driver.');
      },
    });
  }

  cancelUnassign(): void {
    this.parcelToUnassign = null;
    this.showConfirmModal = false;
  }

  openMap(parcel: Parcel): void {
    if (!environment.googleMapsApiKey || environment.googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      this.notificationService.error('Google Maps API key not configured.');
      return;
    }

    if (!this.isValidLatLng(parcel.pickupLocation) || !this.isValidLatLng(parcel.currentLocation) || !this.isValidLatLng(parcel.destinationLocation)) {
      this.notificationService.error('Invalid location data for this parcel.');
      return;
    }

    this.selectedParcel = parcel;
    this.showMapModal = true;

    setTimeout(() => {
      if (this.mapInitialized && this.selectedParcel) {
        this.renderGoogleMap(this.selectedParcel);
      } else {
        this.notificationService.error('Google Maps is still loading.');
        this.closeModals();
      }
    }, 300);
  }

  renderGoogleMap(parcel: Parcel): void {
    try {
      const pickupCoords = parcel.pickupLocation;
      const currentCoords = parcel.currentLocation;
      const destinationCoords = parcel.destinationLocation;

      const map = new google.maps.Map(document.getElementById('google-map'), {
        center: parcel.status === 'DELIVERED' ? destinationCoords : currentCoords,
        zoom: 7,
      });

      new google.maps.Marker({
        position: pickupCoords,
        map,
        title: 'Pickup Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });

      new google.maps.Marker({
        position: currentCoords,
        map,
        title: 'Current Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
      });

      new google.maps.Marker({
        position: destinationCoords,
        map,
        title: 'Destination',
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      });

      const path = parcel.status === 'DELIVERED' ? [pickupCoords, destinationCoords] : [pickupCoords, currentCoords, destinationCoords];

      new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#4285F4',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#4285F4',
            },
            offset: '50%',
          },
        ],
        map,
      });

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickupCoords);
      if (parcel.status !== 'DELIVERED') {
        bounds.extend(currentCoords);
      }
      bounds.extend(destinationCoords);
      map.fitBounds(bounds);
    } catch (error) {
      console.error('Error rendering map:', error);
      this.notificationService.error('Failed to load map.');
    }
  }

  isValidLatLng(coords: LatLng): boolean {
    return (
      coords != null &&
      typeof coords.lat === 'number' &&
      typeof coords.lng === 'number' &&
      isFinite(coords.lat) &&
      isFinite(coords.lng) &&
      (coords.lat !== 0 || coords.lng !== 0)
    );
  }

  closeModals(): void {
    this.showMapModal = false;
    this.showInfoModal = false;
    this.selectedParcel = null;
  }

  openInfo(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showInfoModal = true;
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  canUnassign(status: string): boolean {
    const restrictedStatuses = [
      'PICKED_UP_BY_DRIVER', 
      'IN_TRANSIT', 
      'DELIVERED', 
      'COLLECTED_BY_RECEIVER', 
      'CANCELLED'
    ];
    return !restrictedStatuses.includes(status.toUpperCase());
  }

  get availableDrivers(): Driver[] {
    return this.drivers;
  }

  get filteredParcels(): Parcel[] {
    return this.parcels.filter((p) => {
      const personMatch = !this.filterPerson ||
        p.senderName.toLowerCase().includes(this.filterPerson.toLowerCase()) ||
        p.receiverName.toLowerCase().includes(this.filterPerson.toLowerCase());
      const locationMatch = !this.filterLocation ||
        p.from.toLowerCase().includes(this.filterLocation.toLowerCase()) ||
        p.to.toLowerCase().includes(this.filterLocation.toLowerCase());
      const statusMatch = !this.filterStatus || p.status === this.filterStatus;
      const modeMatch = !this.filterMode || p.mode === this.filterMode;
      const typeMatch = !this.filterType || p.type.toLowerCase().includes(this.filterType.toLowerCase());
      const dateMatch =
        (!this.filterDateFrom || new Date(p.dateSent) >= new Date(this.filterDateFrom)) &&
        (!this.filterDateTo || new Date(p.dateSent) <= new Date(this.filterDateTo));
      return personMatch && locationMatch && statusMatch && modeMatch && typeMatch && dateMatch;
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredParcels.length / this.itemsPerPage);
  }

  get paginatedParcels(): Parcel[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredParcels.slice(start, start + this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  loadGoogleMapsScript(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.mapInitialized = true;
      this.mapScriptLoaded = true;
      return;
    }

    if (document.querySelector('script[src*="maps.googleapis.com"]')) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&loading=async&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.mapInitialized = true;
      this.mapScriptLoaded = true;
    };
    script.onerror = () => {
      this.notificationService.error('Failed to load Google Maps.');
    };
    document.head.appendChild(script);
  }
}