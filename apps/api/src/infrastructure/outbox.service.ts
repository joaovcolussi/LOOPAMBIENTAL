import { Injectable } from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from './prisma.service';

export type OutboxEventInput = {
  type: string;
  aggregateType?: string;
  aggregateId?: string;
  payload: Prisma.InputJsonValue;
  availableAt?: Date;
};

/**
 * Transactional outbox writer.
 *
 * Events are persisted in the same database transaction as the domain change
 * so that a committed business operation always leaves an event behind. The
 * worker is responsible for dispatching and processing them asynchronously.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(input: OutboxEventInput): Promise<unknown> {
    return this.prisma.outboxEvent.create({ data: this.toData(input) });
  }

  enqueueWithin(
    tx: Prisma.TransactionClient,
    input: OutboxEventInput,
  ): Promise<unknown> {
    return tx.outboxEvent.create({ data: this.toData(input) });
  }

  private toData(input: OutboxEventInput): Prisma.OutboxEventCreateInput {
    return {
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
      ...(input.availableAt ? { availableAt: input.availableAt } : {}),
    };
  }
}
