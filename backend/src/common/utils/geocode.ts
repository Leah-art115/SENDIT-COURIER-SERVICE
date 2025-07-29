/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from 'axios';

/**
 * Enhanced geocoding function with comprehensive error handling and fallbacks
 */
export async function geocodeLocation(
  location: string,
): Promise<{ lat: number; lng: number }> {
  if (!location || location.trim() === '') {
    throw new Error('Location is empty or invalid');
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Check if API key exists
  if (!apiKey) {
    console.error('❌ Google Maps API key is not configured');
    throw new Error('Google Maps API key is not configured');
  }

  // Enhance location with Kenya context if not already present
  const fullLocation = location.toLowerCase().includes('kenya')
    ? location
    : `${location}, Kenya`;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullLocation)}&key=${apiKey}`;

  try {
    console.log(`🔍 Attempting to geocode: "${fullLocation}"`);
    console.log(`📡 API URL: ${url.replace(apiKey, 'HIDDEN_API_KEY')}`);

    const response = await axios.get(url, {
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'DeliveryApp/1.0',
        Accept: 'application/json',
      },
    });

    console.log('📊 Geocoding API response status:', response.data.status);
    console.log(
      '📋 Geocoding API response:',
      JSON.stringify(response.data, null, 2),
    );

    // Handle different API response statuses
    if (response.data.status === 'REQUEST_DENIED') {
      const errorMsg =
        response.data.error_message ||
        'API key invalid or restrictions applied';
      console.error('❌ Request denied:', errorMsg);
      throw new Error(
        `Google Maps API request denied. ${errorMsg}. Please check your API key, billing setup, and API restrictions.`,
      );
    }

    if (response.data.status === 'OVER_QUERY_LIMIT') {
      console.error('❌ API quota exceeded');
      throw new Error(
        'Google Maps API quota exceeded. Please check your billing and usage limits.',
      );
    }

    if (response.data.status === 'ZERO_RESULTS') {
      console.warn(`⚠️ No results found for: "${fullLocation}"`);

      // Try alternative location formats for Kenya
      const alternatives = [
        location, // Original without Kenya
        `${location}, Nairobi, Kenya`,
        `${location}, Nairobi County, Kenya`,
        `${location}, Mombasa, Kenya`,
        `${location}, Kisumu, Kenya`,
        `${location} Kenya`, // Space instead of comma
      ];

      for (const altLocation of alternatives) {
        if (altLocation === fullLocation) continue; // Skip if same as already tried

        console.log(`🔄 Trying alternative location: "${altLocation}"`);

        try {
          const altUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(altLocation)}&key=${apiKey}`;
          const altResponse = await axios.get(altUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'DeliveryApp/1.0',
              Accept: 'application/json',
            },
          });

          if (
            altResponse.data.status === 'OK' &&
            altResponse.data.results &&
            altResponse.data.results.length > 0
          ) {
            const result = altResponse.data.results[0];
            console.log(
              `✅ Successfully geocoded with alternative: "${altLocation}"`,
            );
            console.log('📍 Result:', {
              formatted_address: result.formatted_address,
              location: result.geometry.location,
            });

            return {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng,
            };
          }
        } catch (altError) {
          console.log(
            `⚠️ Alternative "${altLocation}" also failed:`,
            altError.message,
          );
        }
      }

      throw new Error(
        `No geocoding results found for location: "${fullLocation}" or any of its alternatives`,
      );
    }

    if (response.data.status === 'INVALID_REQUEST') {
      throw new Error(
        'Invalid geocoding request. Please check the location format.',
      );
    }

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding failed with status: ${response.data.status}`);
    }

    if (!response.data.results || response.data.results.length === 0) {
      throw new Error(`No geocoding results for location: "${fullLocation}"`);
    }

    const result = response.data.results[0];

    // Validate that we got valid geometry data
    if (!result.geometry || !result.geometry.location) {
      throw new Error('Invalid geocoding response: missing geometry data');
    }

    const lat = result.geometry.location.lat;
    const lng = result.geometry.location.lng;

    // Validate coordinate values
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error(
        'Invalid geocoding response: coordinates are not numbers',
      );
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new Error(
        `Invalid geocoding response: coordinates out of valid range (${lat}, ${lng})`,
      );
    }

    console.log(
      `✅ Successfully geocoded "${fullLocation}" to: (${lat}, ${lng})`,
    );
    console.log(`📍 Formatted address: ${result.formatted_address}`);

    return { lat, lng };
  } catch (error) {
    console.error(`❌ Geocoding failed for location: "${fullLocation}"`);

    if (error.response) {
      console.error('🌐 HTTP Status:', error.response.status);
      console.error('📋 Response data:', error.response.data);
      console.error('📋 Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('📡 No response received:', error.request);
    } else {
      console.error('⚙️ Error details:', error.message);
    }

    // Re-throw with enhanced error message
    throw new Error(
      `Failed to geocode location "${fullLocation}": ${error.message || 'Unknown error'}`,
    );
  }
}

/**
 * Alternative geocoding function using OpenStreetMap Nominatim (free alternative)
 */
export async function geocodeLocationWithNominatim(
  location: string,
): Promise<{ lat: number; lng: number }> {
  if (!location || location.trim() === '') {
    throw new Error('Location is empty or invalid');
  }

  const fullLocation = location.toLowerCase().includes('kenya')
    ? location
    : `${location}, Kenya`;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullLocation)}&limit=1&addressdetails=1`;

  try {
    console.log(`🌍 Attempting to geocode with Nominatim: "${fullLocation}"`);

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'DeliveryApp/1.0 (contact@yourapp.com)', // Required by Nominatim
        Accept: 'application/json',
      },
    });

    console.log('📊 Nominatim response:', response.data);

    if (!response.data || response.data.length === 0) {
      // Try alternatives for Nominatim as well
      const alternatives = [
        location,
        `${location}, Nairobi, Kenya`,
        `${location}, Kenya`,
      ];

      for (const altLocation of alternatives) {
        if (altLocation === fullLocation) continue;

        console.log(`🔄 Trying Nominatim alternative: "${altLocation}"`);

        try {
          const altUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(altLocation)}&limit=1`;
          const altResponse = await axios.get(altUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'DeliveryApp/1.0 (contact@yourapp.com)',
              Accept: 'application/json',
            },
          });

          if (altResponse.data && altResponse.data.length > 0) {
            const altResult = altResponse.data[0];
            const lat = parseFloat(altResult.lat);
            const lng = parseFloat(altResult.lon);

            if (!isNaN(lat) && !isNaN(lng)) {
              console.log(
                `✅ Nominatim success with alternative: "${altLocation}"`,
              );
              return { lat, lng };
            }
          }
        } catch (altError) {
          console.log(
            `⚠️ Nominatim alternative "${altLocation}" failed:`,
            altError.message,
          );
        }
      }

      throw new Error(`No geocoding results for location: "${fullLocation}"`);
    }

    const result = response.data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates received from Nominatim');
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new Error(`Invalid coordinates from Nominatim: (${lat}, ${lng})`);
    }

    console.log(
      `✅ Successfully geocoded "${fullLocation}" with Nominatim to: (${lat}, ${lng})`,
    );
    console.log(`📍 Display name: ${result.display_name}`);

    return { lat, lng };
  } catch (error) {
    console.error(
      `❌ Nominatim geocoding failed for location: "${fullLocation}"`,
    );
    console.error('⚙️ Error details:', error.message || error);
    throw new Error(
      `Failed to geocode location with Nominatim: ${error.message || 'Unknown error'}`,
    );
  }
}

/**
 * Comprehensive fallback geocoding function that tries multiple services
 */
export async function geocodeLocationWithFallback(
  location: string,
): Promise<{ lat: number; lng: number }> {
  if (!location || location.trim() === '') {
    throw new Error('Location is empty or invalid');
  }

  console.log(`🎯 Starting comprehensive geocoding for: "${location}"`);

  let googleError: Error | null = null;
  let nominatimError: Error | null = null;

  try {
    // Try Google Maps first (most accurate)
    console.log('🔍 Attempting Google Maps geocoding...');
    const googleResult = await geocodeLocation(location);
    console.log('✅ Google Maps geocoding successful');
    return googleResult;
  } catch (error) {
    googleError = error as Error;
    console.log(
      '⚠️ Google Maps geocoding failed, trying Nominatim fallback...',
    );
    console.log('🔍 Google Maps error:', googleError.message);
  }

  try {
    // Fallback to Nominatim
    console.log('🌍 Attempting Nominatim geocoding...');
    const nominatimResult = await geocodeLocationWithNominatim(location);
    console.log('✅ Nominatim geocoding successful');
    return nominatimResult;
  } catch (error) {
    nominatimError = error as Error;
    console.log('⚠️ Nominatim geocoding also failed');
    console.log('🔍 Nominatim error:', nominatimError.message);
  }

  // If both services fail, try some manual coordinate detection
  const manualResult = tryManualCoordinateExtraction(location);
  if (manualResult) {
    console.log('✅ Manual coordinate extraction successful');
    return manualResult;
  }

  // All geocoding methods failed
  console.error('❌ All geocoding services failed');
  console.error('❌ Google Maps error:', googleError?.message);
  console.error('❌ Nominatim error:', nominatimError?.message);

  throw new Error(
    `All geocoding services failed for location "${location}". ` +
      `Google Maps: ${googleError?.message}. ` +
      `Nominatim: ${nominatimError?.message}`,
  );
}

/**
 * Try to extract coordinates if the location string contains them
 */
function tryManualCoordinateExtraction(
  location: string,
): { lat: number; lng: number } | null {
  // Look for coordinate patterns like "lat,lng" or "lat lng"
  const coordinatePatterns = [
    /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/, // Simple "lat,lng" or "lat lng"
    /lat[:\s]*(-?\d+\.?\d*)[,\s]*lng[:\s]*(-?\d+\.?\d*)/i, // "lat: x, lng: y"
    /latitude[:\s]*(-?\d+\.?\d*)[,\s]*longitude[:\s]*(-?\d+\.?\d*)/i, // Full names
    /\((-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)\)/, // "(lat, lng)"
  ];

  for (const pattern of coordinatePatterns) {
    const match = location.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        console.log(
          `📍 Extracted coordinates from location string: (${lat}, ${lng})`,
        );
        return { lat, lng };
      }
    }
  }

  return null;
}

// 🚀 Route calculation interfaces and functions
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
  polyline?: string; // Encoded polyline for efficient rendering
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

/**
 * Enhanced Google Directions API route calculation
 */
export async function calculateRoute(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
): Promise<RouteResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('❌ Google Maps API key is not configured');
    throw new Error('Google Maps API key is not configured');
  }

  // Format origin and destination
  const formatLocation = async (loc: { lat: number; lng: number } | string) => {
    if (typeof loc === 'string') {
      // If it's a string, try to geocode it first
      try {
        const coords = await geocodeLocationWithFallback(loc);
        return `${coords.lat},${coords.lng}`;
      } catch (error) {
        console.warn(`⚠️ Failed to geocode location "${loc}", using as-is`);
        return encodeURIComponent(
          loc.includes('Kenya') ? loc : `${loc}, Kenya`,
        );
      }
    }
    return `${loc.lat},${loc.lng}`;
  };

  try {
    console.log(
      `🗺️ Calculating route from ${JSON.stringify(origin)} to ${JSON.stringify(destination)}`,
    );

    const originStr = await formatLocation(origin);
    const destinationStr = await formatLocation(destination);

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${mode}&key=${apiKey}`;

    console.log(
      `📡 Directions API URL: ${url.replace(apiKey, 'HIDDEN_API_KEY')}`,
    );

    const response = await axios.get(url, {
      timeout: 20000, // 20 second timeout for route calculation
      headers: {
        'User-Agent': 'DeliveryApp/1.0',
        Accept: 'application/json',
      },
    });

    console.log('📊 Directions API response status:', response.data.status);
    console.log(
      '📋 Directions API response:',
      JSON.stringify(response.data, null, 2),
    );

    if (response.data.status === 'REQUEST_DENIED') {
      const errorMsg =
        response.data.error_message ||
        'API key invalid or Directions API not enabled';
      console.error('❌ Directions request denied:', errorMsg);
      throw new Error(
        `Google Directions API request denied: ${errorMsg}. Please check your API key and ensure the Directions API is enabled.`,
      );
    }

    if (response.data.status === 'ZERO_RESULTS') {
      console.warn('⚠️ No route found between the specified locations');
      throw new Error('No route found between the specified locations');
    }

    if (response.data.status === 'OVER_QUERY_LIMIT') {
      console.error('❌ Directions API quota exceeded');
      throw new Error('Google Maps API quota exceeded');
    }

    if (response.data.status === 'INVALID_REQUEST') {
      console.error('❌ Invalid directions request');
      throw new Error('Invalid request parameters for route calculation');
    }

    if (response.data.status !== 'OK') {
      throw new Error(
        `Directions API failed with status: ${response.data.status}`,
      );
    }

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No routes found in API response');
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    if (!leg || !leg.steps || leg.steps.length === 0) {
      throw new Error('Invalid route data: missing steps');
    }

    // Extract route steps with detailed information
    const steps: RouteStep[] = leg.steps.map((step: any, index: number) => {
      console.log(`📍 Step ${index + 1}:`, {
        instruction: step.html_instructions,
        distance: step.distance?.text,
        duration: step.duration?.text,
        location: step.end_location,
      });

      return {
        lat: step.end_location.lat,
        lng: step.end_location.lng,
        instruction: step.html_instructions?.replace(/<[^>]*>/g, ''), // Remove HTML tags
        distance: step.distance?.text,
        duration: step.duration?.text,
      };
    });

    // Add starting point
    steps.unshift({
      lat: leg.start_location.lat,
      lng: leg.start_location.lng,
      instruction: 'Starting point',
      distance: '0 m',
      duration: '0 mins',
    });

    const routeResult: RouteResult = {
      steps,
      totalDistance: leg.distance?.text || 'Unknown',
      totalDuration: leg.duration?.text || 'Unknown',
      polyline: route.overview_polyline?.points,
      bounds: route.bounds
        ? {
            northeast: {
              lat: route.bounds.northeast.lat,
              lng: route.bounds.northeast.lng,
            },
            southwest: {
              lat: route.bounds.southwest.lat,
              lng: route.bounds.southwest.lng,
            },
          }
        : undefined,
    };

    console.log('✅ Route calculation successful:', {
      totalSteps: routeResult.steps.length,
      totalDistance: routeResult.totalDistance,
      totalDuration: routeResult.totalDuration,
      hasPolyline: !!routeResult.polyline,
      polylineLength: routeResult.polyline?.length,
    });

    return routeResult;
  } catch (error) {
    console.error('❌ Route calculation failed:', error.message || error);
    throw new Error(
      `Failed to calculate route: ${error.message || 'Unknown error'}`,
    );
  }
}

