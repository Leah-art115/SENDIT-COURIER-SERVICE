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
    const token = localStorage.getItem(this.TOKEN_KEY);
    return !!token;
  }

  login(email: string, password: string): Observable<boolean> {
    return this.http.post<{ access_token: string; user: User }>(`${this.BASE_URL}/login`, { email, password }).pipe(
      tap(response => {
        // Store token and user data
        localStorage.setItem(this.TOKEN_KEY, response.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));

        console.log('User logged in successfully:', response.user.role);

        // Redirect based on role
        const role = response.user.role;
        if (role === 'ADMIN') {
          console.log('Redirecting admin to dashboard');
          this.router.navigate(['/admin/dashboard']);
        } else if (role === 'DRIVER') {
          console.log('Redirecting driver to dashboard');
          this.router.navigate(['/driver/dashboard']);
        } else {
          console.log('Redirecting user to home page');
          this.router.navigate(['/']);
        }
      }),
      map(() => true),
      catchError((error) => {
        console.error('Login failed:', error);
        return of(false);
      })
    );
  }

  register(userData: { name: string; email: string; phone: string; password: string }): Observable<boolean> {
    return this.http.post<{ message: string }>(`${this.BASE_URL}/register`, userData).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Registration failed:', error);
        return of(false);
      })
    );
  }

  logout(): void {
    console.log('Logging out user...');
    
    // Clear storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    console.log('User data cleared, redirecting to home');
    
    // Always redirect to home page
    this.router.navigate(['/']);
  }

  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) as User : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserInitials(): string {
    const user = this.getCurrentUser();
    if (!user?.name) return '👤';
    
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2); // Limit to 2 characters
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

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.BASE_URL}/me`).pipe(
      tap(user => {
        // Update localStorage with fresh user data
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }),
      catchError((error) => {
        console.error('Error fetching user profile:', error);
        // If token is invalid, logout user
        if (error.status === 401 || error.status === 403) {
          console.log('Invalid token, logging out...');
          this.logout();
        }
        throw error;
      })
    );
  }
}