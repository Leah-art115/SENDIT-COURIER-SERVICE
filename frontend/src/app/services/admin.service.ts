import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // Parcel Operations
  createParcel(dto: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/parcels`, dto, {
      headers: this.getAuthHeaders(),
    });
  }

  getAllParcels(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/parcels`, {
      headers: this.getAuthHeaders(),
    });
  }

  assignDriver(parcelId: string, driverId: string): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/parcels/${parcelId}/assign-driver`,
      { driverId: parseInt(driverId) },
      { headers: this.getAuthHeaders() }
    );
  }

  unassignDriver(parcelId: string): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/parcels/${parcelId}/unassign-driver`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Driver Operations
  getAllDrivers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/drivers`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      map(drivers =>
        drivers.map(driver => ({
          id: driver.id,
          name: driver.name,
          email: driver.email,
          mode: driver.mode,
          status: driver.status,
          canReceiveAssignments: driver.canReceiveAssignments,
          isDeleted: !!driver.deletedAt,
          deletedAt: driver.deletedAt ? new Date(driver.deletedAt) : undefined,
          createdAt: new Date(driver.createdAt),
          statusHistory: driver.statusHistory
            ? driver.statusHistory.map((h: any) => ({
                from: h.from,
                to: h.to,
                changedAt: new Date(h.changedAt),
                changedBy: h.changedBy,
              }))
            : undefined,
        }))
      )
    );
  }

  getAvailableDrivers(): Observable<{ id: string; name: string }[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/drivers/available`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      map(drivers =>
        drivers.map(driver => ({
          id: driver.id.toString(),
          name: driver.name,
        }))
      )
    );
  }

  createDriver(dto: { name: string; email: string; password: string; mode: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/create-driver`, dto, {
      headers: this.getAuthHeaders(),
    });
  }

  updateDriver(id: number, dto: { name?: string; email?: string; mode?: string; status?: string }): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/driver/${id}`, dto, {
      headers: this.getAuthHeaders(),
    });
  }

  updateDriverStatus(id: number, status: string): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/admin/driver/${id}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  deleteDriver(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/driver/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  restoreDriver(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/driver/${id}/restore`, {}, {
      headers: this.getAuthHeaders(),
    });
  }

  permanentlyDeleteDriver(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/driver/${id}/permanent`, {
      headers: this.getAuthHeaders(),
    });
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/auth/users`, {
      headers: this.getAuthHeaders(),
    });
  }

  permanentlyDeleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/auth/users/${id}/permanent`, {
      headers: this.getAuthHeaders(),
    });
  }

  // FIXED: Admin Dashboard Metrics with totalDrivers support
  getDashboardMetrics(): Observable<{
    totalEarnings: number;
    totalUsers: number;
    totalDrivers: number; // Added totalDrivers
    parcelsInTransit: number;
    parcelsDelivered: number;
    recentParcels: {
      trackingId: string;
      senderName: string;
      receiverName: string;
      status: string;
      updatedAt: string;
    }[];
  }> {
    return this.http.get<{
      totalEarnings: number;
      totalUsers: number;
      totalDrivers: number;
      parcelsInTransit: number;
      parcelsDelivered: number;
      recentParcels: {
        trackingId: string;
        senderName: string;
        receiverName: string;
        status: string;
        updatedAt: string;
      }[];
    }>(`${this.baseUrl}/parcels/dashboard/metrics`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Add a separate method for polling if you want auto-refresh
  getDashboardMetricsWithPolling(): Observable<{
    totalEarnings: number;
    totalUsers: number;
    totalDrivers: number;
    parcelsInTransit: number;
    parcelsDelivered: number;
    recentParcels: {
      trackingId: string;
      senderName: string;
      receiverName: string;
      status: string;
      updatedAt: string;
    }[];
  }> {
    return interval(5000).pipe(
      switchMap(() => this.getDashboardMetrics())
    );
  }

  resendEmails(parcelId: string, emailType: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/emails/resend/${parcelId}`, 
      { emailType }, 
      { headers: this.getAuthHeaders() }
    );
  }

  // Get email logs
  getEmailLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/emails/logs`, {
      headers: this.getAuthHeaders(),
    });
  }
}