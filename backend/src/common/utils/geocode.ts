/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from 'axios';

export async function geocodeLocation(
  location: string,
): Promise<{ lat: number; lng: number }> {
  if (!location || location.trim() === '') {
    throw new Error('Location is empty');
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Check if API key exists
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  // 👇 Append ", Kenya" if not already present
  const fullLocation = location.includes('Kenya')
    ? location
    : `${location}, Kenya`;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullLocation)}&key=${apiKey}`;

  try {
    console.log(`Attempting to geocode: ${fullLocation}`);
    console.log(`API URL: ${url.replace(apiKey, 'HIDDEN_API_KEY')}`);

    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'DeliveryApp/1.0',
      },
    });

    console.log('Geocoding API response status:', response.data.status);
    console.log(
      'Geocoding API response:',
      JSON.stringify(response.data, null, 2),
    );

    // Handle different API response statuses
    if (response.data.status === 'REQUEST_DENIED') {
      throw new Error(
        `Google Maps API request denied. Check your API key and billing setup. Error: ${response.data.error_message || 'Unknown error'}`,
      );
    }

    if (response.data.status === 'OVER_QUERY_LIMIT') {
      throw new Error(
        'Google Maps API quota exceeded. Check your billing and usage limits.',
      );
    }

    if (response.data.status === 'ZERO_RESULTS') {
      // Try alternative location formats
      const alternatives = [
        location, // Original without Kenya
        `${location}, Nairobi, Kenya`,
        `${location}, Nairobi County, Kenya`,
      ];

      for (const altLocation of alternatives) {
        if (altLocation === fullLocation) continue; // Skip if same as already tried

        console.log(`Trying alternative location: ${altLocation}`);
        const altUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(altLocation)}&key=${apiKey}`;

        try {
          const altResponse = await axios.get(altUrl, { timeout: 10000 });
          if (altResponse.data.results && altResponse.data.results.length > 0) {
            const result = altResponse.data.results[0];
            console.log(
              `Successfully geocoded with alternative: ${altLocation}`,
            );
            return {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng,
            };
          }
        } catch (altError) {
          console.log(
            `Alternative ${altLocation} also failed:`,
            altError.message,
          );
        }
      }

      throw new Error(
        `No geocoding results found for location: "${fullLocation}" or its alternatives`,
      );
    }

    if (!response.data.results || response.data.results.length === 0) {
      throw new Error(`No geocoding results for location: "${fullLocation}"`);
    }

    const result = response.data.results[0];

    // Validate that we got valid coordinates
    if (!result.geometry || !result.geometry.location) {
      throw new Error('Invalid geocoding response: missing geometry data');
    }

    const lat = result.geometry.location.lat;
    const lng = result.geometry.location.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error(
        'Invalid geocoding response: coordinates are not numbers',
      );
    }

    console.log(`Successfully geocoded "${fullLocation}" to: ${lat}, ${lng}`);

    return { lat, lng };
  } catch (error) {
    console.error('Geocoding failed for location:', fullLocation);
    console.error(
      'Error details:',
      error.response?.data || error.message || error,
    );

    // If it's an axios error, provide more details
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    throw new Error(
      `Failed to geocode location "${fullLocation}": ${error.message || 'Unknown error'}`,
    );
  }
}

// Alternative geocoding function using OpenStreetMap Nominatim (free alternative)
export async function geocodeLocationWithNominatim(
  location: string,
): Promise<{ lat: number; lng: number }> {
  if (!location || location.trim() === '') {
    throw new Error('Location is empty');
  }

  const fullLocation = location.includes('Kenya')
    ? location
    : `${location}, Kenya`;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullLocation)}&limit=1`;

  try {
    console.log(`Attempting to geocode with Nominatim: ${fullLocation}`);

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'DeliveryApp/1.0 (your-email@example.com)', // Required by Nominatim
      },
    });

    if (!response.data || response.data.length === 0) {
      throw new Error(`No geocoding results for location: "${fullLocation}"`);
    }

    const result = response.data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates received from Nominatim');
    }

    console.log(`Successfully geocoded "${fullLocation}" to: ${lat}, ${lng}`);
    return { lat, lng };
  } catch (error) {
    console.error('Nominatim geocoding failed for location:', fullLocation);
    console.error('Error details:', error.message || error);
    throw new Error(
      `Failed to geocode location with Nominatim: ${error.message || 'Unknown error'}`,
    );
  }
}

// Fallback geocoding function that tries Google Maps first, then Nominatim
export async function geocodeLocationWithFallback(
  location: string,
): Promise<{ lat: number; lng: number }> {
  try {
    // Try Google Maps first
    return await geocodeLocation(location);
  } catch (googleError) {
    console.log('Google Maps geocoding failed, trying Nominatim fallback...');
    console.log('Google Maps error:', googleError.message);

    try {
      // Fallback to Nominatim
      return await geocodeLocationWithNominatim(location);
    } catch (nominatimError) {
      console.error('Both geocoding services failed');
      console.error('Google Maps error:', googleError.message);
      console.error('Nominatim error:', nominatimError.message);

      throw new Error(
        `All geocoding services failed for location "${location}". Google Maps: ${googleError.message}. Nominatim: ${nominatimError.message}`,
      );
    }
  }
}

// 🚀 NEW: Route calculation interface
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
}

// 🚀 NEW: Google Directions API route calculation
export async function calculateRoute(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
): Promise<RouteResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  // Format origin and destination
  const formatLocation = (loc: { lat: number; lng: number } | string) => {
    if (typeof loc === 'string') {
      return encodeURIComponent(loc.includes('Kenya') ? loc : `${loc}, Kenya`);
    }
    return `${loc.lat},${loc.lng}`;
  };

  const originStr = formatLocation(origin);
  const destinationStr = formatLocation(destination);

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${mode}&key=${apiKey}`;

  try {
    console.log(`Calculating route from ${originStr} to ${destinationStr}`);

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'DeliveryApp/1.0',
      },
    });

    console.log('Directions API response status:', response.data.status);

    if (response.data.status === 'REQUEST_DENIED') {
      throw new Error(
        `Google Directions API request denied: ${response.data.error_message || 'Check your API key'}`,
      );
    }

    if (response.data.status === 'ZERO_RESULTS') {
      throw new Error('No route found between the specified locations');
    }

    if (response.data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('Google Maps API quota exceeded');
    }

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No routes found in API response');
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    // Extract route steps
    const steps: RouteStep[] = leg.steps.map((step: any) => ({
      lat: step.end_location.lat,
      lng: step.end_location.lng,
      instruction: step.html_instructions?.replace(/<[^>]*>/g, ''), // Remove HTML tags
      distance: step.distance?.text,
      duration: step.duration?.text,
    }));

    // Add starting point
    steps.unshift({
      lat: leg.start_location.lat,
      lng: leg.start_location.lng,
      instruction: 'Starting point',
    });

    return {
      steps,
      totalDistance: leg.distance?.text || 'Unknown',
      totalDuration: leg.duration?.text || 'Unknown',
      polyline: route.overview_polyline?.points, // Encoded polyline
    };
  } catch (error) {
    console.error('Route calculation failed:', error.message || error);
    throw new Error(
      `Failed to calculate route: ${error.message || 'Unknown error'}`,
    );
  }
}

