import { PaymentsService } from '../src/modules/payments/payments.service';
import { ContactUnlocksService } from '../src/modules/contact-unlocks/contact-unlocks.service';
import { resolvePaymentProviderName } from '../src/modules/payments/payment-provider';

describe('payment provider selection', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('defaults to the simulated sandbox outside production', () => {
    delete process.env.PAYMENT_PROVIDER;
    process.env.NODE_ENV = 'development';
    expect(resolvePaymentProviderName()).toBe('SIMULATED');
  });

  it('never simulates in production unless explicitly configured', () => {
    delete process.env.PAYMENT_PROVIDER;
    process.env.NODE_ENV = 'production';
    expect(resolvePaymentProviderName()).toBe('MERCADO_PAGO');
    process.env.PAYMENT_PROVIDER = 'simulated';
    expect(resolvePaymentProviderName()).toBe('SIMULATED');
  });
});

describe('PaymentsService.simulate', () => {
  function setup(payment: unknown) {
    const prisma = {
      paymentTransaction: {
        findFirst: jest.fn().mockResolvedValue(payment),
      },
    };
    const service = new PaymentsService(prisma as never, {} as never);
    const settle = jest.spyOn(service, 'settle').mockResolvedValue(true);
    jest.spyOn(service, 'getForUser').mockResolvedValue({ id: 'pay-1' });
    return { service, settle };
  }

  it('rejects unknown outcomes', async () => {
    const { service } = setup(null);
    await expect(service.simulate('u', 'pay-1', 'maybe')).rejects.toThrow(
      'INVALID_PAYMENT_OUTCOME',
    );
  });

  it('only settles charges created by the simulated provider', async () => {
    const { service, settle } = setup({
      id: 'pay-1',
      provider: 'MERCADO_PAGO',
      status: 'PENDING',
    });
    await expect(service.simulate('u', 'pay-1', 'approved')).rejects.toThrow(
      'PAYMENT_NOT_SIMULATED',
    );
    expect(settle).not.toHaveBeenCalled();
  });

  it('does not settle twice', async () => {
    const { service, settle } = setup({
      id: 'pay-1',
      provider: 'SIMULATED',
      status: 'PAID',
    });
    await expect(service.simulate('u', 'pay-1', 'approved')).rejects.toThrow(
      'PAYMENT_ALREADY_SETTLED',
    );
    expect(settle).not.toHaveBeenCalled();
  });

  it('maps approval to PAID and refusal to FAILED', async () => {
    const { service, settle } = setup({
      id: 'pay-1',
      provider: 'SIMULATED',
      status: 'PENDING',
    });
    await service.simulate('u', 'pay-1', 'approved');
    await service.simulate('u', 'pay-1', 'rejected');
    expect(settle.mock.calls[0][1]).toBe('PAID');
    expect(settle.mock.calls[1][1]).toBe('FAILED');
  });

  it('returns not found for a payment of another company', async () => {
    const { service } = setup(null);
    await expect(service.simulate('u', 'pay-1', 'approved')).rejects.toThrow(
      'PAYMENT_NOT_FOUND',
    );
  });
});

describe('PaymentsService.settle', () => {
  function setup(transaction: Record<string, unknown>, claimed = 1) {
    const tx = {
      paymentTransaction: {
        updateMany: jest.fn().mockResolvedValue({ count: claimed }),
      },
      subscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      contactUnlock: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      paymentTransaction: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-1',
          companyId: 'company-1',
          createdByUserId: 'user-1',
          provider: 'SIMULATED',
          dealId: null,
          subscriptionId: null,
          listingId: null,
          deal: null,
          metadata: null,
          ...transaction,
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const outbox = { enqueueWithin: jest.fn() };
    const notifications = { create: jest.fn() };
    const service = new PaymentsService(
      prisma as never,
      outbox as never,
      notifications as never,
    );
    return { service, tx, outbox, notifications };
  }

  it('activates the subscription plan stored on the charge', async () => {
    const { service, tx, notifications } = setup({
      purpose: 'SUBSCRIPTION',
      subscriptionId: 'sub-1',
      metadata: { planId: 'plan-pro' },
    });
    await expect(service.settle('pay-1', 'PAID', {})).resolves.toBe(true);
    expect(tx.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'ACTIVE', planId: 'plan-pro' }),
      }),
    );
    expect(tx.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: 'PAYMENT_CONFIRMED' }),
    );
  });

  it('creates a one-time contact unlock after payment', async () => {
    const { service, tx } = setup({
      purpose: 'CONTACT_UNLOCK',
      listingId: 'listing-1',
    });
    await service.settle('pay-1', 'PAID', {});
    expect(tx.contactUnlock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        listingId: 'listing-1',
        companyId: 'company-1',
        source: 'ONE_TIME',
      }),
    });
  });

  it('applies nothing when the charge was already settled', async () => {
    const { service, tx, outbox, notifications } = setup(
      { purpose: 'CONTACT_UNLOCK', listingId: 'listing-1' },
      0,
    );
    await expect(service.settle('pay-1', 'PAID', {})).resolves.toBe(false);
    expect(tx.contactUnlock.create).not.toHaveBeenCalled();
    expect(outbox.enqueueWithin).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('records a refused payment without granting the benefit', async () => {
    const { service, tx } = setup({
      purpose: 'SUBSCRIPTION',
      subscriptionId: 'sub-1',
    });
    await expect(service.settle('pay-1', 'FAILED', {})).resolves.toBe(false);
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });
});

describe('ContactUnlocksService one-time charge', () => {
  function setup(price: unknown) {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
      listing: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'listing-1',
          title: 'Sucata',
          companyId: 'seller-co',
        }),
      },
      contactUnlock: { findUnique: jest.fn().mockResolvedValue(null) },
      platformSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue(price === undefined ? null : { value: price }),
      },
      $transaction: jest.fn(),
    };
    const subscriptions = {
      findActive: jest.fn().mockResolvedValue(null),
      contactUnlockLimit: jest.fn(),
    };
    const payments = {
      createCharge: jest.fn().mockResolvedValue({ id: 'pay-1' }),
    };
    const service = new ContactUnlocksService(
      prisma as never,
      subscriptions as never,
      payments as never,
    );
    return { service, prisma, payments };
  }

  it('charges the default price when the company has no plan', async () => {
    const { service, payments, prisma } = setup(undefined);
    await expect(
      service.unlock('user-1', 'listing-1', 'buyer-co'),
    ).resolves.toEqual({ paymentRequired: true, payment: { id: 'pay-1' } });
    expect(payments.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'CONTACT_UNLOCK',
        amount: '29.90',
        listingId: 'listing-1',
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses to unlock a listing of the same company', async () => {
    const { service } = setup(10);
    await expect(
      service.unlock('user-1', 'listing-1', 'seller-co'),
    ).rejects.toThrow('CONTACT_UNLOCK_OWN_LISTING');
  });
});
