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
