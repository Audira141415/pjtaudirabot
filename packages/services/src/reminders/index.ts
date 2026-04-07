import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

export interface ReminderInput {
  userId: string;
  message: string;
  remindAt: Date;
  platform: string;
  recurring?: string;
  sourceMessage?: string;
}

export interface PendingReminder {
  id: string;
  userId: string;
  message: string;
  platform: string;
  platformUserId: string;
}

export class ReminderService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    logger: ILogger,
    private sendCallback?: (platform: string, platformUserId: string, message: string) => Promise<void>
  ) {
    this.logger = logger.child({ service: 'reminders' });
  }

  /**
   * Detect if a message is a reminder request.
   */
  detectReminder(message: string): boolean {
    return /\b(ingatkan|remind|reminder|ingetin|alarm|jangan lupa)\b/i.test(message);
  }

  /**
   * Extract reminder details from a message.
   */
  extractReminder(message: string, platform: string): Omit<ReminderInput, 'userId'> | null {
    const remindAt = this.parseReminderTime(message);
    if (!remindAt) return null;

    // Extract the reminder content
    let content = message
      .replace(/\b(ingatkan|remind|reminder|ingetin|jangan lupa)\s*(saya|aku|me|gue)?\s*/gi, '')
      .replace(/\b(jam|at|pukul)\s*\d{1,2}[:.:]?\d{0,2}\s*/gi, '')
      .replace(/\b(besok|tomorrow|nanti|lusa)\s*/gi, '')
      .replace(/\b(untuk|to|buat)\s*/gi, '')
      .trim();

    if (!content) content = 'Reminder';

    return {
      message: content,
      remindAt,
      platform,
      sourceMessage: message,
    };
  }

  /**
   * Create a reminder.
   */
  async createReminder(input: ReminderInput): Promise<{ id: string; remindAt: Date; message: string }> {
    const reminder = await this.db.reminder.create({
      data: {
        userId: input.userId,
        message: input.message,
        remindAt: input.remindAt,
        platform: input.platform.toUpperCase() as any,
        recurring: input.recurring ?? null,
        sourceMessage: input.sourceMessage ?? null,
      },
    });

    // Store in Redis sorted set for quick polling
    await this.redis.zAdd('reminders:pending', {
      score: input.remindAt.getTime(),
      value: reminder.id,
    });

    this.logger.info('Reminder created', {
      id: reminder.id,
      remindAt: input.remindAt.toISOString(),
    });

    return { id: reminder.id, remindAt: input.remindAt, message: input.message };
  }

  /**
   * List upcoming reminders for a user.
   */
  async listReminders(userId: string): Promise<any[]> {
    return this.db.reminder.findMany({
      where: { userId, isDelivered: false, remindAt: { gte: new Date() } },
      orderBy: { remindAt: 'asc' },
      take: 10,
    });
  }

  /**
   * Cancel a reminder.
   */
  async cancelReminder(reminderId: string, userId: string): Promise<boolean> {
    const reminder = await this.db.reminder.findFirst({
      where: { id: reminderId, userId, isDelivered: false },
    });
    if (!reminder) return false;

    await this.db.reminder.delete({ where: { id: reminderId } });
    await this.redis.zRem('reminders:pending', reminderId);
    return true;
  }

  /**
   * Check and deliver due reminders. Called periodically by the scheduler.
   * @param deliverFn Optional callback to deliver messages. Falls back to constructor sendCallback.
   */
  async checkAndDeliver(
    deliverFn?: (platformUserId: string, message: string) => Promise<void>
  ): Promise<number> {
    const now = Date.now();

    // Get all reminders due before now from Redis sorted set
    const dueIds = await this.redis.zRangeByScore('reminders:pending', 0, now);
    if (dueIds.length === 0) return 0;

    let delivered = 0;

    for (const id of dueIds) {
      try {
        const reminder = await this.db.reminder.findUnique({
          where: { id },
          include: { user: true },
        });

        if (!reminder || reminder.isDelivered) {
          await this.redis.zRem('reminders:pending', id);
          continue;
        }

        // Deliver the reminder
        const formattedMsg = `⏰ *Reminder*\n\n${reminder.message}`;
        if (deliverFn) {
          await deliverFn(reminder.user.platformUserId, formattedMsg);
        } else if (this.sendCallback) {
          await this.sendCallback(
            reminder.platform.toLowerCase(),
            reminder.user.platformUserId,
            formattedMsg
          );
        }

        // Mark as delivered
        await this.db.reminder.update({
          where: { id },
          data: { isDelivered: true, deliveredAt: new Date() },
        });

        // Handle recurring reminders
        if (reminder.recurring) {
          const nextTime = this.getNextRecurrence(reminder.remindAt, reminder.recurring);
          if (nextTime) {
            await this.createReminder({
              userId: reminder.userId,
              message: reminder.message,
              remindAt: nextTime,
              platform: reminder.platform.toLowerCase(),
              recurring: reminder.recurring,
            });
          }
        }

        await this.redis.zRem('reminders:pending', id);
        delivered++;
      } catch (error) {
        this.logger.error('Failed to deliver reminder', error as Error, { id });
      }
    }

    if (delivered > 0) {
      this.logger.info('Delivered reminders', { count: delivered });
    }

    return delivered;
  }

  /**
   * Format reminder confirmation.
   */
  formatConfirmation(reminder: { message: string; remindAt: Date }): string {
    const timeStr = reminder.remindAt.toLocaleString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `⏰ *Reminder Set*\n\n📝 ${reminder.message}\n🕐 ${timeStr}`;
  }

  // ── Private helpers ──

  private parseReminderTime(msg: string): Date | null {
    const now = new Date();

    // "jam 5" / "at 5" / "pukul 17"
    const jamMatch = msg.match(/\b(?:jam|at|pukul)\s*(\d{1,2})[:.:]?(\d{0,2})\b/i);
    if (jamMatch) {
      const hour = parseInt(jamMatch[1], 10);
      const minute = parseInt(jamMatch[2] || '0', 10);
      const d = new Date(now);

      // Handle "besok" / "tomorrow"
      if (/\b(besok|tomorrow)\b/i.test(msg)) {
        d.setDate(d.getDate() + 1);
      }

      d.setHours(hour, minute, 0, 0);
      if (d <= now && !/\b(besok|tomorrow)\b/i.test(msg)) {
        d.setDate(d.getDate() + 1);
      }
      return d;
    }

    // "X menit lagi" / "in X minutes"
    const minutesMatch = msg.match(/\b(\d+)\s*(?:menit|minutes?|mins?)\b/i);
    if (minutesMatch) {
      return new Date(now.getTime() + parseInt(minutesMatch[1], 10) * 60_000);
    }

    // "X jam lagi" / "in X hours"
    const hoursMatch = msg.match(/\b(\d+)\s*(?:jam|hours?|hrs?)\b/i);
    if (hoursMatch) {
      return new Date(now.getTime() + parseInt(hoursMatch[1], 10) * 3_600_000);
    }

    // "besok" without specific time (default 8 AM)
    if (/\b(besok|tomorrow)\b/i.test(msg)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      return d;
    }

    return null;
  }

  private getNextRecurrence(current: Date, type: string): Date | null {
    const next = new Date(current);
    switch (type) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        return next;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        return next;
      default:
        return null;
    }
  }
}
