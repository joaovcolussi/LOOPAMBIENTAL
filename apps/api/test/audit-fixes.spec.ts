import { AuthService } from '../src/modules/auth/auth.service';
import { CompanyMembersService } from '../src/modules/company-members/company-members.service';
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

describe('CompanyMembersService.removeMember', () => {
  it('also removes the member from the company conversations', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ role: 'OWNER' })
          .mockResolvedValueOnce({ role: 'MEMBER' }),
        delete: jest.fn().mockReturnValue('delete-member'),
      },
      conversationParticipant: {
        deleteMany: jest.fn().mockReturnValue('delete-participants'),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const service = new CompanyMembersService(prisma as never, {} as never);

    await service.removeMember('owner-id', 'company-id', 'member-id');

    expect(prisma.conversationParticipant.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'member-id',
        conversation: {
          OR: [
            { listing: { companyId: 'company-id' } },
            { proposal: { proposerCompanyId: 'company-id' } },
          ],
        },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'delete-member',
      'delete-participants',
    ]);
  });
});

describe('PaymentsService.createCheckout', () => {
  function setup(status: string, paid: boolean) {
    const prisma = {
      paymentTransaction: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(paid ? { id: 'paid-id' } : null),
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
});
