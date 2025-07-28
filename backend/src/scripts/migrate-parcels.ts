/* eslint-disable @typescript-eslint/no-floating-promises */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateParcelData() {
  try {
    const parcels = await prisma.parcel.findMany();
    for (const parcel of parcels) {
      const sender = await prisma.user.findUnique({
        where: { email: parcel.senderEmail },
      });
      const receiver = await prisma.user.findUnique({
        where: { email: parcel.receiverEmail },
      });

      if (sender && receiver) {
        await prisma.parcel.update({
          where: { id: parcel.id },
          data: {
            senderId: sender.id,
            receiverId: receiver.id,
          },
        });
        console.log(
          `Updated parcel ${parcel.id} with senderId: ${sender.id}, receiverId: ${receiver.id}`,
        );
      } else {
        console.warn(`No matching user found for parcel ${parcel.id}`);
      }
    }
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateParcelData();
