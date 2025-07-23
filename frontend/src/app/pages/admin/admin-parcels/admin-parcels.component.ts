import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/notification/notification.service';
import { environment } from '../../../../environments/environment';

interface LatLng {
  lat: number;
  lng: number;
}

interface Driver {
  id: string;
  name: string;
  status: 'available' | 'on_delivery' | 'offline';
  phone: string;
  email: string;
  vehicleType: string;
  licensePlate: string;
}

interface Parcel {
  id: string;
  sender: string;
  receiver: string;
  status: 'In Transit' | 'Delivered' | 'Picked Up' | 'Cancelled' | string;
  from: string;
  to: string;
  mode: string;
  type: string;
  weight: string;
  description: string;
  dateSent: string;
  currentLocation: LatLng;
  assignedDriver?: Driver | null;
}

declare const google: any;

@Component({
  selector: 'app-admin-parcels',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-parcels.component.html',
  styleUrls: ['./admin-parcels.component.css']
})
export class AdminParcelsComponent implements AfterViewInit {
  filterName = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterStatus = '';
  filterMode = '';
  filterType = '';

  showMapModal = false;
  showInfoModal = false;
  showConfirmModal = false;
  selectedParcel: Parcel | null = null;
  parcelToUnassign: Parcel | null = null;
  mapInitialized = false;
  private mapScriptLoaded = false;

  constructor(private notificationService: NotificationService) {}

  // Mock drivers data
  drivers: Driver[] = [
    {
      id: 'DRV-001',
      name: 'John Kamau',
      status: 'available',
      phone: '+254712345671',
      email: 'john.kamau@logistics.com',
      vehicleType: 'Van',
      licensePlate: 'KCA 123A'
    },
    {
      id: 'DRV-002',
      name: 'Mary Wanjiku',
      status: 'on_delivery',
      phone: '+254712345672',
      email: 'mary.wanjiku@logistics.com',
      vehicleType: 'Motorcycle',
      licensePlate: 'KCB 456B'
    },
    {
      id: 'DRV-003',
      name: 'Peter Ochieng',
      status: 'available',
      phone: '+254712345673',
      email: 'peter.ochieng@logistics.com',
      vehicleType: 'Truck',
      licensePlate: 'KCC 789C'
    },
    {
      id: 'DRV-004',
      name: 'Grace Nyambura',
      status: 'available',
      phone: '+254712345674',
      email: 'grace.nyambura@logistics.com',
      vehicleType: 'Van',
      licensePlate: 'KCD 012D'
    },
    {
      id: 'DRV-005',
      name: 'David Kiprop',
      status: 'offline',
      phone: '+254712345675',
      email: 'david.kiprop@logistics.com',
      vehicleType: 'Motorcycle',
      licensePlate: 'KCE 345E'
    },
    {
      id: 'DRV-006',
      name: 'Sarah Muthoni',
      status: 'available',
      phone: '+254712345676',
      email: 'sarah.muthoni@logistics.com',
      vehicleType: 'Car',
      licensePlate: 'KCF 678F'
    },
    {
      id: 'DRV-007',
      name: 'James Mutua',
      status: 'on_delivery',
      phone: '+254712345677',
      email: 'james.mutua@logistics.com',
      vehicleType: 'Van',
      licensePlate: 'KCG 901G'
    },
    {
      id: 'DRV-008',
      name: 'Ann Chebet',
      status: 'available',
      phone: '+254712345678',
      email: 'ann.chebet@logistics.com',
      vehicleType: 'Motorcycle',
      licensePlate: 'KCH 234H'
    },
    {
      id: 'DRV-009',
      name: 'Michael Otieno',
      status: 'available',
      phone: '+254712345679',
      email: 'michael.otieno@logistics.com',
      vehicleType: 'Truck',
      licensePlate: 'KCI 567I'
    },
    {
      id: 'DRV-010',
      name: 'Lucy Wangeci',
      status: 'available',
      phone: '+254712345680',
      email: 'lucy.wangeci@logistics.com',
      vehicleType: 'Car',
      licensePlate: 'KCJ 890J'
    }
  ];

