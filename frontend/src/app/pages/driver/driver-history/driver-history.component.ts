import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';

interface DriverParcelHistory {
  trackingId: string;
  sender: string;
  recipient: string;
  from: string;
  to: string;
  dateDelivered: string;
  status: 'Delivered' | 'Cancelled';
  description: string;
  type: string;
  weight: string;
  deliveryMode: string;
}

@Component({
  selector: 'app-driver-history',
  standalone: true,
  imports: [CommonModule, FormsModule, DriverNavbarComponent],
  templateUrl: './driver-history.component.html',
  styleUrls: ['./driver-history.component.css']
})
export class DriverHistoryComponent {
  filterStatus = '';
  filterType = '';
  filterMode = '';
  filterFromDate = '';
  filterToDate = '';
  filterName = '';

  showInfoModal = false;
  selectedParcel: DriverParcelHistory | null = null;

  parcels: DriverParcelHistory[] = [
    {
      trackingId: 'PKG-3011',
      sender: 'Daniel Mutiso',
      recipient: 'Faith Wanjiku',
      from: 'Nairobi',
      to: 'Eldoret',
      dateDelivered: '2025-07-18',
      status: 'Delivered',
      description: 'Birthday Gift',
      type: 'Box',
      weight: '2.1 kg',
      deliveryMode: 'Express'
    },
    {
      trackingId: 'PKG-3012',
      sender: 'Brian Kimani',
      recipient: 'Alice Wairimu',
      from: 'Mombasa',
      to: 'Kisumu',
      dateDelivered: '2025-07-15',
      status: 'Cancelled',
      description: 'Clothing',
      type: 'Envelope',
      weight: '0.7 kg',
      deliveryMode: 'Standard'
    }
  ];

  get filteredParcels(): DriverParcelHistory[] {
    return this.parcels.filter(p => {
      const nameMatch =
        p.sender.toLowerCase().includes(this.filterName.toLowerCase()) ||
        p.recipient.toLowerCase().includes(this.filterName.toLowerCase());

      const statusMatch = this.filterStatus ? p.status === this.filterStatus : true;
      const typeMatch = this.filterType ? p.type === this.filterType : true;
      const modeMatch = this.filterMode ? p.deliveryMode === this.filterMode : true;
      const dateMatch =
        (!this.filterFromDate || new Date(p.dateDelivered) >= new Date(this.filterFromDate)) &&
        (!this.filterToDate || new Date(p.dateDelivered) <= new Date(this.filterToDate));

      return nameMatch && statusMatch && typeMatch && modeMatch && dateMatch;
    });
  }

  openInfo(parcel: DriverParcelHistory): void {
    this.selectedParcel = parcel;
    this.showInfoModal = true;
  }

  closeModals(): void {
    this.showInfoModal = false;
    this.selectedParcel = null;
  }
}
