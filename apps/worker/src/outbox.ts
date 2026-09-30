import type { OutboxEvent, PrismaClient } from '@loopambiental/database';
import { handleOutboxEvent, HandlerContext } from './handlers';

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 30_000;

export async function claimPendingEvent(
  prisma: PrismaClient,
  status: 'PENDING' | 'DISPATCHED' = 'PENDING',
): Promise<OutboxEvent | null> {
  const candidate = await prisma.outboxEvent.findFirst({
    where: { status, availableAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
  });
  if (!candidate) return null;
  const claimed = await prisma.outboxEvent.updateMany({
    where: { id: candidate.id, status },
    data: { status: 'PROCESSING' },
  });
  return claimed.count === 1 ? candidate : null;
}

export async function markDispatched(
  prisma: PrismaClient,
  eventId: string,
): Promise<void> {
  await prisma.outboxEvent.update({
    where: { id: eventId },
    data: { status: 'DISPATCHED' },
  });
}

export async function processEvent(
  prisma: PrismaClient,
  context: HandlerContext,
  event: OutboxEvent,
): Promise<void> {
  try {
    await handleOutboxEvent(
      { type: event.type, payload: event.payload },
      context,
    );
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSED', processedAt: new Date(), lastError: null },
    });
    context.log(`Outbox event ${event.id} (${event.type}) processed`);
  } catch (error) {
    const attempts = event.attempts + 1;
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = attempts >= MAX_ATTEMPTS;
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: exhausted ? 'FAILED' : 'PENDING',
        attempts,
        lastError: message.slice(0, 2000),
        availableAt: new Date(
          Date.now() + Math.min(attempts, 6) * BACKOFF_BASE_MS,
        ),
      },
    });
    context.warn(
      `Outbox event ${event.id} failed (attempt ${attempts}): ${message}`,
    );
  }
}

/**
 * Fallback processor used when no Redis connection is configured. It behaves
 * like the queue consumer but processes events inline in the worker process.
 */
export function startOutboxPolling(
  prisma: PrismaClient,
  context: HandlerContext,
  intervalMs = 5_000,
): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      for (let index = 0; index < 20; index += 1) {
        const event = await claimPendingEvent(prisma);
        if (!event) break;
        await processEvent(prisma, context, event);
      }
    } catch (error) {
      context.warn(
        `Outbox polling failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref?.();
  void tick();
  return () => clearInterval(timer);
}
