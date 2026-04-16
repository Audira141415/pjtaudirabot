import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { ISemanticMemory } from '../memory';

export class KnowledgeBaseService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private semanticMemory: ISemanticMemory,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'knowledge-base' });
  }

  /**
   * Detect if a message is a knowledge query.
   */
  detectQuery(message: string): boolean {
    return /\b(apa|what|how|bagaimana|kenapa|why|gimana|kapan|when|dimana|where)\b.*\?/i.test(message)
      || /\b(solusi|solution|cara|way|method)\b.*\b(error|issue|problem|masalah)\b/i.test(message);
  }

  /**
   * Search the knowledge base using hybrid approach (Keywords + Semantic).
   */
  async search(userId: string, query: string): Promise<any[]> {
    // A) Keyword Search
    const keywords = query
      .replace(/[?!.,]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const keywordEntries = keywords.length > 0 
      ? await this.db.knowledgeEntry.findMany({
          where: {
            userId,
            OR: [
              ...keywords.map((kw) => ({ topic: { contains: kw, mode: 'insensitive' as const } })),
              ...keywords.map((kw) => ({ question: { contains: kw, mode: 'insensitive' as const } })),
              ...keywords.map((kw) => ({ answer: { contains: kw, mode: 'insensitive' as const } })),
            ],
          },
          take: 5,
        })
      : [];

    // B) Semantic Search (RAG)
    const semanticResults = await this.semanticMemory.search(userId, query, 3);
    const semanticIds = semanticResults
      .map(r => r.metadata?.knowledgeEntryId as string)
      .filter(Boolean);

    const semanticEntries = semanticIds.length > 0
      ? await this.db.knowledgeEntry.findMany({
          where: { id: { in: semanticIds } }
        })
      : [];

    // Combine and Deduplicate
    const combined = [...keywordEntries];
    for (const sem of semanticEntries) {
      if (!combined.some(k => k.id === sem.id)) {
        combined.push(sem);
      }
    }

    const results = combined.slice(0, 5);

    // Update reference counts
    for (const entry of results) {
      await this.db.knowledgeEntry.update({
        where: { id: entry.id },
        data: {
          referenceCount: { increment: 1 },
          lastReferencedAt: new Date(),
        },
      });
    }

    return results;
  }

  /**
   * Store knowledge from a conversation.
   */
  async store(
    userId: string,
    topic: string,
    question: string,
    answer: string,
    sourceMessages?: string[]
  ): Promise<{ id: string }> {
    const entry = await this.db.knowledgeEntry.create({
      data: {
        userId,
        topic,
        question,
        answer,
        tags: this.extractTags(topic + ' ' + answer),
        sourceMessages: sourceMessages ?? [],
      },
    });

    // C) Strategic Semantic Indexing (Phase 3)
    // We index the question + answer for high-affinity RAG retrieval
    const indexContent = `Topic: ${topic}\nQuestion: ${question}\nAnswer: ${answer}`;
    await this.semanticMemory.store(userId, indexContent, {
      type: 'knowledge',
      knowledgeEntryId: entry.id,
      topic
    });

    this.logger.info('Knowledge stored and indexed semantically', { id: entry.id, topic });
    return { id: entry.id };
  }

  /**
   * Auto-extract knowledge from incident resolution.
   */
  async storeFromIncident(
    userId: string,
    incident: {
      title: string;
      service?: string;
      rootCause?: string;
      solution?: string;
      description: string;
    }
  ): Promise<void> {
    if (!incident.solution) return;

    const topic = incident.service ?? 'general';
    const question = `How to fix: ${incident.title}`;
    const answer = [
      incident.rootCause ? `Root cause: ${incident.rootCause}` : '',
      `Solution: ${incident.solution}`,
    ].filter(Boolean).join('\n');

    await this.store(userId, topic, question, answer, [incident.description]);
  }

  /**
   * Format search results for chat.
   */
  formatResults(results: any[]): string {
    if (results.length === 0) {
      return '🔍 No matching knowledge found. I\'ll remember this topic for later.';
    }

    let msg = `📚 *Knowledge Base Results*\n\n`;
    for (let i = 0; i < results.length; i++) {
      msg += `${i + 1}. *${results[i].topic}*\n`;
      msg += `   Q: ${results[i].question}\n`;
      msg += `   A: ${results[i].answer}\n\n`;
    }
    return msg;
  }

  /**
   * List all topics for a user.
   */
  async listTopics(userId: string): Promise<string[]> {
    const entries = await this.db.knowledgeEntry.findMany({
      where: { userId },
      select: { topic: true },
      distinct: ['topic'],
      orderBy: { topic: 'asc' },
    });
    return entries.map((e: any) => e.topic);
  }

  private extractTags(text: string): string[] {
    const tags: string[] = [];
    const map: Record<string, RegExp> = {
      nginx: /\bnginx\b/i,
      docker: /\bdocker\b/i,
      database: /\b(database|postgres|mysql|redis)\b/i,
      network: /\b(network|dns|ssl|port)\b/i,
      server: /\b(server|vm|vps)\b/i,
      deploy: /\b(deploy|ci|cd)\b/i,
    };
    for (const [tag, re] of Object.entries(map)) {
      if (re.test(text)) tags.push(tag);
    }
    return tags;
  }
}
