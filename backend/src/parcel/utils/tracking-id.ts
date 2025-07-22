/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { PrismaClient } from '@prisma/client';

let counter = 1000;

export async function generateUniqueTrackingId(
  prisma: PrismaClient,
): Promise<string> {
  try {
    let trackingId = `PKG-${counter + 1}`;
    let exists = true;

    while (exists) {
      counter++;
      trackingId = `PKG-${counter}`;
      const existing = await prisma.parcel.findUnique({
        where: { trackingId },
      });
      exists = !!existing;
    }

    return trackingId;
  } catch (error: any) {
    throw new Error(`Failed to generate tracking ID: ${error.message}`);
  }
}
