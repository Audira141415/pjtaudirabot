import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

export interface ModerationResult {
  allowed: boolean;
  action?: 'WARN' | 'BLOCK' | 'MUTE' | 'BAN';
  ruleName?: string;
  message?: string;
}

interface CachedRule {
  id: string;
  name: string;
  ruleType: string;
  pattern: string;
  action: string;
  message: string | null;
  priority: number;
}

export class ModerationService {
  private rulesCache: CachedRule[] = [];
  private cacheExpiry: number = 0;
  private cacheTtlMs: number = 60000; // 1 min

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'moderation' });
  }

  /**
   * Check a message against all active moderation rules.
   */
  async check(
    userId: string,
    message: string,
    platform: string
  ): Promise<ModerationResult> {
    const rules = await this.getRules();

    for (const rule of rules) {
      const triggered = this.testRule(rule, message, userId);
      if (!triggered) continue;

      // Log the moderation event
      await this.logModeration(userId, rule, message, platform);

      // Handle spam/flood with Redis
      if (rule.ruleType === 'SPAM') {
        await this.trackSpam(userId);
      }

      return {
        allowed: rule.action === 'WARN',
        action: rule.action as ModerationResult['action'],
        ruleName: rule.name,
        message: rule.message ?? undefined,
      };
    }

    return { allowed: true };
  }

  /**
   * Check for flood/spam pattern.
   */
  async checkFlood(
    userId: string,
    windowSeconds: number = 10,
    maxMessages: number = 5
  ): Promise<boolean> {
    const key = `mod:flood:${userId}`;

    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      return count > maxMessages;
    } catch {
      return false;
    }
  }

  private testRule(rule: CachedRule, message: string, _userId: string): boolean {
    const lowerMessage = message.toLowerCase();

    switch (rule.ruleType) {
      case 'KEYWORD': {
        try {
          const keywords: string[] = JSON.parse(rule.pattern);
          return keywords.some((kw) => lowerMessage.includes(kw.toLowerCase()));
        } catch {
          return lowerMessage.includes(rule.pattern.toLowerCase());
        }
      }

      case 'REGEX': {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          return regex.test(message);
        } catch {
          this.logger.warn('Invalid moderation regex', { rule: rule.name, pattern: rule.pattern });
          return false;
        }
      }

      case 'LINK': {
        const urlPattern = /https?:\/\/[^\s]+/i;
        if (!urlPattern.test(message)) return false;
        // If pattern is provided, check against allowed/blocked domains
        try {
          const blocked: string[] = JSON.parse(rule.pattern);
          return blocked.some((domain) => lowerMessage.includes(domain.toLowerCase()));
        } catch {
          return true; // block all links if no pattern
        }
      }

      case 'SPAM': {
        // Spam check is handled separately via Redis flood detection
        return false; // handled in checkFlood
      }

      default:
        return false;
    }
  }

  private async logModeration(
    userId: string,
    rule: CachedRule,
    originalMessage: string,
    platform: string
  ): Promise<void> {
    try {
      await this.db.moderationLog.create({
        data: {
          userId,
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType as any,
          action: rule.action as any,
          originalMessage: originalMessage.slice(0, 500),
          platform: platform.toUpperCase() as any,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log moderation event', error as Error);
    }
  }

  private async trackSpam(userId: string): Promise<void> {
    const key = `mod:spam:${userId}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 3600);
  }

  private async getRules(): Promise<CachedRule[]> {
    if (Date.now() < this.cacheExpiry && this.rulesCache.length > 0) {
      return this.rulesCache;
    }

    const rules = await this.db.moderationRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    this.rulesCache = rules.map((r: any) => ({
      id: r.id,
      name: r.name,
      ruleType: r.ruleType,
      pattern: r.pattern,
      action: r.action,
      message: r.message,
      priority: r.priority,
    }));
    this.cacheExpiry = Date.now() + this.cacheTtlMs;

    return this.rulesCache;
  }

  /**
   * CRUD for admin.
   */
  async createRule(data: {
    name: string;
    ruleType: string;
    pattern: string;
    action?: string;
    message?: string;
    priority?: number;
  }): Promise<any> {
    const rule = await this.db.moderationRule.create({
      data: {
        name: data.name,
        ruleType: data.ruleType as any,
        pattern: data.pattern,
        action: (data.action ?? 'WARN') as any,
        message: data.message ?? null,
        priority: data.priority ?? 0,
      },
    });
    this.cacheExpiry = 0; // invalidate cache
    return rule;
  }

  async deleteRule(name: string): Promise<void> {
    await this.db.moderationRule.deleteMany({ where: { name } });
    this.cacheExpiry = 0;
  }

  async listRules(): Promise<any[]> {
    return this.db.moderationRule.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  async getStats(days: number = 7): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.db.moderationLog.groupBy({
      by: ['ruleType', 'action'],
      where: { createdAt: { gte: since } },
      _count: true,
    } as any);
  }
}
