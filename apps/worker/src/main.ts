import { PrismaClient } from '@loopambiental/database';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { EmailSender } from './email';
import { HandlerContext } from './handlers';
import {
  claimPendingEvent,
  markDispatched,
  processEvent,
  startOutboxPolling,
} from './outbox';

const QUEUE_NAME = 'loopambiental-outbox';
const startedAt = new Date().toISOString();

function buildContext(prisma: PrismaClient): HandlerContext {
  const write = (level: 'info' | 'warn', message: string) => {
    const line = JSON.stringify({
      level,
      service: 'worker',
      message,
      timestamp: new Date().toISOString(),
    });
    if (level === 'warn') console.warn(line);
    else console.log(line);
  };
  return {
    prisma,
    email: new EmailSender(),
    log: (message) => write('info', message),
    warn: (message) => write('warn', message),
  };
}

async function startQueueMode(
  prisma: PrismaClient,
  context: HandlerContext,
  redisUrl: string,
): Promise<void> {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, { connection });
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const event = await prisma.outboxEvent.findUnique({
        where: { id: String(job.data.eventId) },
      });
      if (!event) return;
      await processEvent(prisma, context, event);
    },
    { connection, concurrency: 5 },
  );
  worker.on('failed', (job, error) => {
    context.warn(`Queue job ${job?.id ?? 'unknown'} failed: ${error.message}`);
  });

  let dispatching = false;
  const dispatch = async () => {
    if (dispatching) return;
    dispatching = true;
    try {
      for (let index = 0; index < 20; index += 1) {
        const event = await claimPendingEvent(prisma);
        if (!event) break;
        await queue.add(
          'outbox',
          { eventId: event.id },
          {
            jobId: event.id,
            attempts: 1,
            removeOnComplete: true,
            removeOnFail: 100,
          },
        );
        await markDispatched(prisma, event.id);
      }
    } catch (error) {
      context.warn(
        `Outbox dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      dispatching = false;
    }
  };

  const timer = setInterval(() => {
    void dispatch();
  }, 5_000);
  timer.unref?.();
  void dispatch();

  const shutdown = async () => {
    clearInterval(timer);
    await worker.close();
    await queue.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

async function bootstrap(): Promise<void> {
  const prisma = new PrismaClient();
  const context = buildContext(prisma);
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    await startQueueMode(prisma, context, redisUrl);
  } else {
    startOutboxPolling(prisma, context);
    context.warn(
      'REDIS_URL not configured: processing outbox inline without BullMQ.',
    );
  }

  console.log(
    JSON.stringify({
      service: 'worker',
      status: 'ready',
      mode: redisUrl ? 'bullmq' : 'polling',
      startedAt,
    }),
  );
}

void bootstrap().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: 'error',
      service: 'worker',
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
