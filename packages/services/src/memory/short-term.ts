import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';
import { IShortTermMemory, ShortTermMessage } from './types';

const DEFAULT_MAX_MESSAGES = 20;
const DEFAULT_TTL_SECONDS = 86400; // 24 hours

export class ShortTermMemory implements IShortTermMemory {
  private maxMessages: number;
  private ttlSeconds: number;

  constructor(
    private redis: RedisClientType,
    private logger: ILogger,
    maxMessages: number = DEFAULT_MAX_MESSAGES,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
  ) {
    this.logger = logger.child({ service: 'short-term-memory' });
    this.maxMessages = maxMessages;
    this.ttlSeconds = ttlSeconds;
  }

  async addMessage(userId: string, message: ShortTermMessage): Promise<void> {
    const key = this.key(userId);

    try {
      const entry = JSON.stringify(message);
      await this.redis.rPush(key, entry);
      await this.redis.lTrim(key, -this.maxMessages, -1);
      await this.redis.expire(key, this.ttlSeconds);
    } catch (error) {
      this.logger.error('Failed to add short-term message', error as Error);
    }
  }

  async getMessages(userId: string, limit?: number): Promise<ShortTermMessage[]> {
    const key = this.key(userId);

    try {
      const count = limit ?? this.maxMessages;
      const raw = await this.redis.lRange(key, -count, -1);
      return raw.map((item) => JSON.parse(item) as ShortTermMessage);
    } catch (error) {
      this.logger.error('Failed to get short-term messages', error as Error);
      return [];
    }
  }

  async clear(userId: string): Promise<void> {
    await this.redis.del(this.key(userId));
    this.logger.debug('Cleared short-term memory', { userId });
  }

  private key(userId: string): string {
    return `memory:short:${userId}`;
  }
}
