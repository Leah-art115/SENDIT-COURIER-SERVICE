import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';

  constructor() {}

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;
    
    // TODO: Add token expiration check when you have backend
    return true;
  }

  // Login user (save token and user data)
  login(email: string, password: string): boolean {
    // TODO: Replace with actual API call
    console.log('Login attempt:', { email, password });
    
    // For now, simulate successful login
    const mockToken = 'mock-jwt-token-' + Date.now();
    const mockUser = { email, name: 'User Name' };
    
    localStorage.setItem(this.TOKEN_KEY, mockToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(mockUser));
    
    return true;
  }

  // Register user
  register(userData: any): boolean {
    // TODO: Replace with actual API call
    console.log('Register attempt:', userData);
    
    // For now, simulate successful registration
    const mockToken = 'mock-jwt-token-' + Date.now();
    const mockUser = { 
      email: userData.email, 
      name: userData.fullName 
    };
    
    localStorage.setItem(this.TOKEN_KEY, mockToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(mockUser));
    
    return true;
  }

  // Logout user
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // Get current user
  getCurrentUser(): any {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Reset password (for forgot password flow)
  resetPassword(email: string): boolean {
    // TODO: Replace with actual API call
    console.log('Password reset for:', email);
    return true;
  }
}