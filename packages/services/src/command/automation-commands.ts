import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { AutomationService } from '../automation';
import { TemplateCategory } from '@prisma/client';

export class TemplateCreateCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private automationService: AutomationService) {
    super(logger);
  }

  getName(): string { return 'template-create'; }
  getDescription(): string { return 'Create a new message template'; }
  getCategory(): string { return 'Automation'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.trim();
    if (!input) {
      return this.createResult(false, 'Usage: !template-create <name> <category> <body>');
    }

    const parts = input.match(/^([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/);
    if (!parts) {
      return this.createResult(false, 'Invalid format. Use: !template-create <name> <category> <body>');
    }

    const name = parts[1];
    const category = parts[2].toUpperCase() as TemplateCategory;
    const body = parts[3];

    if (!Object.values(TemplateCategory).includes(category)) {
      return this.createResult(false, `Invalid category. Use: ${Object.values(TemplateCategory).join(', ')}`);
    }

    try {
      const template = await this.automationService.createTemplate({
        name,
        category,
        body,
        createdBy: context.user.id,
      });
      return this.createResult(true, `Template '${template.name}' created successfully.`);
    } catch (e: any) {
      return this.createErrorResult(`Failed to create template: ${e.message}`);
    }
  }
}

export class TemplateListCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private automationService: AutomationService) {
    super(logger);
  }

  getName(): string { return 'template-list'; }
  getDescription(): string { return 'List available message templates'; }
  getCategory(): string { return 'Automation'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const category = context.input.trim().toUpperCase() as TemplateCategory;
    const templates = await this.automationService.listTemplates(
      Object.values(TemplateCategory).includes(category) ? category : undefined
    );

    if (templates.length === 0) {
      return this.createResult(true, 'No templates found.');
    }

    let message = '📑 **Message Templates:**\n\n';
    templates.forEach(t => {
      message += `- **${t.name}** [${t.category}]: ${t.body.substring(0, 50)}${t.body.length > 50 ? '...' : ''}\n`;
    });

    return this.createResult(true, message);
  }
}

export class TemplateUseCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private automationService: AutomationService) {
    super(logger);
  }

  getName(): string { return 'template-use'; }
  getDescription(): string { return 'Render a template with variables'; }
  getCategory(): string { return 'Automation'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.trim();
    const parts = input.split(' ');
    const name = parts[0];
    if (!name) {
      return this.createResult(false, 'Usage: !template-use <name> [key=value ...]');
    }

    const variables: Record<string, string> = {};
    parts.slice(1).forEach(p => {
      const [k, v] = p.split('=');
      if (k && v) variables[k] = v;
    });

    try {
      const rendered = await this.automationService.renderTemplate(name, variables);
      return this.createResult(true, rendered);
    } catch (e: any) {
      return this.createErrorResult(`Failed to use template: ${e.message}`);
    }
  }
}

export class AutomationCreateCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private automationService: AutomationService) {
    super(logger);
  }

  getName(): string { return 'automation-create'; }
  getDescription(): string { return 'Create a new automation rule'; }
  getCategory(): string { return 'Automation'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.trim();
    if (!input) {
      return this.createResult(false, 'Usage: !automation-create <name> --event=<event> --action=<action>');
    }

    const words = input.split(' ');
    const name = words[0];
    const extra: any = { conditions: [], actions: [], channels: [] };
    
    words.forEach(word => {
      if (word.startsWith('--')) {
        const [key, value] = word.substring(2).split('=');
        if (key === 'event') extra.triggerEvent = value;
        if (key === 'action') extra.actions.push(value);
        if (key === 'channel') extra.channels.push(value);
      }
    });

    if (!extra.triggerEvent) {
      return this.createResult(false, 'Trigger event (--event) is required.');
    }

    try {
      const rule = await this.automationService.createRule({
        name,
        triggerEvent: extra.triggerEvent,
        conditions: extra.conditions,
        actions: extra.actions,
        channels: extra.channels,
        createdBy: context.user.id,
      });
      return this.createResult(true, `Automation rule '${rule.name}' created successfully.`);
    } catch (e: any) {
      return this.createErrorResult(`Failed to create automation rule: ${e.message}`);
    }
  }
}

export class AutomationListCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private automationService: AutomationService) {
    super(logger);
  }

  getName(): string { return 'automation-list'; }
  getDescription(): string { return 'List all automation rules'; }
  getCategory(): string { return 'Automation'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    this.logger.debug('Listing automation rules', { userId: context.user.id });
    const rules = await this.automationService.listRules();
    if (rules.length === 0) {
      return this.createResult(true, 'No automation rules defined.');
    }

    let message = '🤖 **Automation Rules:**\n\n';
    rules.forEach(r => {
      message += `- **${r.name}** [${r.triggerEvent}]: ${r.isActive ? '✅ Active' : '❌ Inactive'} (${r.triggerCount} triggers)\n`;
    });

    return this.createResult(true, message);
  }
}