/**
 * Alternative route calculation using OpenRouteService (free alternative)
 */
export async function calculateRouteWithOpenRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'driving-car',
): Promise<RouteResult> {
  const apiKey = process.env.OPENROUTE_API_KEY;

  if (!apiKey) {
    console.warn(
      '⚠️ OpenRouteService API key not configured, using basic route',
    );
    return createBasicRoute(origin, destination);
  }

  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;

  const requestBody = {
    coordinates: [
      [origin.lng, origin.lat], // OpenRoute uses [lng, lat] format
      [destination.lng, destination.lat],
    ],
    format: 'json',
    instructions: true,
    geometry: true,
  };

  try {
    console.log(`🌍 Calculating route with OpenRouteService: ${profile}`);

    const response = await axios.post(url, requestBody, {
      timeout: 20000,
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    console.log('📊 OpenRouteService response:', response.data);

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No routes returned from OpenRouteService');
    }

    const route = response.data.routes[0];
    const segment = route.segments[0];

    const steps: RouteStep[] = segment.steps.map(
      (step: any, index: number) => ({
        lat: step.maneuver.location[1], // OpenRoute returns [lng, lat]
        lng: step.maneuver.location[0],
        instruction: step.instruction,
        distance: `${step.distance}m`,
        duration: `${step.duration}s`,
      }),
    );

    return {
      steps,
      totalDistance: `${(route.summary.distance / 1000).toFixed(2)} km`,
      totalDuration: `${Math.round(route.summary.duration / 60)} min`,
      polyline: route.geometry, // GeoJSON geometry string
    };
  } catch (error) {
    console.error('❌ OpenRouteService failed:', error.message);
    console.warn('⚠️ Falling back to basic route');
    return createBasicRoute(origin, destination);
  }
}

/**
 * Create a basic straight-line route as fallback
 */
function createBasicRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): RouteResult {
  const distance = calculateStraightLineDistance(origin, destination);

  return {
    steps: [
      {
        lat: origin.lat,
        lng: origin.lng,
        instruction: 'Starting point',
        distance: '0 km',
        duration: '0 mins',
      },
      {
        lat: destination.lat,
        lng: destination.lng,
        instruction: 'Destination (straight line - detailed route unavailable)',
        distance: distance,
        duration: 'Unknown',
      },
    ],
    totalDistance: distance,
    totalDuration: 'Unknown',
  };
}

