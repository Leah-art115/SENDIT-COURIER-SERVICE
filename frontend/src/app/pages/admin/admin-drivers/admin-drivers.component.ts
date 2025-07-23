import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/notification/notification.service';

interface Driver {
  id: string;
  name: string;
  email: string;
  mode: 'Bicycle' | 'Motorcycle' | 'Car' | 'Skates';
  status: 'Available' | 'On Delivery' | 'Out Sick' | 'On Leave' | 'Suspended';
  canReceiveAssignments: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  statusHistory?: StatusChange[];
}

interface StatusChange {
  from: string;
  to: string;
  changedAt: Date;
  changedBy: string; // admin user
}

interface ConfirmAction {
  title: string;
  message: string;
  confirmText: string;
  action: () => void;
}

@Component({
  selector: 'app-admin-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-drivers.component.html',
  styleUrls: ['./admin-drivers.component.css']
})
export class AdminDriversComponent {
  search = '';
  statusFilter = '';
  showModal = false;
  showEditModal = false;
  showActionModal = false;
  showStatusModal = false;
  showConfirmModal = false;
  showArchived = false;
  
  selectedDriver: Driver | null = null;
  selectedDriverIds: string[] = [];
  tempStatus: Driver['status'] = 'Available';
  
  confirmAction: ConfirmAction = {
    title: '',
    message: '',
    confirmText: '',
    action: () => {}
  };

  editDriver: Driver = {
    id: '', 
    name: '', 
    email: '', 
    mode: 'Bicycle', 
    status: 'Available',
    canReceiveAssignments: true,
    isDeleted: false,
    createdAt: new Date()
  };

