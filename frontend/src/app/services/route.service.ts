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
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

// Type definitions for Google Maps API
interface GoogleMapsApi {
  maps: {
    DirectionsService: new () => GoogleDirectionsService;
    DirectionsRenderer: new (options?: any) => GoogleDirectionsRenderer;
    LatLng: new (lat: number, lng: number) => GoogleLatLng;
    TravelMode: {
      DRIVING: string;
      WALKING: string;
      BICYCLING: string;
      TRANSIT: string;
    };
    UnitSystem: {
      METRIC: number;
    };
  };
}

interface GoogleLatLng {
  lat(): number;
  lng(): number;
}

interface GoogleDirectionsService {
  route(request: any, callback: (result: any, status: string) => void): void;
}

interface GoogleDirectionsRenderer {
  setMap(map: any): void;
  setDirections(result: any): void;
}

declare const google: GoogleMapsApi;

@Injectable({
  providedIn: 'root'
})
export class RouteService {
  private baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Calculate route using Google Directions API (client-side) - RECOMMENDED METHOD
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

      console.log('🚀 Calculating route with Google Directions API');
      console.log('📍 Origin:', origin);
      console.log('📍 Destination:', destination);
      console.log('🚗 Mode:', mode);

      const directionsService = new google.maps.DirectionsService();
      
      const request = {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode[mode],
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
        optimizeWaypoints: true
      };

