import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { NotificationType } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { RealtimeService } from '../../infrastructure/realtime.service';

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  payload: true,
  readAt: true,
  createdAt: true,
} as const;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  async create(
    userId: string,
    input: {
      type: NotificationType;
      title: string;
      body: string;
      payload?: Record<string, string>;
    },
  ): Promise<unknown> {
    try {
      const notification = await this.prisma.notification.create({
        data: { userId, ...input },
        select: notificationSelect,
      });
      this.realtime?.publish(userId, {
        type: 'notification',
        data: notification as unknown as Record<string, unknown>,
      });
      return notification;
    } catch (error) {
      // Notifications are secondary effects and must not make a completed command fail.
      this.logger.warn(
        `Notification failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async list(
    userId: string,
    options: { cursor?: string; pageSize?: number; unread?: boolean } = {},
  ): Promise<unknown> {
    const pageSize = Math.min(
      Math.max(Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE), 1),
      MAX_PAGE_SIZE,
    );
    let cursorWhere = {};
    if (options.cursor) {
      const cursor = await this.prisma.notification.findFirst({
        where: { id: options.cursor, userId },
        select: { id: true, createdAt: true },
      });
      if (!cursor) throw new BadRequestException('INVALID_CURSOR');
      // Deterministic keyset: (createdAt desc, id desc).
      cursorWhere = {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      };
    }
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
          ...(options.unread ? { readAt: null } : {}),
          ...cursorWhere,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: notificationSelect,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    return {
      notifications: items,
      unreadCount,
      pagination: {
        pageSize,
        hasMore,
        nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
      },
    };
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
