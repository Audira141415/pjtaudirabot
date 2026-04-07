import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { ILogger } from '@pjtaudirabot/core';
import { RedisClientType } from 'redis';

export interface SummaryConfig {
  openaiApiKey?: string;
  model?: string;
  summaryThreshold?: number; // min messages before summarizing
}

const SUMMARY_PROMPT = `Summarize the following conversation between a user and an AI assistant. 
Capture key topics, decisions, questions, and any action items. Be concise (2-4 sentences).
Use the user's language if not English.`;

export class ConversationSummaryService {
  private openai?: OpenAI;
  private model: string;
  private threshold: number;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    config: SummaryConfig,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'summary' });
    this.model = config.model ?? 'gpt-3.5-turbo';
    this.threshold = config.summaryThreshold ?? 10;

    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  /**
   * Summarize recent conversation from short-term memory.
   */
  async summarize(
    userId: string,
    platform: string
  ): Promise<string | null> {
    // Get recent messages from Redis short-term memory
    const key = `memory:short:${userId}`;
    const messages = await this.redis.lRange(key, 0, -1);

    if (messages.length < this.threshold) {
      return null; // not enough to summarize
    }

    const conversation = messages
      .map((raw) => {
        const msg = JSON.parse(raw);
        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      })
      .join('\n');

    let summary: string;

    if (this.openai) {
      summary = await this.aiSummarize(conversation);
    } else {
      summary = this.simpleSummarize(messages);
    }

    // Store in DB
    const now = new Date();
    const firstMsg = JSON.parse(messages[0]);
    const startedAt = new Date(firstMsg.timestamp);

    await this.db.conversationSummary.create({
      data: {
        userId,
        platform: platform.toUpperCase() as any,
        summary,
        messageCount: messages.length,
        startedAt,
        endedAt: now,
      },
    });

    this.logger.info('Conversation summarized', {
      userId,
      messageCount: messages.length,
      summaryLength: summary.length,
    });

    return summary;
  }

  /**
   * Get recent summaries for a user.
   */
  async getUserSummaries(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    return this.db.conversationSummary.findMany({
      where: { userId },
      orderBy: { endedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get latest summary for context injection.
   */
  async getLatestSummary(userId: string): Promise<string | null> {
    const latest = await this.db.conversationSummary.findFirst({
      where: { userId },
      orderBy: { endedAt: 'desc' },
    });

    return latest?.summary ?? null;
  }

  private async aiSummarize(conversation: string): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not configured');

    // Truncate if too long
    const truncated = conversation.length > 4000
      ? conversation.slice(-4000)
      : conversation;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: truncated },
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    return response.choices[0]?.message?.content?.trim() ?? 'Unable to generate summary.';
  }

  private simpleSummarize(messages: string[]): string {
    const count = messages.length;
    const parsed = messages.map((m) => JSON.parse(m));
    const userMessages = parsed.filter((m: any) => m.role === 'user');
    const topics = userMessages
      .slice(-5)
      .map((m: any) => {
        const text = m.content as string;
        return text.length > 50 ? text.slice(0, 50) + '...' : text;
      });

    return `Conversation with ${count} messages. Recent topics: ${topics.join('; ')}`;
  }

  /**
   * Cleanup old summaries.
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.db.conversationSummary.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return result.count;
  }
}