  drivers: Driver[] = [
    {
      id: 'D001',
      name: 'Brian Otieno',
      email: 'brian@example.com',
      mode: 'Motorcycle',
      status: 'Available',
      canReceiveAssignments: true,
      isDeleted: false,
      createdAt: new Date('2024-01-15'),
      statusHistory: [
        { from: '', to: 'Available', changedAt: new Date('2024-01-15'), changedBy: 'System' }
      ]
    },
    {
      id: 'D002',
      name: 'Faith Wanjiku',
      email: 'faith@example.com',
      mode: 'Bicycle',
      status: 'On Delivery',
      canReceiveAssignments: false,
      isDeleted: false,
      createdAt: new Date('2024-01-20'),
      statusHistory: [
        { from: '', to: 'Available', changedAt: new Date('2024-01-20'), changedBy: 'System' },
        { from: 'Available', to: 'On Delivery', changedAt: new Date(), changedBy: 'System' }
      ]
    },
    {
      id: 'D003',
      name: 'Alex Kiptoo',
      email: 'alex@example.com',
      mode: 'Car',
      status: 'On Leave',
      canReceiveAssignments: false,
      isDeleted: false,
      createdAt: new Date('2024-02-01'),
      statusHistory: [
        { from: '', to: 'Available', changedAt: new Date('2024-02-01'), changedBy: 'System' },
        { from: 'Available', to: 'On Leave', changedAt: new Date('2024-07-20'), changedBy: 'Admin' }
      ]
    },
    {
      id: 'D004',
      name: 'Jane Achieng',
      email: 'jane@example.com',
      mode: 'Skates',
      status: 'Available',
      canReceiveAssignments: true,
      isDeleted: false,
      createdAt: new Date('2024-03-10')
    },
    {
      id: 'D005',
      name: 'Samuel Kimani',
      email: 'samuel@example.com',
      mode: 'Motorcycle',
      status: 'Suspended',
      canReceiveAssignments: false,
      isDeleted: false,
      createdAt: new Date('2024-01-25'),
      statusHistory: [
        { from: '', to: 'Available', changedAt: new Date('2024-01-25'), changedBy: 'System' },
        { from: 'Available', to: 'Suspended', changedAt: new Date('2024-07-15'), changedBy: 'Admin' }
      ]
    },

    {
  id: 'D006',
  name: 'Grace Wanjiku',
  email: 'grace@example.com',
  mode: 'Bicycle',
  status: 'Available',
  canReceiveAssignments: true,
  isDeleted: false,
  createdAt: new Date('2024-02-10'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-02-10'), changedBy: 'System' }
  ]
},
{
  id: 'D007',
  name: 'Peter Mwangi',
  email: 'peter@example.com',
  mode: 'Car',
  status: 'On Delivery',
  canReceiveAssignments: false,
  isDeleted: false,
  createdAt: new Date('2024-01-18'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-01-18'), changedBy: 'System' },
    { from: 'Available', to: 'On Delivery', changedAt: new Date('2024-07-22'), changedBy: 'System' }
  ]
},
{
  id: 'D008',
  name: 'Mary Njeri',
  email: 'mary@example.com',
  mode: 'Motorcycle',
  status: 'Out Sick',
  canReceiveAssignments: false,
  isDeleted: false,
  createdAt: new Date('2024-03-05'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-03-05'), changedBy: 'System' },
    { from: 'Available', to: 'Out Sick', changedAt: new Date('2024-07-20'), changedBy: 'Admin' }
  ]
},
{
  id: 'D009',
  name: 'Joseph Kariuki',
  email: 'joseph@example.com',
  mode: 'Car',
  status: 'Available',
  canReceiveAssignments: true,
  isDeleted: false,
  createdAt: new Date('2024-04-12'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-04-12'), changedBy: 'System' }
  ]
},
{
  id: 'D010',
  name: 'Lucy Wambui',
  email: 'lucy@example.com',
  mode: 'Bicycle',
  status: 'On Leave',
  canReceiveAssignments: false,
  isDeleted: false,
  createdAt: new Date('2024-02-28'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-02-28'), changedBy: 'System' },
    { from: 'Available', to: 'On Leave', changedAt: new Date('2024-07-18'), changedBy: 'Admin' }
  ]
},
{
  id: 'D011',
  name: 'David Ochieng',
  email: 'david@example.com',
  mode: 'Motorcycle',
  status: 'On Delivery',
  canReceiveAssignments: false,
  isDeleted: false,
  createdAt: new Date('2024-01-30'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-01-30'), changedBy: 'System' },
    { from: 'Available', to: 'On Leave', changedAt: new Date('2024-05-10'), changedBy: 'Admin' },
    { from: 'On Leave', to: 'Available', changedAt: new Date('2024-06-01'), changedBy: 'Admin' },
    { from: 'Available', to: 'On Delivery', changedAt: new Date('2024-07-22'), changedBy: 'System' }
  ]
},
{
  id: 'D012',
  name: 'Catherine Akinyi',
  email: 'catherine@example.com',
  mode: 'Car',
  status: 'Available',
  canReceiveAssignments: true,
  isDeleted: false,
  createdAt: new Date('2024-03-15'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-03-15'), changedBy: 'System' },
    { from: 'Available', to: 'Out Sick', changedAt: new Date('2024-06-20'), changedBy: 'Admin' },
    { from: 'Out Sick', to: 'Available', changedAt: new Date('2024-07-05'), changedBy: 'Admin' }
  ]
},
{
  id: 'D013',
  name: 'Robert Mutua',
  email: 'robert@example.com',
  mode: 'Car',
  status: 'Suspended',
  canReceiveAssignments: false,
  isDeleted: false,
  createdAt: new Date('2024-01-08'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-01-08'), changedBy: 'System' },
    { from: 'Available', to: 'Suspended', changedAt: new Date('2024-07-10'), changedBy: 'Admin' }
  ]
},
{
  id: 'D014',
  name: 'Alice Nyambura',
  email: 'alice@example.com',
  mode: 'Bicycle',
  status: 'Available',
  canReceiveAssignments: true,
  isDeleted: false,
  createdAt: new Date('2024-04-20'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-04-20'), changedBy: 'System' }
  ]
},
{
  id: 'D015',
  name: 'Francis Kiprotich',
  email: 'francis@example.com',
  mode: 'Motorcycle',
  status: 'On Delivery',
  canReceiveAssignments: false,
  isDeleted: false,
  createdAt: new Date('2024-02-14'),
  statusHistory: [
    { from: '', to: 'Available', changedAt: new Date('2024-02-14'), changedBy: 'System' },
    { from: 'Available', to: 'On Delivery', changedAt: new Date('2024-07-22'), changedBy: 'System' }
  ]
},
    // Sample archived driver
    {
      id: 'D006',
      name: 'John Archived',
      email: 'john@example.com',
      mode: 'Car',
      status: 'Available',
      canReceiveAssignments: false,
      isDeleted: true,
      deletedAt: new Date('2024-07-01'),
      createdAt: new Date('2024-01-01')
    }
  ];

