import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';

export interface ICommandHandler {
  getName(): string;
  getDescription(): string;
  getCategory(): string;
  getRequiredRole(): string;
  isAIPowered(): boolean;
  validate(input: string): Promise<void>;
  execute(context: CommandContext): Promise<CommandResult>;
}

export interface CommandMetadata {
  name: string;
  description: string;
  category: string;
  requiredRole: string;
  aiPowered: boolean;
  examples: string[];
}

export abstract class BaseCommandHandler implements ICommandHandler {
  constructor(protected logger: ILogger) {}

  abstract getName(): string;
  abstract getDescription(): string;
  abstract getCategory(): string;
  abstract execute(context: CommandContext): Promise<CommandResult>;

  getRequiredRole(): string {
    return 'user';
  }

  isAIPowered(): boolean {
    return false;
  }

  async validate(input: string): Promise<void> {
    if (!input || input.trim().length === 0) {
      throw new Error('Input cannot be empty');
    }
  }

  protected createResult(success: boolean, message: string, data?: any): CommandResult {
    return { success, message, data };
  }

  protected createErrorResult(error: string): CommandResult {
    return {
      success: false,
      message: 'Command execution failed',
      error
    };
  }
}
