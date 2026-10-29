import { LogisticsService } from '../src/modules/logistics/logistics.service';

function shipmentPrisma(shipmentStatus: string, dealStatus: string) {
  const tx = {
    shipment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    shipmentEvent: { create: jest.fn() },
    logisticsRequest: { update: jest.fn() },
    deal: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    dealStatusHistory: { create: jest.fn() },
  };
  const prisma = {
    shipment: {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'ship-1',
          status: shipmentStatus,
          trackingCode: 'LA123BR',
          logisticsRequest: {
            id: 'req-1',
            requestedByUserId: 'user-1',
            destination: 'Santos/SP',
            deal: { id: 'deal-1', status: dealStatus },
          },
        })
        .mockResolvedValue({ id: 'ship-1' }),
    },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  return { prisma, tx };
}

describe('LogisticsService shipments', () => {
  it('rejects backwards tracking transitions', async () => {
    const { prisma } = shipmentPrisma('DELIVERED', 'DELIVERED');
    const service = new LogisticsService(prisma as never);
    await expect(
      service.addShipmentEvent('admin', 'ship-1', { status: 'IN_TRANSIT' }),
    ).rejects.toThrow('INVALID_SHIPMENT_TRANSITION');
  });

  it('moves the deal to in transit when the cargo is picked up', async () => {
    const { prisma, tx } = shipmentPrisma('SCHEDULED', 'AWAITING_PICKUP');
    const service = new LogisticsService(prisma as never);
    await service.addShipmentEvent('admin', 'ship-1', { status: 'PICKED_UP' });
    expect(tx.deal.updateMany).toHaveBeenCalledWith({
      where: { id: 'deal-1', status: 'AWAITING_PICKUP' },
      data: { status: 'IN_TRANSIT' },
    });
    expect(tx.logisticsRequest.update).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { status: 'IN_TRANSIT' },
    });
  });

  it('marks the deal delivered and the request completed on delivery', async () => {
    const { prisma, tx } = shipmentPrisma('IN_TRANSIT', 'IN_TRANSIT');
    const service = new LogisticsService(prisma as never);
    await service.addShipmentEvent('admin', 'ship-1', { status: 'DELIVERED' });
    expect(tx.deal.updateMany).toHaveBeenCalledWith({
      where: { id: 'deal-1', status: 'IN_TRANSIT' },
      data: { status: 'DELIVERED' },
    });
    expect(tx.shipmentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'DELIVERED',
        location: 'Santos/SP',
      }),
    });
  });

  it('does not touch a deal that is not waiting for the shipment', async () => {
    const { prisma, tx } = shipmentPrisma('SCHEDULED', 'OPEN');
    const service = new LogisticsService(prisma as never);
    await service.addShipmentEvent('admin', 'ship-1', { status: 'PICKED_UP' });
    expect(tx.deal.updateMany).not.toHaveBeenCalled();
  });
});

describe('LogisticsService demo helpers', () => {
  const original = process.env.DEMO_MODE;
  afterEach(() => {
    process.env.DEMO_MODE = original;
  });

  it('refuses simulated quotes when demo mode is off', async () => {
    process.env.DEMO_MODE = 'false';
    const service = new LogisticsService({} as never);
    await expect(service.simulateQuotes('u', 'req-1')).rejects.toThrow(
      'DEMO_FEATURE_DISABLED',
    );
  });

  it('only lets deal participants accept quotes', async () => {
    const prisma = {
      logisticsRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'req-1',
          status: 'QUOTED',
          deal: { buyerCompanyId: 'b', sellerCompanyId: 's' },
        }),
      },
      companyMember: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new LogisticsService(prisma as never);
    await expect(service.acceptQuote('u', 'req-1', 'q-1')).rejects.toThrow(
      'DEAL_ACCESS_DENIED',
    );
  });
});
