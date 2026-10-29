import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../infrastructure/prisma.service';
import { RealtimeService } from '../../infrastructure/realtime.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';
import { FileRegistryService } from '../../infrastructure/file-registry.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { resolvePaymentProviderName } from '../payments/payment-provider';

function sameToken(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Controller()
export class ObservabilityController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly files: FileRegistryService,
  ) {}

  @Get('admin/files')
  @UseGuards(AuthGuard, AdminGuard)
  async listFiles(@Query('status') status?: string): Promise<unknown> {
    const [files, summary] = await Promise.all([
      this.files.list({ status }),
      this.files.summary(),
    ]);
    return { files, summary };
  }

  /** Liveness: the process is up (no dependencies checked). */
  @Get('health/live')
  @SkipThrottle()
  live() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness: dependencies needed to serve traffic are reachable. */
  @Get('health/ready')
  @SkipThrottle()
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('DATABASE_UNAVAILABLE');
    }
    return {
      status: 'ready',
      checks: { database: 'ok' },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Prometheus scrape endpoint. Requires `Authorization: Bearer METRICS_TOKEN`
   * when the token is configured, and is closed in production without it.
   */
  @Get('metrics')
  @SkipThrottle()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  scrape(@Headers('authorization') authorization?: string) {
    const token = process.env.METRICS_TOKEN;
    if (token) {
      const received = authorization?.replace(/^Bearer\s+/i, '') ?? '';
      if (!sameToken(token, received))
        throw new ForbiddenException('METRICS_TOKEN_REQUIRED');
    } else if (process.env.NODE_ENV === 'production')
      throw new ForbiddenException('METRICS_TOKEN_REQUIRED');
    return this.metrics.prometheus();
  }

  @Get('admin/observability')
  @UseGuards(AuthGuard, AdminGuard)
  async overview(): Promise<unknown> {
    const [outbox, failedEvents] = await Promise.all([
      this.prisma.outboxEvent.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.outboxEvent.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          attempts: true,
          lastError: true,
          updatedAt: true,
        },
      }),
    ]);
    return {
      ...this.metrics.snapshot(),
      realtimeConnections: this.realtime.connectionCount(),
      outbox: Object.fromEntries(
        outbox.map((row) => [row.status, row._count._all]),
      ),
      failedEvents,
      environment: process.env.NODE_ENV ?? 'development',
      paymentProvider: resolvePaymentProviderName(),
    };
  }
}
