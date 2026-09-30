import { OutboxService } from '../src/infrastructure/outbox.service';

describe('OutboxService', () => {
  it('persists an event with its payload', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'event-id' });
    const service = new OutboxService({ outboxEvent: { create } } as never);

    await service.enqueue({
      type: 'deal.created',
      aggregateType: 'DEAL',
      aggregateId: 'deal-id',
      payload: { dealId: 'deal-id' },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'deal.created',
        aggregateType: 'DEAL',
        aggregateId: 'deal-id',
        payload: { dealId: 'deal-id' },
      }),
    });
  });

  it('writes through the provided transaction client', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'event-id' });
    const service = new OutboxService({} as never);

    await service.enqueueWithin({ outboxEvent: { create } } as never, {
      type: 'payment.confirmed',
      payload: { paymentId: 'payment-id' },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'payment.confirmed' }),
    });
  });
});
