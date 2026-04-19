import { PrismaClient } from '@prisma/client';
import { ILogger, Platform, User } from '@pjtaudirabot/core';
import { RedisClientType } from 'redis';

export class UserService {
  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'user' });
  }

  async findOrCreate(
    platform: Platform,
    platformUserId: string,
    displayName: string,
    extra?: { phoneNumber?: string; username?: string }
  ): Promise<User & { linkedAccounts?: string[] }> {
    const cacheKey = `user:${platform}:${platformUserId}`;

    // Check cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as User;
      }
    } catch { /* proceed to DB */ }

    const platformEnum = platform.toUpperCase() as any;

    let record = await this.db.user.findUnique({
      where: {
        platform_platformUserId: {
          platform: platformEnum,
          platformUserId,
        },
      },
    });

    if (!record) {
      record = await this.db.user.create({
        data: {
          platform: platformEnum,
          platformUserId,
          displayName,
          phoneNumber: extra?.phoneNumber,
          username: extra?.username,
        },
      });
      this.logger.info('User created', { userId: record.id, platform });
    }

    // Update last activity
    await this.db.user.update({
      where: { id: record.id },
      data: { lastActivityAt: new Date() },
    });

    const user: User = {
      id: record.id,
      platform: record.platform.toLowerCase() as Platform,
      platformUserId: record.platformUserId,
      phoneNumber: record.phoneNumber ?? undefined,
      username: record.username ?? undefined,
      displayName: record.displayName,
      profileImage: record.profileImage ?? undefined,
      role: record.role.toLowerCase() as any,
      status: record.status.toLowerCase() as any,
      settings: record.settings as Record<string, any>,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastActivityAt: record.lastActivityAt ?? undefined,
    };

    // Unified Identity Linking Logic
    if (record.phoneNumber) {
      const linked = await this.db.user.findMany({
        where: { 
          phoneNumber: record.phoneNumber,
          id: { not: record.id }
        },
        select: { platform: true }
      });
      if (linked.length > 0) {
        (user as any).linkedAccounts = linked.map(l => l.platform);
      }
    }

    // Cache for 5 minutes
    try {
      await this.redis.set(cacheKey, JSON.stringify(user), { EX: 300 });
    } catch { /* non-critical */ }

    return user;
  }

  /** Update a user's role */
  async setRole(userId: string, role: 'user' | 'moderator' | 'admin'): Promise<void> {
    const roleEnum = role.toUpperCase() as any;
    await this.db.user.update({ where: { id: userId }, data: { role: roleEnum } });

    // Invalidate cache for all platforms
    const record = await this.db.user.findUnique({ where: { id: userId } });
    if (record) {
      const cacheKey = `user:${record.platform.toLowerCase()}:${record.platformUserId}`;
      await this.redis.del(cacheKey).catch(() => {});
    }

    this.logger.info('User role updated', { userId, role });
  }

  /** Promote to admin by platformUserId */
  async promoteToAdmin(platform: string, platformUserId: string): Promise<boolean> {
    const platformEnum = platform.toUpperCase() as any;
    const record = await this.db.user.findUnique({
      where: { platform_platformUserId: { platform: platformEnum, platformUserId } },
    });
    if (!record) return false;

    await this.setRole(record.id, 'admin');
    return true;
  }

  /** Check if any admin exists */
  async hasAdmin(): Promise<boolean> {
    const count = await this.db.user.count({ where: { role: 'ADMIN' } });
    return count > 0;
  }

  /**
   * Fetches the unified identity across platforms for a specific user.
   */
  async getUnifiedProfile(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || !user.phoneNumber) return { user, linked: [] };

    const linked = await this.db.user.findMany({
      where: { 
        phoneNumber: user.phoneNumber,
        id: { not: userId }
      }
    });

    return {
      primary: user,
      linked,
      identityScore: linked.length > 0 ? 1.0 : 0.5
    };
  }
}
