/* eslint-disable @typescript-eslint/no-misused-promises */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@1234', 10);

  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@sendit.com',
      phone: '0700000000',
      role: 'ADMIN',
      password: hashedPassword,
    },
  });

  console.log('✅ Admin user created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
