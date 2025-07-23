/* eslint-disable @typescript-eslint/no-floating-promises */
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Allow Angular frontend (CORS fix)
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Prefix all routes with /api
  app.setGlobalPrefix('api');

  await app.listen(3000);
  console.log(`Server running on http://localhost:3000/api`);
}
bootstrap();
