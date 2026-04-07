import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { EscalationService } from '../escalation';

export class EscalateCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private escalationService: EscalationService) {
    super(logger);
  }

  getName(): string { return 'escalate'; }
  getDescription(): string { return 'Manually escalate a ticket (!escalate <ticket-number> <level> | <reason>)'; }
  getCategory(): string { return 'escalation'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!escalate\s+/i, '').trim();
    const parts = args.split('|').map((s) => s.trim());
    const tokens = parts[0].split(/\s+/);
    const ticketNumber = tokens[0];
    const level = (tokens[1] ?? 'L2').toUpperCase() as any;
    const reason = parts[1] ?? 'Manual escalation';

    if (!ticketNumber) {
      return this.createResult(false, '❌ Usage: !escalate <ticket-number> [L1|L2|L3|MANAGER] | <reason>');
    }

    try {
      // Lookup ticket by number
      const result = await this.escalationService.escalate(
        ticketNumber, level, reason, 'MANUAL', context.user.id,
      );

      if (!result) return this.createResult(false, `❌ Could not escalate ${ticketNumber}`);

      return this.createResult(true, [
        `🔺 *Ticket Escalated*`,
        `📋 ${ticketNumber} → ${level}`,
        `📝 Reason: ${reason}`,
      ].join('\n'));
    } catch (error) {
      this.logger.error('Escalation failed', error as Error);
      return this.createErrorResult('Failed to escalate ticket');
    }
  }
}

export class EscalationStatsCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private escalationService: EscalationService) {
    super(logger);
  }

  getName(): string { return 'escalation-stats'; }
  getDescription(): string { return 'Show escalation statistics'; }
  getCategory(): string { return 'escalation'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const stats = await this.escalationService.getStats();

      const byLevelLines = Object.entries(stats.byLevel)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `  • ${k}: ${v}`)
        .join('\n');
      const byTriggerLines = Object.entries(stats.byTrigger)
        .map(([k, v]) => `  • ${k}: ${v}`)
        .join('\n');

      return this.createResult(true, [
        `🔺 *Escalation Statistics*`,
        `• Total: ${stats.total}`,
        ``,
        `📊 *By Level*`,
        byLevelLines || '  No data',
        ``,
        `⚡ *By Trigger*`,
        byTriggerLines || '  No data',
      ].join('\n'));
    } catch (error) {
      this.logger.error('Escalation stats failed', error as Error);
      return this.createErrorResult('Failed to get escalation stats');
    }
  }
}
