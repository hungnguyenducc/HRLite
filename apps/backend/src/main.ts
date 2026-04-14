import * as path from 'path';
import { config } from 'dotenv';

// Load .env from project root before anything else
config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Cookie parser
  app.use(cookieParser());

  // CORS — cho phép frontend gọi trực tiếp (dev) hoặc qua proxy
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3002',
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseTransformInterceptor(),
  );

  const port = process.env.BACKEND_PORT || 3001;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`🚀 NestJS backend running on http://localhost:${port}/api`);
}
bootstrap();
