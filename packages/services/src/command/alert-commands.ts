import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { AlertService } from '../alert';

export class AlertListCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private alertService: AlertService) {
    super(logger);
  }

  getName(): string { return 'alerts'; }
  getDescription(): string { return 'Show recent alerts'; }
  getCategory(): string { return 'alert'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const alerts = await this.alertService.getRecent(10);
      if (alerts.length === 0) return this.createResult(true, '🔔 No recent alerts.');

      const lines = alerts.map((a) => {
        const icon = a.severity === 'CRITICAL' ? '🚨' : a.severity === 'ERROR' ? '🔴' : a.severity === 'WARNING' ? '🟡' : '🟢';
        return `${icon} *${a.severity}* [${a.status}] ${a.title}\n   ${a.message.substring(0, 80)}`;
      });

      return this.createResult(true, `🔔 *Recent Alerts* (${alerts.length})\n\n` + lines.join('\n\n'));
    } catch (error) {
      this.logger.error('Alert list failed', error as Error);
      return this.createErrorResult('Failed to get alerts');
    }
  }
}

export class AlertStatsCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private alertService: AlertService) {
    super(logger);
  }

  getName(): string { return 'alert-stats'; }
  getDescription(): string { return 'Show alert statistics'; }
  getCategory(): string { return 'alert'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const stats = await this.alertService.getStats();
      return this.createResult(true, [
        `🔔 *Alert Statistics*`,
        `• Total alerts: ${stats.total}`,
        `• Active: ${stats.active}`,
        `• Critical active: ${stats.critical} 🚨`,
        `• Active rules: ${stats.activeRules}`,
      ].join('\n'));
    } catch (error) {
      this.logger.error('Alert stats failed', error as Error);
      return this.createErrorResult('Failed to get alert stats');
    }
  }
}
