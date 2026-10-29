import { DealsService } from '../src/modules/deals/deals.service';

function setup(deal: Record<string, unknown> | null, memberOf: string[]) {
  const tx = {
    deal: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
    },
    dealStatusHistory: { create: jest.fn() },
    paymentTransaction: { updateMany: jest.fn() },
    listing: {
      update: jest.fn(),
      findUnique: jest
        .fn()
        .mockResolvedValue({ status: 'NEGOTIATING', availableQuantity: '10' }),
    },
    listingStatusHistory: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const prisma = {
    deal: {
      findUnique: jest.fn().mockResolvedValue(
        deal && {
          id: 'deal-1',
          listingId: 'listing-1',
          buyerCompanyId: 'buyer-co',
          sellerCompanyId: 'seller-co',
          proposal: { quantity: '5' },
          ...deal,
        },
      ),
    },
    companyMember: {
      findMany: jest
        .fn()
        .mockResolvedValue(memberOf.map((companyId) => ({ companyId }))),
    },
    paymentTransaction: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const outbox = { enqueueWithin: jest.fn() };
  const notifications = { create: jest.fn() };
  const service = new DealsService(
    prisma as never,
    outbox as never,
    notifications as never,
  );
  jest.spyOn(service, 'get').mockResolvedValue({ id: 'deal-1' });
  return { service, tx, prisma };
}

describe('DealsService.transition', () => {
  it('rejects actions outside the state machine', async () => {
    const { service } = setup({ status: 'OPEN' }, ['buyer-co']);
    await expect(
      service.transition('u', 'deal-1', 'set-status'),
    ).rejects.toThrow('INVALID_DEAL_ACTION');
  });

  it('only lets the seller confirm the shipment', async () => {
    const { service } = setup({ status: 'AWAITING_PICKUP' }, ['buyer-co']);
    await expect(
      service.transition('u', 'deal-1', 'confirm-shipment'),
    ).rejects.toThrow('DEAL_ACTION_NOT_ALLOWED');
  });

  it('hides deals from companies that are not part of them', async () => {
    const { service } = setup({ status: 'OPEN' }, ['other-co']);
    await expect(
      service.transition('u', 'deal-1', 'cancel', 'x'),
    ).rejects.toThrow('DEAL_NOT_FOUND');
  });

  it('refuses a transition from the wrong status', async () => {
    const { service } = setup({ status: 'OPEN' }, ['buyer-co']);
    await expect(service.transition('u', 'deal-1', 'complete')).rejects.toThrow(
      'INVALID_DEAL_TRANSITION',
    );
  });

  it('requires a reason to cancel or dispute', async () => {
    const { service } = setup({ status: 'OPEN' }, ['buyer-co']);
    await expect(service.transition('u', 'deal-1', 'cancel')).rejects.toThrow(
      'DEAL_REASON_REQUIRED',
    );
  });

  it('cannot cancel a paid deal', async () => {
    const { service, prisma } = setup({ status: 'AWAITING_PAYMENT' }, [
      'buyer-co',
    ]);
    prisma.paymentTransaction.findFirst.mockResolvedValue({ id: 'paid' });
    await expect(
      service.transition('u', 'deal-1', 'cancel', 'desisti'),
    ).rejects.toThrow('DEAL_ALREADY_PAID');
  });

  it('returns reserved stock and reopens the listing on cancellation', async () => {
    const { service, tx } = setup({ status: 'OPEN' }, ['seller-co']);
    await service.transition('u', 'deal-1', 'cancel', 'sem frete');
    expect(tx.listing.update).toHaveBeenCalledWith({
      where: { id: 'listing-1' },
      data: { availableQuantity: { increment: '5' } },
    });
    expect(tx.listing.update).toHaveBeenCalledWith({
      where: { id: 'listing-1' },
      data: { status: 'PUBLISHED' },
    });
    expect(tx.dealStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toStatus: 'CANCELLED',
        note: 'DEAL_CANCELLED: sem frete',
      }),
    });
  });

  it('fails on a concurrent status change', async () => {
    const { service, tx } = setup({ status: 'DELIVERED' }, ['buyer-co']);
    tx.deal.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.transition('u', 'deal-1', 'complete')).rejects.toThrow(
      'DEAL_STATUS_CHANGED',
    );
  });
});

describe('DealsService.availableActions', () => {
  it('offers side-specific actions', () => {
    const { service } = setup(null, []);
    expect(service.availableActions('AWAITING_PICKUP', 'SELLER')).toEqual([
      'confirm-shipment',
      'dispute',
    ]);
    expect(service.availableActions('DELIVERED', 'BUYER')).toEqual([
      'complete',
      'dispute',
    ]);
  });
});
