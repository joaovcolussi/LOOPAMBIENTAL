import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    input: {
      type:
        | 'PROPOSAL_CREATED'
        | 'PROPOSAL_COUNTERED'
        | 'PROPOSAL_ACCEPTED'
        | 'PROPOSAL_REJECTED'
        | 'PROPOSAL_CANCELLED'
        | 'MESSAGE_RECEIVED'
        | 'SYSTEM';
      title: string;
      body: string;
      payload?: Record<string, string>;
    },
  ): Promise<unknown> {
    try {
      return await this.prisma.notification.create({
        data: { userId, ...input },
      });
    } catch (error) {
      // Notifications are secondary effects and must not make a completed command fail.
      this.logger.warn(
        `Notification failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
  async list(userId: string): Promise<unknown> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        payload: true,
        readAt: true,
        createdAt: true,
      },
    });
  }
  async read(userId: string, id: string): Promise<unknown> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0)
      throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    return { id, read: true };
  }
  async readAll(userId: string): Promise<unknown> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: result.count };
  }
}
