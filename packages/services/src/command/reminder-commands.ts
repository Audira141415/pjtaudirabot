import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { ReminderService } from '../reminders';

/**
 * !remind <message> at <time> - Create a reminder
 */
export class RemindCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private reminderService: ReminderService) {
    super(logger);
  }

  getName(): string { return 'remind'; }
  getDescription(): string { return 'Set a reminder (e.g. !remind meeting jam 5)'; }
  getCategory(): string { return 'productivity'; }

  async validate(input: string): Promise<void> {
    const text = input.replace(/^!remind\s*/i, '').trim();
    if (!text) throw new Error('Usage: !remind <message> jam <time>\nExample: !remind meeting client jam 15:00');
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const text = context.input.replace(/^!remind\s+/i, '').trim();
    const userId = (context as any).userId ?? context.user.id;

    const extracted = this.reminderService.extractReminder(text, context.platform);
    if (!extracted) {
      return this.createResult(false, '⚠️ Could not parse time. Try: "!remind meeting jam 5" or "!remind backup in 30 minutes"');
    }

    const reminder = await this.reminderService.createReminder({
      userId,
      ...extracted,
    });

    return this.createResult(true, this.reminderService.formatConfirmation(reminder));
  }
}

/**
 * !reminders - List upcoming reminders
 */
export class RemindersListCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private reminderService: ReminderService) {
    super(logger);
  }

  getName(): string { return 'reminders'; }
  getDescription(): string { return 'List upcoming reminders'; }
  getCategory(): string { return 'productivity'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const userId = (context as any).userId ?? context.user.id;
    const reminders = await this.reminderService.listReminders(userId);

    if (reminders.length === 0) {
      return this.createResult(true, '⏰ No upcoming reminders.');
    }

    const lines = reminders.map((r, i) => {
      const time = new Date(r.remindAt).toLocaleString('id-ID', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      });
      return `${i + 1}. ${r.message} — ${time}`;
    });

    return this.createResult(true, `⏰ *Upcoming Reminders*\n\n${lines.join('\n')}`);
  }
}
