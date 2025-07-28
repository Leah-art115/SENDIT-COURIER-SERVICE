import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/notification/notification.service';
import { AdminService } from '../../../services/admin.service';

interface Driver {
  id: number;
  name: string;
  email: string;
  mode: 'BICYCLE' | 'MOTORCYCLE' | 'CAR' | 'SKATES';
  status: 'AVAILABLE' | 'ON_DELIVERY' | 'OUT_SICK' | 'ON_LEAVE' | 'SUSPENDED';
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
  changedBy: string;
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
  styleUrls: ['./admin-drivers.component.css'],
})
export class AdminDriversComponent implements OnInit {
  search = '';
  statusFilter = '';
  showModal = false;
  showEditModal = false;
  showActionModal = false;
  showStatusModal = false;
  showConfirmModal = false;
  showArchived = false;

  selectedDriver: Driver | null = null;
  selectedDriverIds: number[] = [];
  tempStatus: Driver['status'] = 'AVAILABLE';

  confirmAction: ConfirmAction = {
    title: '',
    message: '',
    confirmText: '',
    action: () => {},
  };

  drivers: Driver[] = [];
  newDriver: Driver & { password?: string } = {
    id: 0,
    name: '',
    email: '',
    password: '',
    mode: 'BICYCLE',
    status: 'AVAILABLE',
    canReceiveAssignments: true,
    isDeleted: false,
    createdAt: new Date(),
  };

  editDriver: Driver = {
    id: 0,
    name: '',
    email: '',
    mode: 'BICYCLE',
    status: 'AVAILABLE',
    canReceiveAssignments: true,
    isDeleted: false,
    createdAt: new Date(),
  };