/**
 * Calculate straight-line distance using Haversine formula
 */
function calculateStraightLineDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): string {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return `${distance.toFixed(2)} km`;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Comprehensive route calculation with multiple fallback strategies
 */
export async function calculateRouteWithFallback(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
): Promise<RouteResult> {
  console.log(`🎯 Starting comprehensive route calculation`);
  console.log(`📍 Origin: ${JSON.stringify(origin)}`);
  console.log(`📍 Destination: ${JSON.stringify(destination)}`);
  console.log(`🚗 Mode: ${mode}`);

  // Convert string locations to coordinates if needed
  let originCoords = origin;
  let destCoords = destination;

  try {
    if (typeof origin === 'string') {
      console.log(`🔍 Geocoding origin: "${origin}"`);
      originCoords = await geocodeLocationWithFallback(origin);
    }
    if (typeof destination === 'string') {
      console.log(`🔍 Geocoding destination: "${destination}"`);
      destCoords = await geocodeLocationWithFallback(destination);
    }
  } catch (geocodeError) {
    console.error('❌ Geocoding failed:', geocodeError.message);
    throw new Error(`Failed to geocode locations: ${geocodeError.message}`);
  }

  const originCoordsTyped = originCoords as { lat: number; lng: number };
  const destCoordsTyped = destCoords as { lat: number; lng: number };

  // Validate coordinates
  if (
    !isValidCoordinates(originCoordsTyped) ||
    !isValidCoordinates(destCoordsTyped)
  ) {
    throw new Error('Invalid coordinates provided for route calculation');
  }

  let googleError: Error | null = null;
  let openRouteError: Error | null = null;

  try {
    // Try Google Directions first (most accurate and detailed)
    console.log('🔍 Attempting Google Directions API...');
    const googleResult = await calculateRoute(
      originCoordsTyped,
      destCoordsTyped,
      mode,
    );
    console.log('✅ Google Directions API successful');
    return googleResult;
  } catch (error) {
    googleError = error as Error;
    console.log('⚠️ Google Directions API failed, trying OpenRouteService...');
    console.log('🔍 Google error:', googleError.message);
  }

  try {
    // Fallback to OpenRouteService
    const profile =
      mode === 'driving'
        ? 'driving-car'
        : mode === 'walking'
          ? 'foot-walking'
          : 'cycling-regular';

    console.log('🌍 Attempting OpenRouteService...');
    const openRouteResult = await calculateRouteWithOpenRoute(
      originCoordsTyped,
      destCoordsTyped,
      profile,
    );
    console.log('✅ OpenRouteService successful');
    return openRouteResult;
  } catch (error) {
    openRouteError = error as Error;
    console.log('⚠️ OpenRouteService also failed');
    console.log('🔍 OpenRoute error:', openRouteError.message);
  }

  // Final fallback: create straight-line route
  console.log('📏 Using straight-line fallback route');
  console.error('❌ All routing services failed');
  console.error('❌ Google Directions error:', googleError?.message);
  console.error('❌ OpenRouteService error:', openRouteError?.message);

  return createBasicRoute(originCoordsTyped, destCoordsTyped);
}

/**
 * Validate coordinate object
 */
function isValidCoordinates(coord: { lat: number; lng: number }): boolean {
  return !!(
    coord &&
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng) &&
    Math.abs(coord.lat) <= 90 &&
    Math.abs(coord.lng) <= 180
  );
}
