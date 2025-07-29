/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DistanceService {
  constructor(private http: HttpService) {}

  async getDistanceInKm(origin: string, destination: string): Promise<number> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';

    const response = await firstValueFrom(
      this.http.get(url, {
        params: {
          origins: origin,
          destinations: destination,
          key: apiKey,
        },
      }),
    );

    const data = response.data;
    const status = data.rows?.[0]?.elements?.[0]?.status;

    if (status === 'OK') {
      const meters = data.rows[0].elements[0].distance.value;
      return meters / 1000; // Convert to KM
    }

    throw new Error('Could not calculate distance from Google Maps API');
  }
}
