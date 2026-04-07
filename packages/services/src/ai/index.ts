import { ILogger } from '@pjtaudirabot/core';
import { RedisClientType } from 'redis';
import { IAIProvider, AIMessage, AIResponse, AIServiceConfig, AIRequestOptions } from './types';
import { OpenAIProvider, MockAIProvider } from './providers';
import { IMemoryManager } from '../memory/types';

export { IAIProvider, AIMessage, AIResponse, AIServiceConfig, AIRequestOptions } from './types';
export { OpenAIProvider, MockAIProvider } from './providers';

const SYSTEM_PROMPT = `You are a helpful assistant integrated into a multi-platform chat bot. 
Be concise and helpful. Keep responses under 500 words unless asked for more detail. 
Format your responses for chat readability.`;

export class AIService {
  private provider: IAIProvider;
  private redis: RedisClientType;
  private logger: ILogger;
  private contextTtl: number;
  private memoryManager?: IMemoryManager;

  constructor(
    config: AIServiceConfig,
    redis: RedisClientType,
    logger: ILogger,
    contextTtl: number = 3600,
    memoryManager?: IMemoryManager
  ) {
    this.redis = redis;
    this.logger = logger.child({ service: 'ai' });
    this.contextTtl = contextTtl;
    this.provider = this.createProvider(config);
    this.memoryManager = memoryManager;
  }

  setMemoryManager(manager: IMemoryManager): void {
    this.memoryManager = manager;
  }

  getProvider(): IAIProvider {
    return this.provider;
  }

  private createProvider(config: AIServiceConfig): IAIProvider {
    switch (config.provider) {
      case 'openai': {
        if (!config.openai?.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        return new OpenAIProvider(
          config.openai.apiKey,
          config.openai.model,
          config.openai.temperature,
          this.logger
        );
      }
      case 'mock':
        return new MockAIProvider(this.logger);
      default:
        this.logger.warn(`Unknown AI provider "${config.provider}", falling back to mock`);
        return new MockAIProvider(this.logger);
    }
  }

  async chat(
    userId: string,
    message: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const history = await this.getConversationHistory(userId);

    // Build memory context if available
    let memoryContext = '';
    if (this.memoryManager) {
      memoryContext = await this.memoryManager.beforeAI(userId, message);
    }

    const systemMessage = memoryContext
      ? `${SYSTEM_PROMPT}\n\n${memoryContext}`
      : SYSTEM_PROMPT;

    const messages: AIMessage[] = [
      { role: 'system', content: systemMessage },
      ...history,
      { role: 'user', content: message },
    ];

    this.logger.info('AI chat request', {
      userId,
      provider: this.provider.name,
      historyLength: history.length,
      hasMemoryContext: memoryContext.length > 0,
    });

    const response = await this.provider.chat(messages, options);

    await this.appendToHistory(userId, [
      { role: 'user', content: message },
      { role: 'assistant', content: response.content },
    ]);

    // Store in memory system after AI response
    if (this.memoryManager) {
      // Fire-and-forget to avoid slowing down response
      this.memoryManager.afterAI(userId, message, response.content).catch((err) => {
        this.logger.error('Memory afterAI failed', err as Error);
      });
    }

    this.logger.info('AI chat response', {
      userId,
      model: response.model,
      tokens: response.usage.totalTokens,
    });

    return response;
  }

  async clearHistory(userId: string): Promise<void> {
    const key = this.historyKey(userId);
    await this.redis.del(key);

    if (this.memoryManager) {
      await this.memoryManager.clearAll(userId);
    }

    this.logger.debug('Cleared AI history and memory', { userId });
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  private historyKey(userId: string): string {
    return `ai:history:${userId}`;
  }

  private async getConversationHistory(userId: string): Promise<AIMessage[]> {
    try {
      const raw = await this.redis.get(this.historyKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AIMessage[];
      // Keep last 10 exchanges (20 messages) to control token usage
      return parsed.slice(-20);
    } catch {
      return [];
    }
  }

  private async appendToHistory(userId: string, messages: AIMessage[]): Promise<void> {
    try {
      const existing = await this.getConversationHistory(userId);
      const updated = [...existing, ...messages].slice(-20);
      await this.redis.set(
        this.historyKey(userId),
        JSON.stringify(updated),
        { EX: this.contextTtl }
      );
    } catch (error) {
      this.logger.error('Failed to save AI history', error as Error);
    }
  }
}
