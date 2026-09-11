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
});
