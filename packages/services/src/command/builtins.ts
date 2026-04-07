import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { CommandRegistry } from './registry';

export class HelpCommand extends BaseCommandHandler {
  private registry: CommandRegistry;

  constructor(logger: ILogger, registry: CommandRegistry) {
    super(logger);
    this.registry = registry;
  }

  getName(): string {
    return 'help';
  }

  getDescription(): string {
    return 'Show available commands';
  }

  getCategory(): string {
    return 'general';
  }

  async execute(_context: CommandContext): Promise<CommandResult> {
    const commands = this.registry.list();
    const categories = this.registry.getCategories();

    let helpText = '📚 Available Commands:\n\n';

    for (const category of categories) {
      const categoryCommands = commands.filter(cmd => cmd.category === category);
      helpText += `**${category.toUpperCase()}**\n`;
      categoryCommands.forEach(cmd => {
        helpText += `• !${cmd.name} - ${cmd.description}\n`;
      });
      helpText += '\n';
    }

    helpText += '💡 Tip: Use !command --help for more information about a specific command';

    return this.createResult(true, helpText);
  }
}

export class PingCommand extends BaseCommandHandler {
  getName(): string {
    return 'ping';
  }

  getDescription(): string {
    return 'Check bot responsiveness';
  }

  getCategory(): string {
    return 'general';
  }

  async execute(_context: CommandContext): Promise<CommandResult> {
    return this.createResult(true, '🏓 Pong!');
  }
}

export class StatusCommand extends BaseCommandHandler {
  getName(): string {
    return 'status';
  }

  getDescription(): string {
    return 'Get bot status and system info';
  }

  getCategory(): string {
    return 'general';
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    const statusInfo = {
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memory: {
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`
      },
      platform: context.platform,
      timestamp: new Date().toISOString()
    };

    return this.createResult(true, 'System Status', statusInfo);
  }
}

export class EchoCommand extends BaseCommandHandler {
  getName(): string {
    return 'echo';
  }

  getDescription(): string {
    return 'Echo back the message';
  }

  getCategory(): string {
    return 'utility';
  }

  async validate(input: string): Promise<void> {
    const parts = input.split(/\s+/);
    if (parts.length < 2) {
      throw new Error('Usage: !echo <message>');
    }
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const message = context.input.replace(/^!echo\s+/, '').trim();
    return this.createResult(true, message);
  }
}