  newDriver: Driver = {
    id: '',
    name: '',
    email: '',
    mode: 'Bicycle',
    status: 'Available',
    canReceiveAssignments: true,
    isDeleted: false,
    createdAt: new Date()
  };

  currentPage = 1;
  itemsPerPage = 10;

  constructor(private notificationService: NotificationService) {}

  // Getters for filtering and pagination
  get filteredDrivers(): Driver[] {
    let filtered = this.drivers.filter(d => {
      // Show only active or archived based on toggle
      if (this.showArchived && !d.isDeleted) return false;
      if (!this.showArchived && d.isDeleted) return false;
      
      // Text search
      const matchesSearch = d.name.toLowerCase().includes(this.search.toLowerCase()) ||
                           d.email.toLowerCase().includes(this.search.toLowerCase());
      
      // Status filter
      const matchesStatus = !this.statusFilter || d.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return filtered;
  }

  get paginatedDrivers(): Driver[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDrivers.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDrivers.length / this.itemsPerPage);
  }

  get allSelected(): boolean {
    const visibleDrivers = this.paginatedDrivers.filter(d => !d.isDeleted);
    return visibleDrivers.length > 0 && visibleDrivers.every(d => this.selectedDriverIds.includes(d.id));
  }

  // Pagination methods
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

  // View toggle
  toggleView() {
    this.showArchived = !this.showArchived;
    this.currentPage = 1;
    this.clearSelection();
  }

  // Selection methods
  toggleAllSelection() {
    const visibleDrivers = this.paginatedDrivers.filter(d => !d.isDeleted);
    if (this.allSelected) {
      this.selectedDriverIds = this.selectedDriverIds.filter(id => 
        !visibleDrivers.some(d => d.id === id)
      );
    } else {
      visibleDrivers.forEach(driver => {
        if (!this.selectedDriverIds.includes(driver.id)) {
          this.selectedDriverIds.push(driver.id);
        }
      });
    }
  }

  toggleDriverSelection(driverId: string) {
    const index = this.selectedDriverIds.indexOf(driverId);
    if (index > -1) {
      this.selectedDriverIds.splice(index, 1);
    } else {
      this.selectedDriverIds.push(driverId);
    }
  }

  clearSelection() {
    this.selectedDriverIds = [];
  }

  // Bulk actions
  bulkStatusChange(newStatus: Driver['status']) {
    const count = this.selectedDriverIds.length;
    this.selectedDriverIds.forEach(id => {
      const driver = this.drivers.find(d => d.id === id);
      if (driver && !driver.isDeleted) {
        this.updateDriverStatus(driver, newStatus);
      }
    });
    this.notificationService.success(`Status updated for ${count} driver(s)`);
    this.clearSelection();
  }

  // Modal management
  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.resetNewDriver();
  }

  openEditModal(driver: Driver) {
    this.editDriver = { ...driver };
    this.showEditModal = true;
  }

