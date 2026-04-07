import { RedisClientType } from 'redis';
import { PrismaClient } from '@prisma/client';
import { ILogger, Platform } from '@pjtaudirabot/core';
import { randomBytes } from 'crypto';

export interface SessionData {
  id: string;
  userId: string;
  platform: Platform;
  token: string;
  metadata: Record<string, unknown>;
  expiresAt: Date;
}

export class SessionService {
  private cacheTtl: number;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    private logger: ILogger,
    cacheTtl: number = 86400 // 24h default
  ) {
    this.cacheTtl = cacheTtl;
    this.logger = logger.child({ service: 'session' });
  }

  async getOrCreate(userId: string, platform: Platform): Promise<SessionData> {
    // Check cache first
    const cached = await this.getFromCache(userId, platform);
    if (cached) return cached;

    // Check DB for active session
    const existing = await this.db.session.findFirst({
      where: {
        userId,
        botPlatform: platform.toUpperCase() as any,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      const session = this.toSessionData(existing);
      await this.setCache(session);
      return session;
    }

    // Create new session
    return this.create(userId, platform);
  }

  async create(userId: string, platform: Platform): Promise<SessionData> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.cacheTtl * 1000);

    const created = await this.db.session.create({
      data: {
        userId,
        botPlatform: platform.toUpperCase() as any,
        sessionToken: token,
        expiresAt,
        isActive: true,
        metadata: {},
      },
    });

    const session = this.toSessionData(created);
    await this.setCache(session);

    this.logger.info('Session created', { userId, platform, sessionId: session.id });
    return session;
  }

  async invalidate(userId: string, platform: Platform): Promise<void> {
    await this.db.session.updateMany({
      where: {
        userId,
        botPlatform: platform.toUpperCase() as any,
        isActive: true,
      },
      data: { isActive: false },
    });

    await this.redis.del(this.cacheKey(userId, platform));
    this.logger.info('Session invalidated', { userId, platform });
  }

  async updateMetadata(
    sessionId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.db.session.update({
      where: { id: sessionId },
      data: { metadata: metadata as any },
    });
  }

  private cacheKey(userId: string, platform: Platform): string {
    return `session:${platform}:${userId}`;
  }

  private async getFromCache(userId: string, platform: Platform): Promise<SessionData | null> {
    try {
      const raw = await this.redis.get(this.cacheKey(userId, platform));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SessionData;
      if (new Date(parsed.expiresAt) <= new Date()) {
        await this.redis.del(this.cacheKey(userId, platform));
        return null;
      }
      return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
    } catch {
      return null;
    }
  }

  private async setCache(session: SessionData): Promise<void> {
    try {
      await this.redis.set(
        this.cacheKey(session.userId, session.platform),
        JSON.stringify(session),
        { EX: this.cacheTtl }
      );
    } catch (error) {
      this.logger.error('Failed to cache session', error as Error);
    }
  }

  private toSessionData(record: any): SessionData {
    return {
      id: record.id,
      userId: record.userId,
      platform: record.botPlatform.toLowerCase() as Platform,
      token: record.sessionToken,
      metadata: record.metadata as Record<string, unknown>,
      expiresAt: record.expiresAt,
    };
  }
}
