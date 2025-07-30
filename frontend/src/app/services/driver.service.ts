import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Parcel {
  id: string;
  trackingId: string;
  senderName: string;
  receiverName: string;
  from: string;
  to: string;
  status: string;
  sentAt: string;
  pickedAt?: string;
  deliveredAt?: string;
  updatedAt: string;
  price: number;
  weight: number;
  type: string;
  mode: string;
  description?: string;
  fromLat?: number;
  fromLng?: number;
  currentLat?: number;
  currentLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}

export interface LocationUpdateResponse {
  status: string | null;
  message?: string;
}

export interface DriverProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  mode?: string;
  status?: string;
  createdAt?: string;
}

// NEW: Driver Dashboard Metrics Interface
export interface DriverDashboardMetrics {
  totalDeliveries: number;
  inTransit: number;
  completed: number;
  recentDeliveries: {
    trackingId: string;
    recipient: string;
    status: string;
    date: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class DriverService {
  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  getDriverProfile(): Observable<DriverProfile> {
    return this.http.get<DriverProfile>(`${this.baseUrl}/auth/me`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      catchError(error => {
        console.error('Error fetching driver profile:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch driver profile'));
      })
    );
  }

  // NEW: Get driver dashboard metrics
  getDriverDashboardMetrics(): Observable<DriverDashboardMetrics> {
    return this.http.get<DriverDashboardMetrics>(`${this.baseUrl}/driver/dashboard/metrics`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      catchError(error => {
        console.error('Error fetching driver dashboard metrics:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch dashboard metrics'));
      })
    );
  }

  markPickedUp(parcelId: string) {
    return this.http.patch(`${this.baseUrl}/driver/mark-picked-up/${parcelId}`, {}, {
      headers: this.getAuthHeaders(),
    });
  }

  getMyParcels(): Observable<Parcel[]> {
    // FIXED: Use the new dedicated endpoint for driver parcels
    return this.http.get<Parcel[]>(`${this.baseUrl}/driver/my-parcels`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      map(parcels => parcels.map(parcel => ({
        ...parcel,
        pickedAt: parcel.pickedAt ? new Date(parcel.pickedAt).toISOString() : undefined,
        deliveredAt: parcel.deliveredAt ? new Date(parcel.deliveredAt).toISOString() : undefined,
        updatedAt: new Date(parcel.updatedAt).toISOString(),
      }))),
      catchError(error => {
        console.error('Error fetching driver parcels:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch parcels'));
      })
    );
  }

  markParcelPickedUp(parcelId: string): Observable<Parcel> {
    return this.http.patch<Parcel>(`${this.baseUrl}/driver/mark-picked-up/${parcelId}`, {}, {
      headers: this.getAuthHeaders(),
    }).pipe(
      map(parcel => ({
        ...parcel,
        pickedAt: parcel.pickedAt ? new Date(parcel.pickedAt).toISOString() : undefined,
        deliveredAt: parcel.deliveredAt ? new Date(parcel.deliveredAt).toISOString() : undefined,
        updatedAt: new Date(parcel.updatedAt).toISOString(),
      })),
      catchError(error => {
        console.error('Error marking parcel as picked up:', error);
        return throwError(() => new Error(error.message || 'Failed to mark parcel as picked up'));
      })
    );
  }

  updateLocation(parcelId: string, location: string): Observable<LocationUpdateResponse> {
    return this.http.patch<LocationUpdateResponse>(`${this.baseUrl}/driver/location/${parcelId}`, { location }, {
      headers: this.getAuthHeaders(),
    }).pipe(
      catchError(error => {
        console.error('Error updating driver location:', error);
        return throwError(() => new Error(error.message || 'Failed to update location'));
      })
    );
  }

  getParcelById(parcelId: string): Observable<Parcel> {
    return this.http.get<Parcel>(`${this.baseUrl}/parcels/${parcelId}`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      map(parcel => ({
        ...parcel,
        pickedAt: parcel.pickedAt ? new Date(parcel.pickedAt).toISOString() : undefined,
        deliveredAt: parcel.deliveredAt ? new Date(parcel.deliveredAt).toISOString() : undefined,
        updatedAt: new Date(parcel.updatedAt).toISOString(),
      })),
      catchError(error => {
        console.error('Error fetching parcel by ID:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch parcel'));
      })
    );
  }
}