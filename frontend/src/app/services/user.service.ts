import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt?: string;
}

export interface UpdateProfileData {
  name: string;
  email: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  getUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/auth/me`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch user profile'));
      })
    );
  }

  updateProfile(profileData: UpdateProfileData): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.baseUrl}/auth/profile`, profileData, {
      headers: this.getAuthHeaders(),
    }).pipe(
      catchError(error => {
        console.error('Error updating user profile:', error);
        return throwError(() => new Error(error.message || 'Failed to update profile'));
      })
    );
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/request-password-reset`, { email }, {
      headers: this.getAuthHeaders(),
    }).pipe(
      catchError(error => {
        console.error('Error requesting password reset:', error);
        return throwError(() => new Error(error.message || 'Failed to request password reset'));
      })
    );
  }

  changePassword(otp: string, newPassword: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/auth/change-password`, {
      otp,
      newPassword,
    }, {
      headers: this.getAuthHeaders(),
    }).pipe(
      catchError(error => {
        console.error('Error changing password:', error);
        return throwError(() => new Error(error.message || 'Failed to change password'));
      })
    );
  }
}
