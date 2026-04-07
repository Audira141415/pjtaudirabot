import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { ILogger } from '@pjtaudirabot/core';
import { ISemanticMemory, SimilarityResult } from './types';

export interface SemanticMemoryConfig {
  openaiApiKey: string;
  embeddingModel?: string;
  dimensions?: number;
}

export class SemanticMemory implements ISemanticMemory {
  private openai: OpenAI;
  private model: string;
  private dimensions: number;

  constructor(
    private db: PrismaClient,
    config: SemanticMemoryConfig,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'semantic-memory' });
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.model = config.embeddingModel ?? 'text-embedding-3-small';
    this.dimensions = config.dimensions ?? 1536;
  }

  async store(
    userId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const embedding = await this.embed(content);
    const buffer = Buffer.from(embedding.buffer);

    await this.db.memoryEmbedding.create({
      data: {
        userId,
        content,
        embedding: buffer,
        dimensions: this.dimensions,
        metadata: (metadata ?? {}) as any,
      },
    });

    this.logger.debug('Stored semantic memory', { userId, contentLength: content.length });
  }

  async search(
    userId: string,
    query: string,
    topK: number = 5
  ): Promise<SimilarityResult[]> {
    const queryEmbedding = await this.embed(query);

    // Retrieve all embeddings for user and compute cosine similarity in-app.
    // For production at scale, consider pgvector or a dedicated vector DB.
    const records = await this.db.memoryEmbedding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200, // cap for memory safety
    });

    if (records.length === 0) return [];

    const scored: SimilarityResult[] = records.map((record: any) => {
      const stored = new Float32Array(
        record.embedding.buffer,
        record.embedding.byteOffset,
        record.embedding.byteLength / Float32Array.BYTES_PER_ELEMENT
      );

      const score = this.cosineSimilarity(queryEmbedding, stored);

      return {
        content: record.content,
        score,
        metadata: record.metadata as Record<string, unknown>,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).filter((r) => r.score > 0.3);
  }

  async clear(userId: string): Promise<void> {
    await this.db.memoryEmbedding.deleteMany({ where: { userId } });
    this.logger.debug('Cleared semantic memory', { userId });
  }

  private async embed(text: string): Promise<Float32Array> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: text,
    });

    return new Float32Array(response.data[0].embedding);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    if (magnitude === 0) return 0;

    return dot / magnitude;
  }
}

/**
 * No-op semantic memory for when embeddings are disabled (no API key).
 */
export class NoOpSemanticMemory implements ISemanticMemory {
  async store(): Promise<void> {
    // no-op
  }

  async search(): Promise<SimilarityResult[]> {
    return [];
  }

  async clear(): Promise<void> {
    // no-op
  }
}
