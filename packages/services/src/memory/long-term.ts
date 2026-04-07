import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { ILongTermMemory, MemoryFact, MemoryCategory, ExtractedFact } from './types';

export class LongTermMemory implements ILongTermMemory {
  constructor(
    private db: PrismaClient,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'long-term-memory' });
  }

  async storeFact(
    userId: string,
    fact: ExtractedFact,
    source?: string
  ): Promise<MemoryFact> {
    const categoryEnum = fact.category as any;

    const record = await this.db.userMemory.upsert({
      where: {
        userId_category_key: {
          userId,
          category: categoryEnum,
          key: fact.key,
        },
      },
      create: {
        userId,
        category: categoryEnum,
        key: fact.key,
        value: fact.value,
        confidence: fact.confidence,
        source: source ?? null,
      },
      update: {
        value: fact.value,
        confidence: fact.confidence,
        source: source ?? undefined,
        lastReferencedAt: new Date(),
      },
    });

    this.logger.debug('Fact stored', {
      userId,
      category: fact.category,
      key: fact.key,
    });

    return this.toMemoryFact(record);
  }

  async getFacts(
    userId: string,
    category?: MemoryCategory
  ): Promise<MemoryFact[]> {
    const where: Record<string, unknown> = { userId };

    if (category) {
      where.category = category;
    }

    // Exclude expired facts
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    const records = await this.db.userMemory.findMany({
      where: where as any,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((r: any) => this.toMemoryFact(r));
  }

  async getFact(
    userId: string,
    category: MemoryCategory,
    key: string
  ): Promise<MemoryFact | null> {
    const record = await this.db.userMemory.findUnique({
      where: {
        userId_category_key: {
          userId,
          category: category as any,
          key,
        },
      },
    });

    if (!record) return null;

    // Check expiry
    if (record.expiresAt && record.expiresAt < new Date()) {
      await this.db.userMemory.delete({ where: { id: record.id } });
      return null;
    }

    // Touch lastReferencedAt
    await this.db.userMemory.update({
      where: { id: record.id },
      data: { lastReferencedAt: new Date() },
    });

    return this.toMemoryFact(record);
  }

  async deleteFact(
    userId: string,
    category: MemoryCategory,
    key: string
  ): Promise<void> {
    await this.db.userMemory.deleteMany({
      where: {
        userId,
        category: category as any,
        key,
      },
    });

    this.logger.debug('Fact deleted', { userId, category, key });
  }

  async cleanExpired(): Promise<number> {
    const result = await this.db.userMemory.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.info('Cleaned expired memories', { count: result.count });
    }

    return result.count;
  }

  private toMemoryFact(record: any): MemoryFact {
    return {
      id: record.id,
      userId: record.userId,
      category: record.category as MemoryCategory,
      key: record.key,
      value: record.value,
      confidence: record.confidence,
      source: record.source ?? undefined,
      lastReferencedAt: record.lastReferencedAt ?? undefined,
      expiresAt: record.expiresAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
