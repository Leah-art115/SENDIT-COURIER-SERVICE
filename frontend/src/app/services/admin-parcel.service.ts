import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminParcelService {
  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

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

  getAvailableDrivers(): Observable<{ id: string; name: string }[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/drivers/available`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      map(drivers => drivers.map(driver => ({
        id: driver.id.toString(),
        name: driver.name,
      })))
    );
  }

  assignDriver(parcelId: string, driverId: string): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/parcels/${parcelId}/assign-driver`,
      { driverId: parseInt(driverId) }, // Convert to number
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
}