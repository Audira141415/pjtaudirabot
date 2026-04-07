import { ILogger } from '@pjtaudirabot/core';
import {
  IMemoryManager,
  IShortTermMemory,
  ILongTermMemory,
  ISemanticMemory,
  IMemoryExtractor,
  IContextBuilder,
} from './types';

export class MemoryManager implements IMemoryManager {
  constructor(
    private shortTerm: IShortTermMemory,
    private longTerm: ILongTermMemory,
    private semantic: ISemanticMemory,
    private extractor: IMemoryExtractor,
    private contextBuilder: IContextBuilder,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'memory-manager' });
  }

  /**
   * Called BEFORE sending user message to AI.
   * Returns a memory context string to prepend to the AI system prompt.
   */
  async beforeAI(userId: string, message: string): Promise<string> {
    try {
      return await this.contextBuilder.build(userId, message);
    } catch (error) {
      this.logger.error('Failed to build memory context', error as Error);
      return '';
    }
  }

  /**
   * Called AFTER receiving AI response.
   * Stores messages in short-term memory, extracts facts for long-term,
   * and indexes content for semantic search.
   */
  async afterAI(
    userId: string,
    userMessage: string,
    assistantMessage: string
  ): Promise<void> {
    const now = Date.now();

    try {
      // 1. Store in short-term memory
      await Promise.all([
        this.shortTerm.addMessage(userId, {
          role: 'user',
          content: userMessage,
          timestamp: now,
        }),
        this.shortTerm.addMessage(userId, {
          role: 'assistant',
          content: assistantMessage,
          timestamp: now,
        }),
      ]);

      // 2. Extract and store long-term facts (from user message only)
      const facts = await this.extractor.extract(userMessage);
      if (facts.length > 0) {
        this.logger.info('Extracted memory facts', {
          userId,
          count: facts.length,
          facts: facts.map((f) => `${f.category}:${f.key}`),
        });

        await Promise.all(
          facts.map((fact) => this.longTerm.storeFact(userId, fact, userMessage))
        );
      }

      // 3. Index the exchange for semantic search
      const combined = `User: ${userMessage}\nAssistant: ${assistantMessage}`;
      await this.semantic.store(userId, combined, {
        timestamp: now,
        type: 'conversation',
      });
    } catch (error) {
      // Memory operations are non-critical — don't fail the bot
      this.logger.error('Failed to process memory after AI', error as Error);
    }
  }

  /**
   * Clear all memory types for a user.
   */
  async clearAll(userId: string): Promise<void> {
    await Promise.all([
      this.shortTerm.clear(userId),
      this.semantic.clear(userId),
    ]);

    this.logger.info('All memory cleared', { userId });
  }

  /**
   * Periodic maintenance — clean expired long-term memories.
   */
  async maintenance(): Promise<void> {
    const cleaned = await this.longTerm.cleanExpired();
    if (cleaned > 0) {
      this.logger.info('Memory maintenance completed', { expiredCleaned: cleaned });
    }
  }
}
