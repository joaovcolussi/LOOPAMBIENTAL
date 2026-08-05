import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
