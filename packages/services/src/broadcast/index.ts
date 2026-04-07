import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';

export interface BroadcastCreateOptions {
  title: string;
  content: string;
  targetPlatform?: string;
  targetRole?: string;
  scheduledAt?: Date;
  createdBy: string;
}

export type SendMessageFn = (platformUserId: string, platform: string, message: string) => Promise<boolean>;

export class BroadcastService {
  constructor(
    private db: PrismaClient,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'broadcast' });
  }

  /**
   * Create a new broadcast.
   */
  async create(options: BroadcastCreateOptions): Promise<any> {
    // Count target recipients
    const where: Record<string, any> = { status: 'ACTIVE' };
    if (options.targetPlatform) {
      where.platform = options.targetPlatform.toUpperCase();
    }
    if (options.targetRole) {
      where.role = options.targetRole.toUpperCase();
    }

    const recipientCount = await this.db.user.count({ where: where as any });

    const broadcast = await this.db.broadcastMessage.create({
      data: {
        title: options.title,
        content: options.content,
        targetPlatform: options.targetPlatform
          ? (options.targetPlatform.toUpperCase() as any)
          : null,
        targetRole: options.targetRole
          ? (options.targetRole.toUpperCase() as any)
          : null,
        scheduledAt: options.scheduledAt ?? null,
        totalRecipients: recipientCount,
        createdBy: options.createdBy,
      },
    });

    this.logger.info('Broadcast created', {
      broadcastId: broadcast.id,
      recipients: recipientCount,
    });

    return broadcast;
  }

  /**
   * Send a broadcast to all matching users.
   */
  async send(
    broadcastId: string,
    sendMessage: SendMessageFn
  ): Promise<{ success: number; failure: number }> {
    const broadcast = await this.db.broadcastMessage.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast || broadcast.status !== 'PENDING') {
      throw new Error('Broadcast not found or already sent');
    }

    // Mark as sending
    await this.db.broadcastMessage.update({
      where: { id: broadcastId },
      data: { status: 'SENDING' },
    });

    // Get target users
    const where: Record<string, any> = { status: 'ACTIVE' };
    if (broadcast.targetPlatform) {
      where.platform = broadcast.targetPlatform;
    }
    if (broadcast.targetRole) {
      where.role = broadcast.targetRole;
    }

    const users = await this.db.user.findMany({
      where: where as any,
      select: { id: true, platformUserId: true, platform: true },
    });

    let successCount = 0;
    let failureCount = 0;

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (user: any) => {
          const sent = await sendMessage(
            user.platformUserId,
            user.platform.toLowerCase(),
            broadcast.content
          );

          await this.db.broadcastReceipt.create({
            data: {
              broadcastId,
              userId: user.id,
              status: sent ? 'SENT' : 'FAILED',
              sentAt: sent ? new Date() : null,
              errorMessage: sent ? null : 'Send failed',
            },
          });

          return sent;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          failureCount++;
        }
      }
    }

    // Mark completed
    await this.db.broadcastMessage.update({
      where: { id: broadcastId },
      data: {
        status: 'COMPLETED',
        sentAt: new Date(),
        successCount,
        failureCount,
      },
    });

    this.logger.info('Broadcast sent', {
      broadcastId,
      success: successCount,
      failure: failureCount,
    });

    return { success: successCount, failure: failureCount };
  }

  async list(
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    return this.db.broadcastMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getById(id: string): Promise<any> {
    return this.db.broadcastMessage.findUnique({
      where: { id },
      include: {
        receipts: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async cancel(id: string): Promise<void> {
    await this.db.broadcastMessage.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
