import { ParcelType, TransportMode } from '@prisma/client';

export function calculateParcelPrice(
  type: ParcelType,
  weight: number,
  distance: number,
  mode: TransportMode,
): number {
  let base = 200; // base fee in KSH

  // Add by type
  switch (type) {
    case 'BOXED_PACKAGE':
      base += 150;
      break;
    case 'ENVELOPE':
      base += 50;
      break;
    case 'BAG':
      base += 100;
      break;
    case 'SUITCASE':
      base += 200;
      break;
  }

  // Weight fee
  base += weight * 20;

  // Distance fee (e.g., 10 per km)
  base += distance * 10;

  // Express fee multiplier
  if (mode === 'EXPRESS') {
    base *= 1.5;
  }

  return Math.round(base);
}
