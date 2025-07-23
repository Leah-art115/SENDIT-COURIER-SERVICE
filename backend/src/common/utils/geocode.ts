/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from 'axios';

export async function geocodeLocation(
  location: string,
): Promise<{ lat: number; lng: number }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const result = response.data.results[0];

    if (!result) {
      throw new Error('Invalid location');
    }

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  } catch (error) {
    console.error('Geocoding failed:', error);
    throw new Error('Failed to geocode location');
  }
}
