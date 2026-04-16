import {
  CommandContext,
  CommandResult,
  ILogger,
  RateLimitError,
  UnauthorizedError,
  ValidationError
} from '@pjtaudirabot/core';
import { CommandRegistry } from './registry';

export interface IRateLimiter {
  check(userId: string, commandName: string): Promise<boolean>;
  getRemainingTime(userId: string, commandName: string): Promise<number>;
}

export class CommandExecutor {
  constructor(
    private registry: CommandRegistry,
    private rateLimiter: IRateLimiter,
    private logger: ILogger
  ) {}

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      // Parse command name from input
      const commandName = this.parseCommandName(context.input);

      // Check if command exists
      const handler = this.registry.get(commandName);
      if (!handler) {
        return {
          success: false,
          message: `Command '${commandName}' not found`,
          error: `Unknown command. Type '!help' for available commands.`
        };
      }

      // Check rate limits
      const withinLimits = await this.rateLimiter.check(context.user.id, commandName);
      if (!withinLimits) {
        const remaining = await this.rateLimiter.getRemainingTime(
          context.user.id,
          commandName
        );
        throw new RateLimitError(remaining);
      }

      // Check permissions
      if (!this.hasPermission(context, handler)) {
        throw new UnauthorizedError(
          `Insufficient permissions to execute command '${commandName}'`
        );
      }

      // Validate input
      try {
        await handler.validate(context.input);
      } catch (error) {
        throw new ValidationError((error as Error).message);
      }

      // Execute command
      this.logger.info(`Executing command: ${commandName}`, {
        userId: context.user.id,
        platform: context.platform
      });

      const startTime = Date.now();
      const result = await handler.execute(context);
      const executionTime = Date.now() - startTime;

      this.logger.info(`Command executed: ${commandName}`, {
        duration: executionTime,
        success: result.success
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Command execution error: ${err.message}`, error as Error);

      if (error instanceof RateLimitError) {
        return {
          success: false,
          message: error.message,
          error: 'RATE_LIMIT_EXCEEDED'
        };
      }

      if (error instanceof UnauthorizedError) {
        return {
          success: false,
          message: error.message,
          error: 'UNAUTHORIZED'
        };
      }

      if (error instanceof ValidationError) {
        return {
          success: false,
          message: error.message,
          error: 'VALIDATION_ERROR'
        };
      }

      return {
        success: false,
        message: 'An error occurred while executing the command',
        error: err.message
      };
    }
  }

  private parseCommandName(input: string): string {
    // Remove ! prefix and get first word
    const cleaned = input.replace(/^!/, '').trim();
    const parts = cleaned.split(/\s+/);
    return parts[0].toLowerCase();
  }

  private hasPermission(context: CommandContext, handler: any): boolean {
    const requiredRole = handler.getRequiredRole()?.toLowerCase() || 'user';
    const userRole = context.user.role?.toLowerCase() || 'user';

    const roleHierarchy: Record<string, number> = {
      user: 1,
      moderator: 2,
      admin: 3
    };

    return (roleHierarchy[userRole] || 1) >= (roleHierarchy[requiredRole] || 1);
  }
}
