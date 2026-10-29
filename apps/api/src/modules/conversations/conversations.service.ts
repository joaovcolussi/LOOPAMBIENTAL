import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { RealtimeService } from '../../infrastructure/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';

const MESSAGE_PAGE_SIZE = 100;

// Participant rows alone are not enough: a user removed from the company must
// lose access to its negotiation threads, so current membership in either side
// (listing owner or proposer) is checked on every access.
function currentMemberOfEitherSide(userId: string) {
  return {
    OR: [
      { listing: { company: { members: { some: { userId } } } } },
      { proposal: { proposerCompany: { members: { some: { userId } } } } },
    ],
  };
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  async createForProposal(
    userId: string,
    proposalId: string,
  ): Promise<unknown> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId },
      include: {
        listing: {
          select: { id: true, companyId: true, createdByUserId: true },
        },
        deal: { select: { id: true } },
      },
    });
    if (!proposal) throw new NotFoundException('PROPOSAL_NOT_FOUND');
    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId: {
          in: [proposal.proposerCompanyId, proposal.listing.companyId],
        },
      },
      select: { role: true },
    });
    const isOriginalParticipant = [
      proposal.createdByUserId,
      proposal.listing.createdByUserId,
    ].includes(userId);
    if (!membership || (membership.role === 'MEMBER' && !isOriginalParticipant))
      throw new ForbiddenException('CONVERSATION_ACCESS_DENIED');
    const participantIds = [
      proposal.createdByUserId,
      proposal.listing.createdByUserId,
      userId,
    ].filter((id, index, ids) => ids.indexOf(id) === index);
    const existing = await this.prisma.conversation.findUnique({
      where: { proposalId },
      include: { participants: true },
    });
    if (existing) {
      await this.prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: { conversationId: existing.id, userId },
        },
        update: {},
        create: { conversationId: existing.id, userId },
      });
      return this.prisma.conversation.findUnique({
        where: { id: existing.id },
        include: { participants: true },
      });
    }
    try {
      return await this.prisma.conversation.create({
        data: {
          listingId: proposal.listing.id,
          proposalId,
          dealId: proposal.deal?.id,
          participants: {
            createMany: {
              data: participantIds.map((participantId) => ({
                userId: participantId,
              })),
            },
          },
        },
        include: { participants: true },
      });
    } catch (error) {
      if (
        !error ||
        typeof error !== 'object' ||
        !('code' in error) ||
        error.code !== 'P2002'
      )
        throw error;
      const winner = await this.prisma.conversation.findUnique({
        where: { proposalId },
      });
      if (!winner) throw error;
      await this.prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: { conversationId: winner.id, userId },
        },
        update: {},
        create: { conversationId: winner.id, userId },
      });
      return this.prisma.conversation.findUnique({
        where: { id: winner.id },
        include: { participants: true },
      });
    }
  }

  async list(userId: string): Promise<unknown> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
        ...currentMemberOfEitherSide(userId),
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        updatedAt: true,
        proposalId: true,
        dealId: true,
        listing: { select: { id: true, title: true } },
        participants: {
          select: {
            userId: true,
            user: { select: { id: true, name: true } },
            lastReadAt: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderUserId: true },
        },
      },
    });
    return Promise.all(
      conversations.map(async (conversation) => {
        const me = conversation.participants.find(
          (participant) => participant.userId === userId,
        );
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            deletedAt: null,
            senderUserId: { not: userId },
            ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
          },
        });
        return { ...conversation, unreadCount };
      }),
    );
  }

  // Returns the most recent page in chronological order; `before` loads the
  // page that precedes a given message.
  async messages(
    userId: string,
    conversationId: string,
    before?: string,
  ): Promise<unknown> {
    await this.assertParticipant(userId, conversationId);
    let cursorWhere = {};
    if (before) {
      const anchor = await this.prisma.message.findFirst({
        where: { id: before, conversationId },
        select: { id: true, createdAt: true },
      });
      if (!anchor) throw new BadRequestException('INVALID_CURSOR');
      cursorWhere = {
        OR: [
          { createdAt: { lt: anchor.createdAt } },
          { createdAt: anchor.createdAt, id: { lt: anchor.id } },
        ],
      };
    }
    const page = await this.prisma.message.findMany({
      where: { conversationId, deletedAt: null, ...cursorWhere },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MESSAGE_PAGE_SIZE,
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderUserId: true,
        sender: { select: { id: true, name: true } },
      },
    });
    return page.reverse();
  }

  async send(
    userId: string,
    conversationId: string,
    body: string,
  ): Promise<unknown> {
    await this.assertParticipant(userId, conversationId);
    const normalizedBody = body.trim();
    if (normalizedBody.length < 1 || normalizedBody.length > 5000)
      throw new BadRequestException('INVALID_MESSAGE');
    const message = await this.prisma.message.create({
      data: { conversationId, senderUserId: userId, body: normalizedBody },
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderUserId: true,
        sender: { select: { id: true, name: true } },
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    const recipients = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    for (const participantId of [userId, ...recipients.map((r) => r.userId)])
      this.realtime?.publish(participantId, {
        type: 'message',
        data: { conversationId, message },
      });
    await Promise.all(
      recipients.map((recipient) =>
        this.notifications.create(recipient.userId, {
          type: 'MESSAGE_RECEIVED',
          title: 'Nova mensagem',
          body: 'Você recebeu uma nova mensagem.',
          payload: { conversationId, messageId: message.id },
        }),
      ),
    );
    return message;
  }

  async markRead(userId: string, conversationId: string): Promise<unknown> {
    await this.assertParticipant(userId, conversationId);
    return this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
      select: { conversationId: true, userId: true, lastReadAt: true },
    });
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { userId } },
        ...currentMemberOfEitherSide(userId),
      },
      select: { id: true },
    });
    if (!conversation)
      throw new ForbiddenException('CONVERSATION_ACCESS_DENIED');
  }
}
