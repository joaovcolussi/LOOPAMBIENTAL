import { AuthService } from '../src/modules/auth/auth.service';
import { ConversationsService } from '../src/modules/conversations/conversations.service';
import { PaymentsService } from '../src/modules/payments/payments.service';

describe('AuthService one-time tokens', () => {
  function setup(consumed: number) {
    const transaction = {
      authToken: {
        updateMany: jest.fn().mockResolvedValue({ count: consumed }),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
      session: { deleteMany: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      authToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'token-id',
          userId: 'user-id',
          type: 'EMAIL_VERIFICATION',
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    return { service: new AuthService(prisma as never), transaction };
  }

  it('consumes a verification token only while it is unused', async () => {
    const { service, transaction } = setup(1);

    await expect(service.verifyEmail('token')).resolves.toEqual({
      verified: true,
    });
    expect(transaction.authToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'token-id', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('rejects a token consumed by a concurrent request', async () => {
    const { service, transaction } = setup(0);

    await expect(service.verifyEmail('token')).rejects.toThrow(
      'INVALID_VERIFICATION_TOKEN',
    );
    expect(transaction.user.update).not.toHaveBeenCalled();
  });
});

describe('ConversationsService access', () => {
  it('requires current membership in either company of the thread', async () => {
    const prisma = {
      conversation: { findFirst: jest.fn().mockResolvedValue(null) },
      message: { findMany: jest.fn() },
    };
    const service = new ConversationsService(prisma as never, {} as never);

    await expect(
      service.messages('removed-member', 'conversation-id'),
    ).rejects.toThrow('CONVERSATION_ACCESS_DENIED');
    expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conversation-id',
        participants: { some: { userId: 'removed-member' } },
        OR: [
          {
            listing: {
              company: { members: { some: { userId: 'removed-member' } } },
            },
          },
          {
            proposal: {
              proposerCompany: {
                members: { some: { userId: 'removed-member' } },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    expect(prisma.message.findMany).not.toHaveBeenCalled();
  });
});

describe('PaymentsService.createCheckout', () => {
  function setup(status: string, paid: boolean, pending: unknown = null) {
    const prisma = {
      paymentTransaction: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(paid ? { id: 'paid-id' } : null)
          .mockResolvedValueOnce(pending),
        create: jest.fn(),
      },
      deal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'deal-id',
          status,
          buyerCompanyId: 'buyer-id',
          proposal: {
            quantity: '10',
            unitPrice: '2.50',
            listing: { title: 'Papelão' },
          },
        }),
        findFirst: jest.fn(),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
    };
    prisma.deal.findFirst = prisma.deal.findUnique;
    return {
      service: new PaymentsService(prisma as never, {} as never),
      prisma,
    };
  }

  it.each(['AWAITING_PICKUP', 'COMPLETED', 'CANCELLED', 'DISPUTED'])(
    'does not charge a deal in status %s',
    async (status) => {
      const { service, prisma } = setup(status, false);

      await expect(
        service.createCheckout('user-id', 'deal-id', 'key-1'),
      ).rejects.toThrow('DEAL_NOT_PAYABLE');
      expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
    },
  );

  it('does not charge a deal that already has a paid transaction', async () => {
    const { service, prisma } = setup('AWAITING_PAYMENT', true);

    await expect(
      service.createCheckout('user-id', 'deal-id', 'key-2'),
    ).rejects.toThrow('DEAL_ALREADY_PAID');
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('reuses the live checkout instead of opening a second one', async () => {
    const pending = { id: 'pending-id', checkoutUrl: 'https://mp/checkout' };
    const { service, prisma } = setup('AWAITING_PAYMENT', false, pending);

    await expect(
      service.createCheckout('user-id', 'deal-id', 'key-3'),
    ).resolves.toBe(pending);
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });
});

describe('PaymentsService.handleWebhook', () => {
  it('never moves a deal that already advanced back to pickup', async () => {
    const tx = {
      paymentTransaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      deal: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      dealStatusHistory: { create: jest.fn() },
    };
    const prisma = {
      paymentTransaction: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tx-id',
          dealId: 'deal-id',
          companyId: 'buyer-id',
          deal: { status: 'COMPLETED' },
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const outbox = { enqueueWithin: jest.fn() };
    const service = new PaymentsService(prisma as never, outbox as never);
    const internals = service as unknown as {
      mercadoPago: {
        verifyWebhookSignature: () => boolean;
        getPayment: () => Promise<object>;
      };
    };
    internals.mercadoPago = {
      verifyWebhookSignature: () => true,
      getPayment: async () => ({
        id: 'mp-1',
        status: 'approved',
        external_reference: 'tx-id',
      }),
    };

    await service.handleWebhook('sig', 'req', 'mp-1', 'payment');

    expect(tx.deal.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'deal-id',
        status: { in: ['OPEN', 'AWAITING_DOCUMENTS', 'AWAITING_PAYMENT'] },
      },
      data: { status: 'AWAITING_PICKUP' },
    });
    expect(tx.dealStatusHistory.create).not.toHaveBeenCalled();
    expect(outbox.enqueueWithin).toHaveBeenCalled();
  });
});