      directionsService.route(request, (result: any, status: string) => {
        console.log('📡 Directions API Response Status:', status);
        
        if (status === 'OK' && result.routes && result.routes.length > 0) {
          console.log('✅ Route calculation successful!');
          const route = result.routes[0];
          const leg = route.legs[0];

          // Validate route data
          if (!leg || !leg.steps || leg.steps.length === 0) {
            reject(new Error('Invalid route data received'));
            return;
          }

          // Extract route steps with detailed information
          const steps: RouteStep[] = leg.steps.map((step: any, index: number) => {
            console.log(`Step ${index + 1}:`, {
              instruction: step.instructions,
              distance: step.distance?.text,
              duration: step.duration?.text,
              location: {
                lat: step.end_location.lat(),
                lng: step.end_location.lng()
              }
            });

            return {
              lat: step.end_location.lat(),
              lng: step.end_location.lng(),
              instruction: step.instructions?.replace(/<[^>]*>/g, ''), // Remove HTML tags
              distance: step.distance?.text,
              duration: step.duration?.text,
            };
          });

          // Add starting point as first step
          steps.unshift({
            lat: leg.start_location.lat(),
            lng: leg.start_location.lng(),
            instruction: 'Starting point',
            distance: '0 m',
            duration: '0 mins'
          });

          const routeResult: RouteResult = {
            steps,
            totalDistance: leg.distance?.text || 'Unknown',
            totalDuration: leg.duration?.text || 'Unknown',
            polyline: route.overview_polyline?.points,
            bounds: route.bounds ? {
              northeast: {
                lat: route.bounds.getNorthEast().lat(),
                lng: route.bounds.getNorthEast().lng()
              },
              southwest: {
                lat: route.bounds.getSouthWest().lat(),
                lng: route.bounds.getSouthWest().lng()
              }
            } : undefined
          };

          console.log('🗺 Route result:', {
            totalSteps: routeResult.steps.length,
            totalDistance: routeResult.totalDistance,
            totalDuration: routeResult.totalDuration,
            hasPolyline: !!routeResult.polyline,
            polylineLength: routeResult.polyline?.length
          });

          // Validate polyline
          if (routeResult.polyline) {
            const decodedPoints = this.decodePolyline(routeResult.polyline);
            console.log(`🔍 Polyline validation: ${decodedPoints.length} points decoded`);
            
            if (decodedPoints.length === 0) {
              console.warn('⚠️ Polyline decoding failed');
            }
          }
          
          resolve(routeResult);
        } else {
          console.error('❌ Directions request failed:', status);
          this.handleDirectionsError(status, reject);
        }
      });
    });
  }

  /**
   * Enhanced error handling for Google Directions API
   */
  private handleDirectionsError(status: string, reject: (error: Error) => void): void {
    let errorMessage = `Failed to calculate route: ${status}`;
    
    switch (status) {
      case 'REQUEST_DENIED':
        errorMessage = 'Google Directions API access denied. Please check your API key and ensure the Directions API is enabled in Google Cloud Console.';
        break;
      case 'OVER_QUERY_LIMIT':
        errorMessage = 'Google Directions API quota exceeded. Please check your billing settings and usage limits.';
        break;
      case 'ZERO_RESULTS':
        errorMessage = 'No route found between the specified locations. Please check if the locations are accessible by the selected travel mode.';
        break;
      case 'INVALID_REQUEST':
        errorMessage = 'Invalid request. Please check the origin and destination coordinates are valid.';
        break;
      case 'UNKNOWN_ERROR':
        errorMessage = 'Unknown error occurred with the Directions service. Please try again in a moment.';
        break;
      case 'MAX_WAYPOINTS_EXCEEDED':
        errorMessage = 'Too many waypoints in the request.';
        break;
      case 'NOT_FOUND':
        errorMessage = 'One or more of the locations could not be geocoded.';
        break;
    }
    
    reject(new Error(errorMessage));
  }

  /**
   * Calculate route using backend API (fallback)
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

    console.log('🔄 Trying server-side route calculation:', requestBody);

    return this.http.post<RouteResult>(`${this.baseUrl}/routes/calculate`, requestBody)
      .pipe(
        map((result: RouteResult) => {
          console.log('✅ Server-side route calculation successful:', result);
          return result;
        }),
        catchError((error: any) => {
          console.error('❌ Server-side route calculation failed:', error);
          const errorMessage = error?.message || 'Unknown server error';
          return throwError(() => new Error('Failed to calculate route on server: ' + errorMessage));
        })
      );
  }

  /**
   * Primary method with comprehensive fallback strategy
   */
  async calculateRouteWithFallback(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING'
  ): Promise<RouteResult> {
    // Validate input coordinates
    if (!this.isValidCoordinate(origin) || !this.isValidCoordinate(destination)) {
      throw new Error('Invalid coordinates provided');
    }

    console.log('🎯 Starting route calculation with fallback strategy');

    try {
      // Try client-side first (fastest and most reliable)
      console.log('📱 Attempting client-side route calculation...');
      const result = await this.calculateRouteClientSide(origin, destination, mode);
      console.log('✅ Client-side route calculation successful');
      return result;
    } catch (clientError: unknown) {
      const clientErrorMessage = clientError instanceof Error ? clientError.message : 'Unknown client error';
      console.log('⚠️ Client-side routing failed, trying server-side...', clientErrorMessage);
      
      try {
        // Fallback to server-side
        const serverMode = mode.toLowerCase() as 'driving' | 'walking' | 'bicycling' | 'transit';
        console.log('🖥️ Attempting server-side route calculation...');
        const serverResult = await this.calculateRouteServerSide(origin, destination, serverMode).toPromise();
        console.log('✅ Server-side route calculation successful');
        return serverResult as RouteResult;
      } catch (serverError: unknown) {
        console.error('❌ Both client and server routing failed');
        console.error('Client error:', clientErrorMessage);
        
        const serverErrorMessage = serverError instanceof Error ? serverError.message : 'Unknown server error';
        console.error('Server error:', serverErrorMessage);
        
        // Final fallback: return straight line with warning
        console.log('📏 Using straight-line fallback route');
        return this.createStraightLineRoute(origin, destination);
      }
    }
  }

  /**
   * Create a straight-line route as final fallback
   */
  private createStraightLineRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): RouteResult {
    const distance = this.calculateStraightLineDistance(origin, destination);
    
    return {
      steps: [
        { 
          lat: origin.lat, 
          lng: origin.lng, 
          instruction: 'Starting point',
          distance: '0 km',
          duration: '0 mins'
        },
        { 
          lat: destination.lat, 
          lng: destination.lng, 
          instruction: 'Destination (straight line - actual route unavailable)',
          distance: distance,
          duration: 'Unknown'
        }
      ],
      totalDistance: distance,
      totalDuration: 'Unknown'
    };
  }

  /**
   * Validate coordinate object
   */
  private isValidCoordinate(coord: { lat: number; lng: number }): boolean {
    return !!(coord && 
             typeof coord.lat === 'number' && 
             typeof coord.lng === 'number' && 
             !isNaN(coord.lat) && 
             !isNaN(coord.lng) &&
             Math.abs(coord.lat) <= 90 && 
             Math.abs(coord.lng) <= 180);
  }

  /**
   * Calculate straight-line distance between two points using Haversine formula
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
   * Improved polyline decoder with comprehensive error handling
   */
  decodePolyline(encoded: string): { lat: number; lng: number }[] {
    if (!encoded || encoded.trim() === '') {
      console.warn('⚠️ Empty or invalid polyline string provided');
      return [];
    }
    
    try {
      const poly: { lat: number; lng: number }[] = [];
      let index = 0;
      const len = encoded.length;
      let lat = 0;
      let lng = 0;

      while (index < len) {
        let b: number;
        let shift = 0;
        let result = 0;
        
        // Decode latitude
        do {
          if (index >= len) {
            console.warn('⚠️ Unexpected end of polyline string while decoding latitude');
            break;
          }
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20 && index < len);
        
        const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        
        // Decode longitude
        do {
          if (index >= len) {
            console.warn('⚠️ Unexpected end of polyline string while decoding longitude');
            break;
          }
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20 && index < len);
        
        const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        const decodedLat = lat / 1e5;
        const decodedLng = lng / 1e5;

        // Validate decoded coordinates
        if (Math.abs(decodedLat) <= 90 && Math.abs(decodedLng) <= 180) {
          poly.push({ 
            lat: decodedLat, 
            lng: decodedLng 
          });
        } else {
          console.warn('⚠️ Invalid decoded coordinates:', { lat: decodedLat, lng: decodedLng });
        }
      }

      console.log(`✅ Successfully decoded ${poly.length} polyline points`);
      return poly;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error decoding polyline:', errorMessage);
      return [];
    }
  }

  /**
   * Create a Google Maps DirectionsRenderer for easy route display
   */
  createDirectionsRenderer(options?: {
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    suppressMarkers?: boolean;
  }): any {
    if (!google || !google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    const defaultOptions = {
      strokeColor: '#1976d2',
      strokeWeight: 5,
      strokeOpacity: 0.8,
      suppressMarkers: false,
      preserveViewport: false
    };

    const rendererOptions = { ...defaultOptions, ...options };

    return new google.maps.DirectionsRenderer(rendererOptions);
  }

  /**
   * Display route using DirectionsRenderer (recommended for map display)
   */
  async displayRouteOnMap(
    map: any,
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING',
    rendererOptions?: any
  ): Promise<any> {
    if (!google || !google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = this.createDirectionsRenderer(rendererOptions);
    
    directionsRenderer.setMap(map);

    return new Promise((resolve, reject) => {
      const request = {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode[mode],
        unitSystem: google.maps.UnitSystem.METRIC
      };

      directionsService.route(request, (result: any, status: string) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          console.log('✅ Route displayed on map successfully');
          resolve({
            renderer: directionsRenderer,
            result: result
          });
        } else {
          console.error('❌ Failed to display route on map:', status);
          reject(new Error(`Failed to display route: ${status}`));
        }
      });
    });
  }
}