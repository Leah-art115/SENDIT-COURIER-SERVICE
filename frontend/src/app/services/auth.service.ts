import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  email: string;
  name: string;
  phone?: string;
  role: 'ADMIN' | 'USER' | 'DRIVER';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  private readonly BASE_URL = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient, private router: Router) {}

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  login(email: string, password: string): Observable<boolean> {
    return this.http.post<{ access_token: string; user: User }>(`${this.BASE_URL}/login`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));

        console.log('User logged in with role:', response.user.role);

        // Always redirect to home page after successful login
        console.log('Redirecting to home page after successful login');
        this.router.navigate(['/']);
      }),
      map(() => true),
      catchError((error) => {
        console.error('Login error:', error);
        return of(false);
      })
    );
  }

  register(userData: { name: string; email: string; phone: string; password: string }): Observable<boolean> {
    return this.http.post<{ message: string }>(`${this.BASE_URL}/register`, userData).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Registration error:', error);
        return of(false);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/']);
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) as User : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserInitials(): string {
    const user = this.getCurrentUser();
    return user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '👤';
  }

  getUserFirstName(): string {
    const user = this.getCurrentUser();
    return user?.name?.split(' ')[0] || '';
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'ADMIN';
  }

  isDriver(): boolean {
    return this.getCurrentUser()?.role === 'DRIVER';
  }

  isUser(): boolean {
    return this.getCurrentUser()?.role === 'USER';
  }
}