  parcels: Parcel[] = [
    {
      id: 'PKG-1001',
      sender: 'Leah Achieng',
      receiver: 'Mark Otieno',
      status: 'In Transit',
      from: 'Nairobi',
      to: 'Kisumu',
      mode: 'Express',
      type: 'Boxed package',
      weight: '2kg',
      description: 'Electronics package',
      dateSent: '2025-07-15',
      currentLocation: { lat: -1.2921, lng: 36.8219 },
      assignedDriver: this.drivers.find(d => d.id === 'DRV-002') || null
    },
    {
      id: 'PKG-1002',
      sender: 'John Doe',
      receiver: 'Grace Mwangi',
      status: 'Delivered',
      from: 'Mombasa',
      to: 'Nakuru',
      mode: 'Standard',
      type: 'Envelope',
      weight: '0.5kg',
      description: 'Documents',
      dateSent: '2025-07-13',
      currentLocation: { lat: -4.0435, lng: 39.6682 },
      assignedDriver: null
    },
    {
      id: 'PKG-1003',
      sender: 'Alice Njeri',
      receiver: 'Brian Otieno',
      status: 'In Transit',
      from: 'Eldoret',
      to: 'Nairobi',
      mode: 'Standard',
      type: 'Bag',
      weight: '5kg',
      description: 'Clothing items',
      dateSent: '2025-07-17',
      currentLocation: { lat: 0.5143, lng: 35.2698 },
      assignedDriver: this.drivers.find(d => d.id === 'DRV-007') || null
    },
    {
      id: 'PKG-1004',
      sender: 'Kevin Kimani',
      receiver: 'Susan Wanjiku',
      status: 'Delivered',
      from: 'Thika',
      to: 'Machakos',
      mode: 'Express',
      type: 'Suitcase',
      weight: '15kg',
      description: 'Personal travel luggage',
      dateSent: '2025-07-14',
      currentLocation: { lat: -1.1056, lng: 37.0144 },
      assignedDriver: null
    },
    {
      id: 'PKG-1005',
      sender: 'Mercy Chebet',
      receiver: 'Daniel Kiptoo',
      status: 'In Transit',
      from: 'Kericho',
      to: 'Kisii',
      mode: 'Standard',
      type: 'Boxed package',
      weight: '8kg',
      description: 'Books and stationery',
      dateSent: '2025-07-19',
      currentLocation: { lat: -0.3676, lng: 35.2834 },
      assignedDriver: null
    },
    {
      id: 'PKG-1006',
      sender: 'George Odhiambo',
      receiver: 'Lilian Achieng',
      status: 'Delivered',
      from: 'Nakuru',
      to: 'Kakamega',
      mode: 'Standard',
      type: 'Envelope',
      weight: '0.2kg',
      description: 'Signed documents',
      dateSent: '2025-07-11',
      currentLocation: { lat: 0.2827, lng: 34.7519 },
      assignedDriver: null
    },
    {
      id: 'PKG-1007',
      sender: 'Brenda Atieno',
      receiver: 'James Ndegwa',
      status: 'In Transit',
      from: 'Kisumu',
      to: 'Nyeri',
      mode: 'Express',
      type: 'Suitcase',
      weight: '10kg',
      description: 'Event materials',
      dateSent: '2025-07-20',
      currentLocation: { lat: -0.4276, lng: 36.9516 },
      assignedDriver: null
    },
    {
      id: 'PKG-1008',
      sender: 'Robert Kiprotich',
      receiver: 'Faith Wambui',
      status: 'In Transit',
      from: 'Nairobi',
      to: 'Mombasa',
      mode: 'Express',
      type: 'Boxed package',
      weight: '3kg',
      description: 'Medical supplies',
      dateSent: '2025-07-18',
      currentLocation: { lat: -1.2921, lng: 36.8219 },
      assignedDriver: null
    }
  ];

  get availableDrivers(): Driver[] {
    return this.drivers.filter(driver => driver.status === 'available');
  }

  ngAfterViewInit(): void {
    // Only load the script once
    if (!this.mapScriptLoaded) {
      this.loadGoogleMapsScript();
    }
  }

  loadGoogleMapsScript(): void {
    // Check if Google Maps is already loaded
    if (typeof google !== 'undefined' && google.maps) {
      this.mapInitialized = true;
      this.mapScriptLoaded = true;
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.mapInitialized = true;
      this.mapScriptLoaded = true;
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      this.notificationService.error('Failed to load Google Maps. Please check your API key.');
    };
    document.head.appendChild(script);
  }

  assignDriver(parcel: Parcel, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const driverId = select.value;
    
    if (!driverId) return;

    const driver = this.drivers.find(d => d.id === driverId);
    if (!driver) return;

    // Assign driver to parcel
    parcel.assignedDriver = driver;
    
    // Update driver status to on_delivery
    driver.status = 'on_delivery';
    
    this.notificationService.success(`Driver ${driver.name} assigned to parcel ${parcel.id}`);
  }

  confirmUnassign(parcel: Parcel): void {
    this.parcelToUnassign = parcel;
    this.showConfirmModal = true;
  }

