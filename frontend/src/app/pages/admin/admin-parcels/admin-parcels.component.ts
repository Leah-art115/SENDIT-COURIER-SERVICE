import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/notification/notification.service';
import { environment } from '../../../../environments/environment';

interface LatLng {
  lat: number;
  lng: number;
}

interface Parcel {
  id: string;
  sender: string;
  receiver: string;
  status: 'In Transit' | 'Delivered' | string;
  from: string;
  to: string;
  mode: string;
  type: string;
  weight: string;
  description: string;
  dateSent: string;
  currentLocation: LatLng;
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
  selectedParcel: Parcel | null = null;
  mapInitialized = false;

  constructor(private notificationService: NotificationService) {}

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
    currentLocation: { lat: -1.2921, lng: 36.8219 }
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
    currentLocation: { lat: -4.0435, lng: 39.6682 }
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
    currentLocation: { lat: 0.5143, lng: 35.2698 }
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
    currentLocation: { lat: -1.1056, lng: 37.0144 }
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
    currentLocation: { lat: -0.3676, lng: 35.2834 }
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
    currentLocation: { lat: 0.2827, lng: 34.7519 }
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
    currentLocation: { lat: -0.4276, lng: 36.9516 }
  }
];


  ngAfterViewInit(): void {
    this.loadGoogleMapsScript();
  }

  loadGoogleMapsScript(): void {
    if (this.mapInitialized) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => (this.mapInitialized = true);
    document.head.appendChild(script);
  }

  openMap(parcel: Parcel): void {
    this.selectedParcel = parcel;
    this.showMapModal = true;

    setTimeout(() => {
      if (this.mapInitialized && this.selectedParcel) {
        this.renderGoogleMap(this.selectedParcel);
      }
    }, 300);
  }

  renderGoogleMap(parcel: Parcel): void {
  const destinationCoords = this.getLatLng(parcel.to);

  const map = new google.maps.Map(document.getElementById('google-map'), {
    center: parcel.currentLocation,
    zoom: 7
  });

  // Current location marker (green)
  new google.maps.Marker({
    position: parcel.currentLocation,
    map,
    title: 'Current Location',
    icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
  });

  // Destination marker (red)
  new google.maps.Marker({
    position: destinationCoords,
    map,
    title: 'Destination',
    icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
  });

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
      offset: '50%' // Arrow appears at the center of the line
    }],
    map
  });

  // Fit bounds around both markers
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(parcel.currentLocation);
  bounds.extend(destinationCoords);
  map.fitBounds(bounds);
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

  updateStatus(parcel: Parcel, event: Event): void {
    const select = event.target as HTMLSelectElement;
    parcel.status = select.value;
    this.notificationService.success(`Status for ${parcel.id} updated to ${parcel.status}`);
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
