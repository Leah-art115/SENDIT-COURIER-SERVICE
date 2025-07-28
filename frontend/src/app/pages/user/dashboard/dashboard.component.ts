import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { UserService, UserProfile } from '../../../services/user.service'; // Adjusted path
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment'; // Adjusted path
import { Observable, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

interface Parcel {
  id: string;
  trackingId: string;
  type: string;
  sentAt: string;
  status: string;
  senderEmail: string;
  receiverEmail: string;
}

interface Activity {
  id: string;
  type: 'Sent' | 'Received';
  date: string;
  status: string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, UserNavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  userName: string = '';
  totalSent: number = 0;
  totalReceived: number = 0;
  inTransit: number = 0;
  recentActivities: Activity[] = [];

  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(private userService: UserService, private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadParcels();
  }

  private loadUserData(): void {
    this.userService.getUserProfile().subscribe({
      next: (profile: UserProfile) => {
        this.userName = profile.name;
      },
      error: (error: unknown) => {
        console.error('Failed to load user profile:', error);
      }
    });
  }

  private loadParcels(): void {
    this.userService.getUserProfile().pipe(
      switchMap((profile: UserProfile) => {
        const userEmail = profile.email;
        const sentParcels$ = this.http.get<Parcel[]>(`${this.baseUrl}/user/sent-parcels`, { headers: this.getAuthHeaders() });
        const receivedParcels$ = this.http.get<Parcel[]>(`${this.baseUrl}/user/received-parcels`, { headers: this.getAuthHeaders() });

        return forkJoin([sentParcels$, receivedParcels$]).pipe(
          map(([sentParcels, receivedParcels]) => ({ sentParcels, receivedParcels, userEmail }))
        );
      }),
      catchError((error: unknown) => {
        console.error('Failed to load parcels:', error);
        throw error;
      })
    ).subscribe({
      next: ({ sentParcels, receivedParcels, userEmail }) => {
        this.totalSent = sentParcels.length;
        this.totalReceived = receivedParcels.length;
        this.inTransit = [...sentParcels, ...receivedParcels].filter(parcel => parcel.status === 'IN_TRANSIT').length;

        this.recentActivities = [...sentParcels, ...receivedParcels]
          .map(parcel => ({
            id: parcel.trackingId,
            type: parcel.senderEmail === userEmail ? 'Sent' as const : 'Received' as const,
            date: new Date(parcel.sentAt).toISOString().split('T')[0],
            status: parcel.status
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 8);
      },
      error: (error: unknown) => {
        console.error('Failed to process parcels:', error);
      }
    });
  }
}