  openEditModalFromAction(driver: Driver) {
    this.closeActionModal(); // Close action modal first
    this.openEditModal(driver);
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  openActionModal(driver: Driver) {
    this.selectedDriver = driver;
    this.showActionModal = true;
  }

  closeActionModal() {
    this.selectedDriver = null;
    this.showActionModal = false;
  }

  openStatusModal(driver: Driver) {
    this.selectedDriver = driver;
    this.tempStatus = driver.status;
    this.closeActionModal(); // Close action modal first
    this.showStatusModal = true;
  }

  closeStatusModal() {
    this.showStatusModal = false;
    this.selectedDriver = null;
  }

  openConfirmModal(action: ConfirmAction) {
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
  }

  executeConfirmAction() {
    this.confirmAction.action();
    this.closeConfirmModal();
  }

  // Driver CRUD operations
  saveDriver() {
    if (!this.isValidDriver(this.newDriver)) return;

    const id = 'D' + (this.drivers.length + 1).toString().padStart(3, '0');
    const driver: Driver = {
      ...this.newDriver,
      id,
      createdAt: new Date(),
      canReceiveAssignments: true,
      isDeleted: false,
      statusHistory: [
        { from: '', to: 'Available', changedAt: new Date(), changedBy: 'Admin' }
      ]
    };
    
    this.drivers.push(driver);
    this.notificationService.success(`${driver.name} added as driver`);
    this.closeModal();
  }

  updateDriver() {
    const index = this.drivers.findIndex(d => d.id === this.editDriver.id);
    if (index !== -1) {
      const oldStatus = this.drivers[index].status;
      const newStatus = this.editDriver.status;
      
      // Update driver
      this.drivers[index] = { 
        ...this.editDriver,
        canReceiveAssignments: this.calculateCanReceiveAssignments(newStatus)
      };

      // Add status history if status changed
      if (oldStatus !== newStatus) {
        this.addStatusHistory(this.drivers[index], oldStatus, newStatus);
      }

      this.notificationService.success(`Driver ${this.editDriver.name} updated`);
    }
    this.closeEditModal();
  }

  changeDriverStatus() {
    if (!this.selectedDriver) return;

    const oldStatus = this.selectedDriver.status;
    this.updateDriverStatus(this.selectedDriver, this.tempStatus);
    
    this.notificationService.success(
      `${this.selectedDriver.name} status changed from ${oldStatus} to ${this.tempStatus}`
    );
    this.closeStatusModal();
  }

  suspendDriver(driver: Driver) {
    if (driver.status === 'Suspended') return;
    
    this.updateDriverStatus(driver, 'Suspended');
    this.notificationService.warning(`${driver.name} has been suspended`);
    this.closeActionModal();
  }

  // Soft delete functionality
  confirmDeleteDriver(driver: Driver) {
    this.openConfirmModal({
      title: 'Delete Driver',
      message: `Are you sure you want to delete ${driver.name}? They will be moved to deleted drivers and cannot receive new assignments.`,
      confirmText: 'Delete',
      action: () => this.archiveDriver(driver)
    });
  }

  archiveDriver(driver: Driver) {
    driver.isDeleted = true;
    driver.deletedAt = new Date();
    driver.canReceiveAssignments = false;
    
    this.notificationService.error(`${driver.name} has been deleted`);
    this.closeActionModal();
  }

  restoreDriver(driver: Driver) {
    driver.isDeleted = false;
    driver.deletedAt = undefined;
    driver.canReceiveAssignments = this.calculateCanReceiveAssignments(driver.status);
    
    this.notificationService.success(`${driver.name} has been restored`);
    this.closeActionModal();
  }

  confirmPermanentDelete(driver: Driver) {
    this.openConfirmModal({
      title: 'Permanent Delete',
      message: `⚠️ WARNING: This will permanently delete ${driver.name} and cannot be undone. All their data will be lost.`,
      confirmText: 'Delete Forever',
      action: () => this.permanentlyDeleteDriver(driver)
    });
  }

  permanentlyDeleteDriver(driver: Driver) {
    this.drivers = this.drivers.filter(d => d.id !== driver.id);
    this.notificationService.error(`${driver.name} has been permanently deleted`);
    this.closeActionModal();
  }

  // Status management
  onStatusChange() {
    this.editDriver.canReceiveAssignments = this.calculateCanReceiveAssignments(this.editDriver.status);
  }

  private updateDriverStatus(driver: Driver, newStatus: Driver['status']) {
    const oldStatus = driver.status;
    driver.status = newStatus;
    driver.canReceiveAssignments = this.calculateCanReceiveAssignments(newStatus);
    
    this.addStatusHistory(driver, oldStatus, newStatus);
  }

  private calculateCanReceiveAssignments(status: Driver['status']): boolean {
    return status === 'Available';
  }

  private addStatusHistory(driver: Driver, from: string, to: string) {
    if (!driver.statusHistory) {
      driver.statusHistory = [];
    }
    
    driver.statusHistory.push({
      from,
      to,
      changedAt: new Date(),
      changedBy: 'Admin' // In real app, get from auth service
    });
  }

  private resetNewDriver() {
    this.newDriver = {
      id: '',
      name: '',
      email: '',
      mode: 'Bicycle',
      status: 'Available',
      canReceiveAssignments: true,
      isDeleted: false,
      createdAt: new Date()
    };
  }

  // Utility methods
  isValidDriver(driver: Driver): boolean {
    return !!(driver.name?.trim() && driver.email?.trim() && this.isValidEmail(driver.email));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  getStatusDescription(status: Driver['status']): string {
    const descriptions = {
      'Available': 'Driver can receive new delivery assignments.',
      'On Delivery': 'Driver is currently on a delivery (system managed).',
      'Out Sick': 'Driver is temporarily unavailable due to illness.',
      'On Leave': 'Driver is on scheduled time off.',
      'Suspended': 'Driver account is restricted and cannot receive assignments.'
    };
    return descriptions[status] || '';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}