  unassignDriver(): void {
    if (!this.parcelToUnassign?.assignedDriver) return;

    const driver = this.parcelToUnassign.assignedDriver;
    
    // Update driver status back to available
    driver.status = 'available';
    
    // Remove driver from parcel
    this.parcelToUnassign.assignedDriver = null;
    
    this.notificationService.success(`Driver ${driver.name} unassigned from parcel ${this.parcelToUnassign.id}`);
    
    this.cancelUnassign();
  }

  cancelUnassign(): void {
    this.showConfirmModal = false;
    this.parcelToUnassign = null;
  }

  openMap(parcel: Parcel): void {
    if (!environment.googleMapsApiKey || environment.googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      this.notificationService.error('Google Maps API key not configured. Please add a valid API key to environment.ts');
      return;
    }

    this.selectedParcel = parcel;
    this.showMapModal = true;

    setTimeout(() => {
      if (this.mapInitialized && this.selectedParcel) {
        this.renderGoogleMap(this.selectedParcel);
      } else if (!this.mapInitialized) {
        this.notificationService.error('Google Maps is still loading. Please try again in a moment.');
        this.closeModals();
      }
    }, 300);
  }

  renderGoogleMap(parcel: Parcel): void {
    try {
      const destinationCoords = this.getLatLng(parcel.to);

      const map = new google.maps.Map(document.getElementById('google-map'), {
        center: parcel.currentLocation,
        zoom: 7,
        mapId: 'DEMO_MAP_ID' // Required for Advanced Markers
      });

      // Use AdvancedMarkerElement instead of deprecated Marker
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        // Current location marker
        new google.maps.marker.AdvancedMarkerElement({
          position: parcel.currentLocation,
          map,
          title: 'Current Location'
        });

        // Destination marker
        new google.maps.marker.AdvancedMarkerElement({
          position: destinationCoords,
          map,
          title: 'Destination'
        });
      } else {
        // Fallback to regular markers if AdvancedMarkerElement is not available
        new google.maps.Marker({
          position: parcel.currentLocation,
          map,
          title: 'Current Location',
          icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
        });

        new google.maps.Marker({
          position: destinationCoords,
          map,
          title: 'Destination',
          icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        });
      }

      // Route line with direction arrow
      const routeLine = new google.maps.Polyline({
        path: [parcel.currentLocation, destinationCoords],
        geodesic: true,
        strokeColor: '#4285F4',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: '#4285F4'
          },
          offset: '50%'
        }],
        map
      });

      // Fit bounds around both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(parcel.currentLocation);
      bounds.extend(destinationCoords);
      map.fitBounds(bounds);

    } catch (error) {
      console.error('Error rendering Google Map:', error);
      this.notificationService.error('Error loading map. Please try again.');
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
      Kisumu: { lat: 0.0917, lng: 34.7680 },
      Mombasa: { lat: -4.0435, lng: 39.6682 },
      Nakuru: { lat: -0.3031, lng: 36.0800 },
      Eldoret: { lat: 0.5143, lng: 35.2698 },
      Thika: { lat: -1.0333, lng: 37.0693 },
      Machakos: { lat: -1.5177, lng: 37.2634 },
      Kericho: { lat: -0.3676, lng: 35.2834 },
      Kisii: { lat: -0.6817, lng: 34.7667 },
      Kakamega: { lat: 0.2827, lng: 34.7519 },
      Nyeri: { lat: -0.4167, lng: 36.9500 }
    };
    return map[city] || { lat: 0, lng: 0 };
  }

  get filteredParcels(): Parcel[] {
    return this.parcels.filter(p => {
      const matchesName = this.filterName === '' || p.sender.toLowerCase().includes(this.filterName.toLowerCase());
      const matchesStatus = this.filterStatus === '' || p.status === this.filterStatus;
      const matchesMode = this.filterMode === '' || p.mode === this.filterMode;
      const matchesType = this.filterType === '' || p.type.toLowerCase().includes(this.filterType.toLowerCase());
      const matchesDate =
        (!this.filterDateFrom || new Date(p.dateSent) >= new Date(this.filterDateFrom)) &&
        (!this.filterDateTo || new Date(p.dateSent) <= new Date(this.filterDateTo));
      return matchesName && matchesStatus && matchesMode && matchesType && matchesDate;
    });
  }

  currentPage = 1;
  itemsPerPage = 6;

  get totalPages(): number {
    return Math.ceil(this.filteredParcels.length / this.itemsPerPage);
  }

  get paginatedParcels(): Parcel[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredParcels.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }
}