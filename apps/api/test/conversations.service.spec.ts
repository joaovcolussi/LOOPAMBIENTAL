import { ConversationsService } from '../src/modules/conversations/conversations.service';

describe('ConversationsService', () => {
  it('returns the winning conversation after a concurrent create', async () => {
    const winner = { id: 'conversation-id', participants: [] };
    const prisma = {
      proposal: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proposal-id',
          proposerCompanyId: 'buyer-company',
          createdByUserId: 'buyer-user',
          listing: {
            id: 'listing-id',
            companyId: 'seller-company',
            createdByUserId: 'seller-user',
          },
          deal: null,
        }),
      },
      companyMember: {
        findFirst: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      conversation: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'conversation-id' })
          .mockResolvedValueOnce(winner),
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
      conversationParticipant: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new ConversationsService(prisma as never, {} as never);

    await expect(
      service.createForProposal('buyer-user', 'proposal-id'),
    ).resolves.toEqual(winner);
    expect(prisma.conversationParticipant.upsert).toHaveBeenCalled();
  });

  it('adds the unread message count for the current participant', async () => {
    const lastReadAt = new Date('2026-01-01T00:00:00.000Z');
    const conversation = {
      id: 'conversation-id',
      updatedAt: new Date(),
      proposalId: null,
      dealId: null,
      listing: { id: 'listing-id', title: 'PET cristal' },
      participants: [
        {
          userId: 'buyer-user',
          user: { id: 'buyer-user', name: 'Buyer' },
          lastReadAt,
        },
        {
          userId: 'seller-user',
          user: { id: 'seller-user', name: 'Seller' },
          lastReadAt: null,
        },
      ],
      messages: [
        {
          body: 'Última mensagem',
          createdAt: new Date(),
          senderUserId: 'seller-user',
        },
      ],
    };
    const prisma = {
      conversation: {
        findMany: jest.fn().mockResolvedValue([conversation]),
      },
      message: {
        count: jest.fn().mockResolvedValue(3),
      },
    };
    const service = new ConversationsService(prisma as never, {} as never);

    await expect(service.list('buyer-user')).resolves.toEqual([
      { ...conversation, unreadCount: 3 },
    ]);
    expect(prisma.message.count).toHaveBeenCalledWith({
      where: {
        conversationId: 'conversation-id',
        deletedAt: null,
        senderUserId: { not: 'buyer-user' },
        createdAt: { gt: lastReadAt },
      },
    });
  });
});
