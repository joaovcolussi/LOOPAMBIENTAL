import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind a reverse proxy in production, trust the first hop so rate limiting
  // and audit logs see the real client IP.
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 15552000, includeSubDomains: true, preload: true }
          : false,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix('api/v1');
  const configuredOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const allowedOrigins = new Set([
    configuredOrigin,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, origin?: boolean) => void,
    ) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
