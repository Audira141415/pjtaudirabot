import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

export interface TrackEventOptions {
  eventType: string;
  userId?: string;
  platform?: string;
  metadata?: Record<string, unknown>;
  value?: number;
}

export interface StatsSnapshot {
  totalMessages: number;
  totalCommands: number;
  totalAIRequests: number;
  totalErrors: number;
  uniqueUsers: number;
  avgResponseTimeMs: number;
  topCommands: Record<string, number>;
}

export class AnalyticsService {
  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'analytics' });
  }

  /**
   * Track an event — buffered in Redis, flushed to DB periodically.
   */
  async track(options: TrackEventOptions): Promise<void> {
    const today = this.todayKey();

    try {
      const pipeline = this.redis.multi();

      // Increment counters
      pipeline.hIncrBy(`analytics:${today}`, options.eventType, 1);

      if (options.userId) {
        pipeline.sAdd(`analytics:users:${today}`, options.userId);
      }

      if (options.eventType === 'command_executed' && options.metadata?.commandName) {
        pipeline.hIncrBy(
          `analytics:commands:${today}`,
          String(options.metadata.commandName),
          1
        );
      }

      if (options.value != null) {
        pipeline.rPush(
          `analytics:values:${options.eventType}:${today}`,
          String(options.value)
        );
        // Cap list length
        pipeline.lTrim(`analytics:values:${options.eventType}:${today}`, -1000, -1);
      }

      // TTL 48h for all analytics keys
      pipeline.expire(`analytics:${today}`, 172800);
      pipeline.expire(`analytics:users:${today}`, 172800);
      pipeline.expire(`analytics:commands:${today}`, 172800);

      await pipeline.exec();
    } catch (error) {
      this.logger.error('Failed to track analytics event', error as Error);
    }
  }

  /**
   * Get today's real-time stats from Redis.
   */
  async getTodayStats(): Promise<StatsSnapshot> {
    const today = this.todayKey();

    try {
      const [counters, uniqueUsers, topCommands, responseTimes] = await Promise.all([
        this.redis.hGetAll(`analytics:${today}`),
        this.redis.sCard(`analytics:users:${today}`),
        this.redis.hGetAll(`analytics:commands:${today}`),
        this.redis.lRange(`analytics:values:command_executed:${today}`, 0, -1),
      ]);

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, v) => sum + Number(v), 0) / responseTimes.length
        : 0;

      const commandMap: Record<string, number> = {};
      for (const [cmd, count] of Object.entries(topCommands)) {
        commandMap[cmd] = Number(count);
      }

      return {
        totalMessages: Number(counters['message_received'] ?? 0),
        totalCommands: Number(counters['command_executed'] ?? 0),
        totalAIRequests: Number(counters['ai_request'] ?? 0),
        totalErrors: Number(counters['error'] ?? 0),
        uniqueUsers,
        avgResponseTimeMs: Math.round(avgResponseTime),
        topCommands: commandMap,
      };
    } catch (error) {
      this.logger.error('Failed to get today stats', error as Error);
      return {
        totalMessages: 0,
        totalCommands: 0,
        totalAIRequests: 0,
        totalErrors: 0,
        uniqueUsers: 0,
        avgResponseTimeMs: 0,
        topCommands: {},
      };
    }
  }

  /**
   * Flush Redis counters to DB (call from cron).
   */
  async flushToDatabase(dateKey?: string): Promise<void> {
    const key = dateKey ?? this.todayKey();
    const date = this.keyToDate(key);

    try {
      const [counters, uniqueUsers, topCommands, responseTimes] = await Promise.all([
        this.redis.hGetAll(`analytics:${key}`),
        this.redis.sCard(`analytics:users:${key}`),
        this.redis.hGetAll(`analytics:commands:${key}`),
        this.redis.lRange(`analytics:values:command_executed:${key}`, 0, -1),
      ]);

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, v) => sum + Number(v), 0) / responseTimes.length
        : 0;

      const commandMap: Record<string, number> = {};
      for (const [cmd, count] of Object.entries(topCommands)) {
        commandMap[cmd] = Number(count);
      }

      // Upsert for all platforms combined
      await this.db.dailyStats.upsert({
        where: { date_platform: { date, platform: 'WHATSAPP' } },
        create: {
          date,
          totalMessages: Number(counters['message_received'] ?? 0),
          totalCommands: Number(counters['command_executed'] ?? 0),
          totalAIRequests: Number(counters['ai_request'] ?? 0),
          totalErrors: Number(counters['error'] ?? 0),
          uniqueUsers,
          avgResponseTimeMs: avgResponseTime,
          topCommands: commandMap as any,
        },
        update: {
          totalMessages: Number(counters['message_received'] ?? 0),
          totalCommands: Number(counters['command_executed'] ?? 0),
          totalAIRequests: Number(counters['ai_request'] ?? 0),
          totalErrors: Number(counters['error'] ?? 0),
          uniqueUsers,
          avgResponseTimeMs: avgResponseTime,
          topCommands: commandMap as any,
        },
      });

      this.logger.info('Analytics flushed to database', { date: key });
    } catch (error) {
      this.logger.error('Failed to flush analytics', error as Error);
    }
  }

  /**
   * Get historical stats from DB.
   */
  async getHistoricalStats(days: number = 30): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.db.dailyStats.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'desc' },
    });
  }

  private todayKey(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private keyToDate(key: string): Date {
    return new Date(key + 'T00:00:00.000Z');
  }
}
