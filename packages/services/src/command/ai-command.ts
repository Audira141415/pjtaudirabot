import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { AIService } from '../ai';

export class AICommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private aiService: AIService
  ) {
    super(logger);
  }

  getName(): string {
    return 'ai';
  }

  getDescription(): string {
    return 'Chat with AI assistant';
  }

  getCategory(): string {
    return 'ai';
  }

  isAIPowered(): boolean {
    return true;
  }

  async validate(input: string): Promise<void> {
    const message = input.replace(/^!ai\s*/, '').trim();
    if (!message) {
      throw new Error('Usage: !ai <message>\nExample: !ai What is TypeScript?');
    }
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const message = context.input.replace(/^!ai\s+/, '').trim();

    try {
      const response = await this.aiService.chat(context.user.id, message);

      return this.createResult(true, response.content, {
        model: response.model,
        tokens: response.usage.totalTokens,
      });
    } catch (error) {
      this.logger.error('AI command failed', error as Error);
      return this.createErrorResult(
        'AI service is currently unavailable. Please try again later.'
      );
    }
  }
}

export class AIClearCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private aiService: AIService
  ) {
    super(logger);
  }

  getName(): string {
    return 'aiclear';
  }

  getDescription(): string {
    return 'Clear your AI conversation history';
  }

  getCategory(): string {
    return 'ai';
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    await this.aiService.clearHistory(context.user.id);
    return this.createResult(true, '🧹 AI conversation history cleared.');
  }
}
