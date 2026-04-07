import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

export interface RateLimiterConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Max requests per window
  strategy: 'sliding' | 'fixed'; // sliding or fixed window
}

export interface RateLimitStatus {
  limited: boolean;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

export class RedisRateLimiter {
  constructor(
    private redis: RedisClientType,
    private config: RateLimiterConfig,
    private logger: ILogger
  ) {}

  private getKey(userId: string, commandName: string): string {
    return `ratelimit:${userId}:${commandName}`;
  }

  async check(userId: string, commandName: string): Promise<boolean> {
    try {
      const key = this.getKey(userId, commandName);
      const current = await this.redis.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await this.redis.pExpire(key, this.config.windowMs);
      }

      return current <= this.config.maxRequests;
    } catch (error) {
      this.logger.error('Rate limiter check failed', error as Error);
      // Fail open - allow request if Redis fails
      return true;
    }
  }

  async getStatus(userId: string, commandName: string): Promise<RateLimitStatus> {
    try {
      const key = this.getKey(userId, commandName);
      const current = await this.redis.get(key);
      const ttl = await this.redis.pTTL(key);

      const count = parseInt(current || '0', 10);
      const remaining = Math.max(0, this.config.maxRequests - count);
      const limited = count > this.config.maxRequests;
      const retryAfter = ttl > 0 ? Math.ceil(ttl / 1000) : 0;

      return {
        limited,
        remaining,
        resetTime: ttl > 0 ? Date.now() + ttl : 0,
        retryAfter
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit status', error as Error);
      return {
        limited: false,
        remaining: this.config.maxRequests,
        resetTime: 0,
        retryAfter: 0
      };
    }
  }

  async reset(userId: string, commandName?: string): Promise<void> {
    try {
      if (commandName) {
        const key = this.getKey(userId, commandName);
        await this.redis.del(key);
      } else {
        // Reset all commands for user
        const pattern = `ratelimit:${userId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      }
    } catch (error) {
      this.logger.error('Failed to reset rate limit', error as Error);
    }
  }

  async getRemainingTime(userId: string, commandName: string): Promise<number> {
    try {
      const key = this.getKey(userId, commandName);
      const ttl = await this.redis.pTTL(key);
      return ttl > 0 ? Math.ceil(ttl / 1000) : 0;
    } catch (error) {
      this.logger.error('Failed to get remaining time', error as Error);
      return 0;
    }
  }
}
