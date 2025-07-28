import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Parcel } from './driver.service'; // Import Parcel interface from driver.service.ts

@Injectable({
  providedIn: 'root',
})
export class ParcelService {
  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  createParcel(dto: any): Observable<Parcel> {
    return this.http.post<Parcel>(`${this.baseUrl}/parcels`, dto, {
      headers: this.getAuthHeaders(),
    }).pipe(
      catchError(this.handleError),
    );
  }

  getAllParcels(): Observable<Parcel[]> {
    return this.http.get<Parcel[]>(`${this.baseUrl}/parcels`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      map(parcels =>
        parcels.map(parcel => ({
          ...parcel,
          pickedAt: parcel.pickedAt ? new Date(parcel.pickedAt).toISOString() : undefined,
          deliveredAt: parcel.deliveredAt ? new Date(parcel.deliveredAt).toISOString() : undefined,
          updatedAt: new Date(parcel.updatedAt).toISOString(),
        })),
      ),
      catchError(this.handleError),
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
      catchError(this.handleError),
    );
  }

  getParcelByTrackingId(trackingId: string): Observable<Parcel> {
    return this.http.get<Parcel>(`${this.baseUrl}/parcels/tracking/${trackingId}`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      map(parcel => ({
        ...parcel,
        pickedAt: parcel.pickedAt ? new Date(parcel.pickedAt).toISOString() : undefined,
        deliveredAt: parcel.deliveredAt ? new Date(parcel.deliveredAt).toISOString() : undefined,
        updatedAt: new Date(parcel.updatedAt).toISOString(),
      })),
      catchError(this.handleError),
    );
  }

  assignDriver(parcelId: string, driverId: number): Observable<Parcel> {
    return this.http.patch<Parcel>(
      `${this.baseUrl}/parcels/${parcelId}/assign-driver`,
      { driverId },
      { headers: this.getAuthHeaders() },
    ).pipe(
      map(parcel => ({
        ...parcel,
        pickedAt: parcel.pickedAt ? new Date(parcel.pickedAt).toISOString() : undefined,
        deliveredAt: parcel.deliveredAt ? new Date(parcel.deliveredAt).toISOString() : undefined,
        updatedAt: new Date(parcel.updatedAt).toISOString(),
      })),
      catchError(this.handleError),
    );
  }

  unassignDriver(parcelId: string): Observable<Parcel> {
    return this.http.patch<Parcel>(
      `${this.baseUrl}/parcels/${parcelId}/unassign-driver`,
      {},
      { headers: this.getAuthHeaders() },
    ).pipe(
      map(parcel => ({
        ...parcel,
        pickedAt: parcel.pickedAt ? new Date(parcel.pickedAt).toISOString() : undefined,
        deliveredAt: parcel.deliveredAt ? new Date(parcel.deliveredAt).toISOString() : undefined,
        updatedAt: new Date(parcel.updatedAt).toISOString(),
      })),
      catchError(this.handleError),
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  sendManualDeliveryNotification(parcelId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/parcels/${parcelId}/notify-delivery`, {}, {
      headers: this.getAuthHeaders(),
    }).pipe(catchError(this.handleError));
  }

  sendManualLocationNotification(parcelId: string, location: string, message?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/parcels/${parcelId}/notify-location`, 
      { location, message }, 
      { headers: this.getAuthHeaders() }
    ).pipe(catchError(this.handleError));
  }
}