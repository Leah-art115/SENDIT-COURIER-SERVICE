import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RouteStep {
  lat: number;
  lng: number;
  instruction?: string;
  distance?: string;
  duration?: string;
}

export interface RouteResult {
  steps: RouteStep[];
  totalDistance: string;
  totalDuration: string;
  polyline?: string;
}

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class RouteService {
  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Calculate route using Google Directions API (client-side)
   * This method uses the Google Maps JavaScript API directly in the browser
   */
  async calculateRouteClientSide(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING'
  ): Promise<RouteResult> {
    return new Promise((resolve, reject) => {
      if (!google || !google.maps) {
        reject(new Error('Google Maps API not loaded'));
        return;
      }

      console.log('🚀 Attempting to calculate route with Google Directions API');
      console.log('📍 Origin:', origin);
      console.log('📍 Destination:', destination);
      console.log('🚗 Mode:', mode);

      const directionsService = new google.maps.DirectionsService();
      
      const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode[mode],
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      };

      directionsService.route(request, (result: any, status: any) => {
        console.log('📡 Directions API Response Status:', status);
        
        if (status === 'OK' && result.routes && result.routes.length > 0) {
          console.log('✅ Route calculation successful!');
          const route = result.routes[0];
          const leg = route.legs[0];

          // Extract route steps
          const steps: RouteStep[] = leg.steps.map((step: any) => ({
            lat: step.end_location.lat(),
            lng: step.end_location.lng(),
            instruction: step.instructions?.replace(/<[^>]*>/g, ''), // Remove HTML tags
            distance: step.distance?.text,
            duration: step.duration?.text,
          }));

          // Add starting point
          steps.unshift({
            lat: leg.start_location.lat(),
            lng: leg.start_location.lng(),
            instruction: 'Starting point',
          });

          const routeResult = {
            steps,
            totalDistance: leg.distance?.text || 'Unknown',
            totalDuration: leg.duration?.text || 'Unknown',
            polyline: route.overview_polyline ? route.overview_polyline.points : undefined,
          };

          console.log('🗺️ Route result:', routeResult);
          console.log('📊 Total steps:', steps.length);
          
          resolve(routeResult);
        } else {
          console.error('❌ Directions request failed:', status);
          
          // Provide specific error messages based on status
          let errorMessage = `Failed to calculate route: ${status}`;
          switch (status) {
            case 'REQUEST_DENIED':
              errorMessage = 'Google Directions API access denied. Please check your API key and make sure Directions API is enabled.';
              break;
            case 'OVER_QUERY_LIMIT':
              errorMessage = 'Google Directions API quota exceeded. Please check your billing settings.';
              break;
            case 'ZERO_RESULTS':
              errorMessage = 'No route found between the specified locations.';
              break;
            case 'INVALID_REQUEST':
              errorMessage = 'Invalid request. Please check the origin and destination coordinates.';
              break;
          }
          
          reject(new Error(errorMessage));
        }
      });
    });
  }

  /**
   * Calculate route using backend API
   * This method calls your NestJS backend which uses the enhanced geocode.ts
   */
  calculateRouteServerSide(
    origin: { lat: number; lng: number } | string,
    destination: { lat: number; lng: number } | string,
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
  ): Observable<RouteResult> {
    const requestBody = {
      origin,
      destination,
      mode
    };

    return this.http.post<RouteResult>(`${this.baseUrl}/routes/calculate`, requestBody)
      .pipe(
        catchError(error => {
          console.error('Server-side route calculation failed:', error);
          return throwError(() => new Error('Failed to calculate route on server'));
        })
      );
  }

  /**
   * Fallback method that tries client-side first, then server-side
   */
  async calculateRouteWithFallback(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING'
  ): Promise<RouteResult> {
    try {
      // Try client-side first (faster, no server call)
      return await this.calculateRouteClientSide(origin, destination, mode);
    } catch (clientError) {
      console.log('Client-side routing failed, trying server-side...', clientError);
      
      try {
        // Fallback to server-side
        const serverMode = mode.toLowerCase() as 'driving' | 'walking' | 'bicycling' | 'transit';
        return await this.calculateRouteServerSide(origin, destination, serverMode).toPromise() as RouteResult;
      } catch (serverError) {
        console.error('Both client and server routing failed');
        
        // Final fallback: return straight line
        return {
          steps: [
            { lat: origin.lat, lng: origin.lng, instruction: 'Starting point' },
            { lat: destination.lat, lng: destination.lng, instruction: 'Destination' }
          ],
          totalDistance: this.calculateStraightLineDistance(origin, destination),
          totalDuration: 'Unknown'
        };
      }
    }
  }

  /**
   * Calculate straight-line distance between two points (fallback)
   */
  private calculateStraightLineDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): string {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(destination.lat - origin.lat);
    const dLng = this.toRadians(destination.lng - origin.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(origin.lat)) * Math.cos(this.toRadians(destination.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return `${distance.toFixed(2)} km`;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Decode Google's encoded polyline string into coordinate array
   */
  decodePolyline(encoded: string): { lat: number; lng: number }[] {
    if (!encoded) return [];
    
    const poly: { lat: number; lng: number }[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return poly;
  }
}