  currentPage = 1;
  itemsPerPage = 10;

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDrivers();
  }

  loadDrivers(): void {
    this.adminService.getAllDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load drivers:', err);
        this.notificationService.error('Failed to load drivers.');
      },
    });
  }

  // Getters for filtering and pagination
  get filteredDrivers(): Driver[] {
    return this.drivers.filter((d) => {
      if (this.showArchived && !d.isDeleted) return false;
      if (!this.showArchived && d.isDeleted) return false;

      const matchesSearch =
        (d.name || '').toLowerCase().includes(this.search.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(this.search.toLowerCase());

      const matchesStatus = !this.statusFilter || d.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  get paginatedDrivers(): Driver[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDrivers.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDrivers.length / this.itemsPerPage);
  }

  get allSelected(): boolean {
    const visibleDrivers = this.paginatedDrivers.filter((d) => !d.isDeleted);
    return visibleDrivers.length > 0 && visibleDrivers.every((d) => this.selectedDriverIds.includes(d.id));
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
    const visibleDrivers = this.paginatedDrivers.filter((d) => !d.isDeleted);
    if (this.allSelected) {
      this.selectedDriverIds = this.selectedDriverIds.filter(
        (id) => !visibleDrivers.some((d) => d.id === id)
      );
    } else {
      visibleDrivers.forEach((driver) => {
        if (!this.selectedDriverIds.includes(driver.id)) {
          this.selectedDriverIds.push(driver.id);
        }
      });
    }
  }

  toggleDriverSelection(driverId: number) {
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
    this.selectedDriverIds.forEach((id) => {
      const driver = this.drivers.find((d) => d.id === id);
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
    this.closeActionModal();
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
    console.log('Opening status modal for driver:', driver);
    this.selectedDriver = driver;
    this.tempStatus = driver.status;
    this.closeActionModal();
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

  // Debug radio button changes
  onTempStatusChange(event: Event) {
    console.log('tempStatus changed to:', this.tempStatus);
  }

  // Driver CRUD operations
  saveDriver() {
    if (!this.isValidDriver(this.newDriver)) {
      this.notificationService.error('Please provide valid driver details.');
      return;
    }

    const dto = {
      name: this.newDriver.name,
      email: this.newDriver.email,
      password: this.newDriver.password!,
      mode: this.newDriver.mode,
    };

    this.adminService.createDriver(dto).subscribe({
      next: (driver) => {
        this.drivers = [
          {
            id: driver.id,
            name: driver.name,
            email: driver.email,
            mode: driver.mode,
            status: driver.status || 'AVAILABLE',
            canReceiveAssignments: driver.status === 'AVAILABLE',
            isDeleted: false,
            createdAt: new Date(driver.createdAt),
            statusHistory: driver.statusHistory || [
              { from: '', to: 'AVAILABLE', changedAt: new Date(), changedBy: 'Admin' },
            ],
          },
          ...this.drivers,
        ];
        this.notificationService.success(`${driver.name} added as driver`);
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to create driver:', err);
        this.notificationService.error(err.error?.message || 'Failed to create driver.');
      },
    });
  }

  updateDriver() {
    if (!this.isValidDriver(this.editDriver)) {
      this.notificationService.error('Please provide valid driver details.');
      return;
    }

    const oldStatus = this.drivers.find((d) => d.id === this.editDriver.id)?.status;
    const dto = {
      name: this.editDriver.name,
      email: this.editDriver.email,
      mode: this.editDriver.mode,
      status: this.editDriver.status,
    };

    this.adminService.updateDriver(this.editDriver.id, dto).subscribe({
      next: (updated) => {
        this.drivers = this.drivers.map((d) =>
          d.id === this.editDriver.id
            ? {
                ...d,
                name: updated.name,
                email: updated.email,
                mode: updated.mode,
                status: updated.status,
                canReceiveAssignments: updated.status === 'AVAILABLE',
                statusHistory:
                  oldStatus !== updated.status
                    ? [
                        ...(d.statusHistory || []),
                        {
                          from: oldStatus || '',
                          to: updated.status,
                          changedAt: new Date(),
                          changedBy: 'Admin',
                        },
                      ]
                    : d.statusHistory,
              }
            : d
        );
        this.cdr.detectChanges();
        this.notificationService.success(`Driver ${this.editDriver.name} updated`);
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Failed to update driver:', err);
        this.notificationService.error(err.error?.message || 'Failed to update driver.');
      },
    });
  }

  changeDriverStatus() {
    console.log('changeDriverStatus called', {
      selectedDriver: this.selectedDriver,
      tempStatus: this.tempStatus,
    });
    if (!this.selectedDriver) {
      console.error('No selected driver');
      this.notificationService.error('No driver selected');
      return;
    }
    if (this.tempStatus === this.selectedDriver.status) {
      console.log('Status unchanged, skipping update');
      this.notificationService.info('Status unchanged');
      this.closeStatusModal();
      return;
    }
    this.adminService.updateDriverStatus(this.selectedDriver.id, this.tempStatus).subscribe({
      next: (updated) => {
        console.log('Status update response:', updated);
        const oldStatus = this.selectedDriver!.status;
        this.drivers = this.drivers.map((d) =>
          d.id === this.selectedDriver!.id
            ? {
                ...d,
                status: updated.status,
                canReceiveAssignments: updated.status === 'AVAILABLE',
                statusHistory: [
                  ...(d.statusHistory || []),
                  {
                    from: oldStatus,
                    to: updated.status,
                    changedAt: new Date(),
                    changedBy: 'Admin',
                  },
                ],
              }
            : d
        );
        this.cdr.detectChanges();
        this.notificationService.success(
          `${this.selectedDriver!.name} status changed from ${this.getStatusDisplayName(oldStatus)} to ${this.getStatusDisplayName(this.tempStatus)}`
        );
        this.closeStatusModal();
      },
      error: (err) => {
        console.error('Failed to change driver status:', err, err.response?.data);
        this.notificationService.error(err.error?.message || 'Failed to change driver status.');
      },
    });
  }

  suspendDriver(driver: Driver) {
    if (driver.status === 'SUSPENDED') return;

    this.adminService.updateDriverStatus(driver.id, 'SUSPENDED').subscribe({
      next: (updated) => {
        this.drivers = this.drivers.map((d) =>
          d.id === driver.id
            ? {
                ...d,
                status: updated.status,
                canReceiveAssignments: false,
                statusHistory: [
                  ...(d.statusHistory || []),
                  {
                    from: driver.status,
                    to: updated.status,
                    changedAt: new Date(),
                    changedBy: 'Admin',
                  },
                ],
              }
            : d
        );
        this.cdr.detectChanges();
        this.notificationService.warning(`${driver.name} has been suspended`);
        this.closeActionModal();
      },
      error: (err) => {
        console.error('Failed to suspend driver:', err);
        this.notificationService.error(err.error?.message || 'Failed to suspend driver.');
      },
    });
  }

  confirmDeleteDriver(driver: Driver) {
    this.openConfirmModal({
      title: 'Delete Driver',
      message: `Are you sure you want to delete ${driver.name}? They will be moved to deleted drivers and cannot receive new assignments.`,
      confirmText: 'Delete',
      action: () => this.archiveDriver(driver),
    });
  }

  archiveDriver(driver: Driver) {
    this.adminService.deleteDriver(driver.id).subscribe({
      next: () => {
        this.drivers = this.drivers.map((d) =>
          d.id === driver.id
            ? {
                ...d,
                isDeleted: true,
                deletedAt: new Date(),
                canReceiveAssignments: false,
              }
            : d
        );
        this.cdr.detectChanges();
        this.notificationService.error(`${driver.name} has been deleted`);
        this.closeActionModal();
      },
      error: (err) => {
        console.error('Failed to delete driver:', err);
        this.notificationService.error(err.error?.message || 'Failed to delete driver.');
      },
    });
  }

  restoreDriver(driver: Driver) {
    this.adminService.restoreDriver(driver.id).subscribe({
      next: (updated) => {
        this.drivers = this.drivers.map((d) =>
          d.id === driver.id
            ? {
                ...d,
                isDeleted: false,
                deletedAt: undefined,
                canReceiveAssignments: updated.status === 'AVAILABLE',
                status: updated.status,
              }
            : d
        );
        this.cdr.detectChanges();
        this.notificationService.success(`${driver.name} has been restored`);
        this.closeActionModal();
      },
      error: (err) => {
        console.error('Failed to restore driver:', err);
        this.notificationService.error(err.error?.message || 'Failed to restore driver.');
      },
    });
  }

  confirmPermanentDelete(driver: Driver) {
    this.openConfirmModal({
      title: 'Permanent Delete',
      message: `⚠️ WARNING: This will permanently delete ${driver.name} and cannot be undone. All their data will be lost.`,
      confirmText: 'Delete Forever',
      action: () => this.permanentlyDeleteDriver(driver),
    });
  }

  permanentlyDeleteDriver(driver: Driver) {
    this.adminService.permanentlyDeleteDriver(driver.id).subscribe({
      next: () => {
        this.drivers = this.drivers.filter((d) => d.id !== driver.id);
        this.cdr.detectChanges();
        this.notificationService.error(`${driver.name} has been permanently deleted`);
        this.closeActionModal();
      },
      error: (err) => {
        console.error('Failed to permanently delete driver:', err);
        this.notificationService.error(err.error?.message || 'Failed to permanently delete driver.');
      },
    });
  }

  // Status management
  onStatusChange() {
    this.editDriver.canReceiveAssignments = this.calculateCanReceiveAssignments(this.editDriver.status);
  }

  private updateDriverStatus(driver: Driver, newStatus: Driver['status']) {
    this.adminService.updateDriverStatus(driver.id, newStatus).subscribe({
      next: (updated) => {
        this.drivers = this.drivers.map((d) =>
          d.id === driver.id
            ? {
                ...d,
                status: updated.status,
                canReceiveAssignments: updated.status === 'AVAILABLE',
                statusHistory: [
                  ...(d.statusHistory || []),
                  {
                    from: driver.status,
                    to: updated.status,
                    changedAt: new Date(),
                    changedBy: 'Admin',
                  },
                ],
              }
            : d
        );
        this.cdr.detectChanges();
        this.notificationService.success(`${driver.name} status updated to ${this.getStatusDisplayName(newStatus)}`);
      },
      error: (err) => {
        console.error('Failed to update driver status:', err);
        this.notificationService.error(err.error?.message || 'Failed to update driver status.');
      },
    });
  }

  private calculateCanReceiveAssignments(status: Driver['status']): boolean {
    return status === 'AVAILABLE';
  }

  private resetNewDriver() {
    this.newDriver = {
      id: 0,
      name: '',
      email: '',
      password: '',
      mode: 'BICYCLE',
      status: 'AVAILABLE',
      canReceiveAssignments: true,
      isDeleted: false,
      createdAt: new Date(),
    };
  }

  // Utility methods
  isValidDriver(driver: Driver & { password?: string }): boolean {
    return !!(
      driver.name?.trim() &&
      driver.email?.trim() &&
      this.isValidEmail(driver.email) &&
      (driver.password?.trim() || !this.showModal)
    );
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  getStatusDisplayName(status: Driver['status']): string {
    const statusDisplayNames = {
      AVAILABLE: 'Available',
      ON_DELIVERY: 'On Delivery',
      OUT_SICK: 'Out Sick',
      ON_LEAVE: 'On Leave',
      SUSPENDED: 'Suspended',
    };
    return statusDisplayNames[status] || status;
  }

  getStatusDescription(status: Driver['status']): string {
    const descriptions = {
      AVAILABLE: 'Driver can receive new delivery assignments.',
      ON_DELIVERY: 'Driver is currently on a delivery (system managed).',
      OUT_SICK: 'Driver is temporarily unavailable due to illness.',
      ON_LEAVE: 'Driver is on scheduled time off.',
      SUSPENDED: 'Driver account is restricted and cannot receive assignments.',
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
      minute: '2-digit',
    }).format(date);
  }
}