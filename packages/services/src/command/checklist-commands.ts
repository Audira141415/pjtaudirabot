import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { ChecklistService } from '../checklist';

/**
 * !checklist - Show today's daily checklist
 */
export class ChecklistCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private checklistService: ChecklistService) {
    super(logger);
  }

  getName(): string { return 'checklist'; }
  getDescription(): string { return 'Show today\'s daily checklist'; }
  getCategory(): string { return 'productivity'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const userId = (context as any).userId ?? context.user.id;
    const items = await this.checklistService.generateDailyChecklist(userId);
    const formatted = this.checklistService.formatChecklist(items);
    return this.createResult(true, formatted);
  }
}

/**
 * !checkdone <item text> - Mark checklist item as done
 */
export class CheckDoneCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private checklistService: ChecklistService) {
    super(logger);
  }

  getName(): string { return 'checkdone'; }
  getDescription(): string { return 'Mark a checklist item as done'; }
  getCategory(): string { return 'productivity'; }

  async validate(input: string): Promise<void> {
    const text = input.replace(/^!checkdone\s*/i, '').trim();
    if (!text) throw new Error('Usage: !checkdone <item text>');
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const searchText = context.input.replace(/^!checkdone\s+/i, '').trim();
    const userId = (context as any).userId ?? context.user.id;

    const result = await this.checklistService.completeItem(userId, searchText);
    if (result.found) {
      const progress = await this.checklistService.getTodayProgress(userId);
      return this.createResult(
        true,
        `✅ Checked: *${result.title}*\n📊 Progress: ${progress.completed}/${progress.total}`
      );
    }
    return this.createResult(false, `❌ No pending checklist item matching "${searchText}"`);
  }
}
