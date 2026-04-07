import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { ReportingService } from '../reporting';

/**
 * !report - Generate daily report
 * !report weekly - Generate weekly report
 */
export class ReportCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private reporting: ReportingService) {
    super(logger);
  }

  getName(): string { return 'report'; }
  getDescription(): string { return 'Generate daily or weekly report'; }
  getCategory(): string { return 'productivity'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!report\s*/i, '').trim().toLowerCase();
    const userId = (context as any).userId ?? context.user.id;

    if (args === 'weekly' || args === 'week') {
      const report = await this.reporting.generateWeeklyReport(userId);
      return this.createResult(true, report);
    }

    // Default: daily report
    const report = await this.reporting.generateDailyReport(userId);
    const formatted = this.reporting.formatDailyReport(report);
    return this.createResult(true, formatted);
  }
}

/**
 * !incidents - List recent incidents
 */
export class IncidentsCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private db: any // PrismaClient
  ) {
    super(logger);
  }

  getName(): string { return 'incidents'; }
  getDescription(): string { return 'List recent incidents'; }
  getCategory(): string { return 'devops'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const userId = (context as any).userId ?? context.user.id;
    const args = context.input.replace(/^!incidents\s*/i, '').trim().toLowerCase();

    const where: any = { userId };
    if (args === 'open') where.status = { in: ['OPEN', 'INVESTIGATING'] };
    if (args === 'resolved') where.status = 'RESOLVED';

    const incidents = await this.db.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (incidents.length === 0) {
      return this.createResult(true, '🔧 No incidents found.');
    }

    const lines = incidents.map((inc: any, i: number) => {
      const severityMap: Record<string, string> = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🟠', CRITICAL: '🔴' };
      const severity = severityMap[inc.severity] ?? '⚪';
      const status = inc.status === 'RESOLVED' ? '✅' : '⏳';
      return `${severity} ${status} ${i + 1}. ${inc.title}${inc.service ? ` [${inc.service}]` : ''}`;
    });

    return this.createResult(true, `🔧 *Recent Incidents*\n\n${lines.join('\n')}`);
  }
}
