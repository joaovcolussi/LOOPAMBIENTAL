import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createForProposal(
    userId: string,
    proposalId: string,
  ): Promise<unknown> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId },
      include: {
        listing: { select: { id: true, createdByUserId: true } },
        deal: { select: { id: true } },
      },
    });
    if (!proposal) throw new NotFoundException('PROPOSAL_NOT_FOUND');
    const participantIds = [
      proposal.createdByUserId,
      proposal.listing.createdByUserId,
    ].filter((id, index, ids) => ids.indexOf(id) === index);
    if (!participantIds.includes(userId))
      throw new ForbiddenException('CONVERSATION_ACCESS_DENIED');
    const existing = await this.prisma.conversation.findUnique({
      where: { proposalId },
      include: { participants: true },
    });
    if (existing) return existing;
    return this.prisma.conversation.create({
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
  }

  async list(userId: string): Promise<unknown> {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
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
  }

  async messages(userId: string, conversationId: string): Promise<unknown> {
    await this.assertParticipant(userId, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderUserId: true,
        sender: { select: { id: true, name: true } },
      },
    });
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
      select: { id: true, body: true, createdAt: true, senderUserId: true },
    });
    const recipients = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    await Promise.all(
      recipients.map((recipient) =>
        this.notifications.create(recipient.userId, {
          type: 'MESSAGE_RECEIVED',
          title: 'Nova mensagem',
          body: 'Voce recebeu uma nova mensagem.',
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
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant)
      throw new ForbiddenException('CONVERSATION_ACCESS_DENIED');
  }
}