// 🚀 NEW: Free alternative using OpenRouteService
export async function calculateRouteWithOpenRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'driving-car',
): Promise<RouteResult> {
  // You'll need to get a free API key from https://openrouteservice.org/
  const apiKey = process.env.OPENROUTE_API_KEY;

  if (!apiKey) {
    console.warn('OpenRouteService API key not configured, using basic route');
    // Fallback to simple straight line with basic steps
    return {
      steps: [
        { lat: origin.lat, lng: origin.lng, instruction: 'Starting point' },
        {
          lat: destination.lat,
          lng: destination.lng,
          instruction: 'Destination',
        },
      ],
      totalDistance: 'Unknown',
      totalDuration: 'Unknown',
    };
  }

  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;

  const requestBody = {
    coordinates: [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ],
    format: 'json',
    instructions: true,
  };

  try {
    const response = await axios.post(url, requestBody, {
      timeout: 15000,
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
    });

    const route = response.data.routes[0];
    const steps: RouteStep[] = route.segments[0].steps.map((step: any) => ({
      lat: step.maneuver.location[1],
      lng: step.maneuver.location[0],
      instruction: step.instruction,
      distance: `${step.distance}m`,
      duration: `${step.duration}s`,
    }));

    return {
      steps,
      totalDistance: `${(route.summary.distance / 1000).toFixed(2)} km`,
      totalDuration: `${Math.round(route.summary.duration / 60)} min`,
      polyline: route.geometry, // GeoJSON geometry
    };
  } catch (error) {
    console.error('OpenRouteService failed:', error.message);
    // Fallback to basic route
    return {
      steps: [
        { lat: origin.lat, lng: origin.lng, instruction: 'Starting point' },
        {
          lat: destination.lat,
          lng: destination.lng,
          instruction: 'Destination',
        },
      ],
      totalDistance: 'Unknown',
      totalDuration: 'Unknown',
    };
  }
}

// 🚀 NEW: Route calculation with fallback
export async function calculateRouteWithFallback(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
): Promise<RouteResult> {
  try {
    // Try Google Directions first
    return await calculateRoute(origin, destination, mode);
  } catch (googleError) {
    console.log('Google Directions failed, trying OpenRouteService...');

    // Convert strings to coordinates if needed
    let originCoords = origin;
    let destCoords = destination;

    if (typeof origin === 'string') {
      originCoords = await geocodeLocationWithFallback(origin);
    }
    if (typeof destination === 'string') {
      destCoords = await geocodeLocationWithFallback(destination);
    }

    try {
      const profile =
        mode === 'driving'
          ? 'driving-car'
          : mode === 'walking'
            ? 'foot-walking'
            : 'cycling-regular';

      return await calculateRouteWithOpenRoute(
        originCoords as { lat: number; lng: number },
        destCoords as { lat: number; lng: number },
        profile,
      );
    } catch (openRouteError) {
      console.error('All routing services failed');

      // Final fallback: create a simple straight-line route
      const originCoords2 = originCoords as { lat: number; lng: number };
      const destCoords2 = destCoords as { lat: number; lng: number };

      return {
        steps: [
          {
            lat: originCoords2.lat,
            lng: originCoords2.lng,
            instruction: 'Starting point',
          },
          {
            lat: destCoords2.lat,
            lng: destCoords2.lng,
            instruction: 'Destination',
          },
        ],
        totalDistance: 'Unknown',
        totalDuration: 'Unknown',
      };
    }
  }
}
