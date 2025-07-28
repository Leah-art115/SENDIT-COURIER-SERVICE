import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/notification/notification.service';
import { environment } from '../../../../environments/environment';
import { AdminParcelService } from '../../../services/admin-parcel.service';

interface LatLng {
  lat: number;
  lng: number;
}

interface Driver {
  id: string;
  name: string;
}

interface Parcel {
  id: string;
  trackingId: string;
  senderName: string;
  receiverName: string;
  status: string;
  from: string;
  to: string;
  mode: string;
  type: string;
  weight: string;
  description: string;
  dateSent: string;
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
  filterName = '';
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
          status: p.status,
          from: p.from,
          to: p.to,
          mode: p.mode,
          type: p.type,
          weight: p.weight.toString(),
          description: p.description || '',
          dateSent: p.sentAt,
          currentLocation: {
            lat: p.driver?.currentLat ?? p.fromLat,
            lng: p.driver?.currentLng ?? p.fromLng,
          },
          destinationLocation: {
            lat: p.toLat,
            lng: p.toLng,
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
            ? {
                ...p,
                status: updated.status,
                assignedDriver: null,
              }
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

    if (!this.isValidLatLng(parcel.currentLocation) || !this.isValidLatLng(parcel.destinationLocation)) {
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
      const destinationCoords = parcel.destinationLocation;

      if (!this.isValidLatLng(parcel.currentLocation) || !this.isValidLatLng(destinationCoords)) {
        throw new Error('Invalid coordinates for map rendering.');
      }

      const map = new google.maps.Map(document.getElementById('google-map'), {
        center: parcel.currentLocation,
        zoom: 7,
        mapId: 'DEMO_MAP_ID',
      });

      new google.maps.marker.AdvancedMarkerElement({
        position: parcel.currentLocation,
        map,
        title: 'Current Location',
      });

      new google.maps.marker.AdvancedMarkerElement({
        position: destinationCoords,
        map,
        title: 'Destination',
      });

      new google.maps.Polyline({
        path: [parcel.currentLocation, destinationCoords],
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
      bounds.extend(parcel.currentLocation);
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

  get availableDrivers(): Driver[] {
    return this.drivers;
  }

  get filteredParcels(): Parcel[] {
    return this.parcels.filter((p) => {
      const nameMatch =
        !this.filterName || p.senderName.toLowerCase().includes(this.filterName.toLowerCase());
      const statusMatch = !this.filterStatus || p.status === this.filterStatus;
      const modeMatch = !this.filterMode || p.mode === this.filterMode;
      const typeMatch =
        !this.filterType || p.type.toLowerCase().includes(this.filterType.toLowerCase());
      const dateMatch =
        (!this.filterDateFrom || new Date(p.dateSent) >= new Date(this.filterDateFrom)) &&
        (!this.filterDateTo || new Date(p.dateSent) <= new Date(this.filterDateTo));
      return nameMatch && statusMatch && modeMatch && typeMatch && dateMatch;
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
