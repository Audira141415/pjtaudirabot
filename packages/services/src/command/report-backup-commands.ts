import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { ReportService } from '../report';
import { BackupService } from '../backup';

export class DailyReportCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private reportService: ReportService) {
    super(logger);
  }

  getName(): string { return 'daily-report'; }
  getDescription(): string { return 'Generate daily summary report'; }
  getCategory(): string { return 'report'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const report = await this.reportService.generateDailyReport();
      return this.createResult(true, report);
    } catch (error) {
      this.logger.error('Daily report failed', error as Error);
      return this.createErrorResult('Failed to generate daily report');
    }
  }
}

export class WeeklyReportCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private reportService: ReportService) {
    super(logger);
  }

  getName(): string { return 'weekly-report'; }
  getDescription(): string { return 'Generate weekly summary report'; }
  getCategory(): string { return 'report'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const report = await this.reportService.generateWeeklyReport();
      return this.createResult(true, report);
    } catch (error) {
      this.logger.error('Weekly report failed', error as Error);
      return this.createErrorResult('Failed to generate weekly report');
    }
  }
}

export class MonthlyReportCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private reportService: ReportService) {
    super(logger);
  }

  getName(): string { return 'monthly-report'; }
  getDescription(): string { return 'Generate monthly summary report'; }
  getCategory(): string { return 'report'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const report = await this.reportService.generateMonthlyReport();
      return this.createResult(true, report);
    } catch (error) {
      this.logger.error('Monthly report failed', error as Error);
      return this.createErrorResult('Failed to generate monthly report');
    }
  }
}

export class AuditReportCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private reportService: ReportService) {
    super(logger);
  }

  getName(): string { return 'audit-report'; }
  getDescription(): string { return 'Generate comprehensive audit report'; }
  getCategory(): string { return 'report'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const report = await this.reportService.generateAuditReport();
      return this.createResult(true, report);
    } catch (error) {
      this.logger.error('Audit report failed', error as Error);
      return this.createErrorResult('Failed to generate audit report');
    }
  }
}

export class BackupCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private backupService: BackupService) {
    super(logger);
  }

  getName(): string { return 'backup'; }
  getDescription(): string { return 'Create a full backup (!backup [full|incremental])'; }
  getCategory(): string { return 'admin'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const type = context.input.replace(/^!backup\s*/i, '').trim().toLowerCase();

    try {
      let backup;
      if (type === 'incremental') {
        backup = await this.backupService.createIncrementalBackup(context.user.id);
      } else {
        backup = await this.backupService.createFullBackup(context.user.id);
      }

      return this.createResult(true, [
        `✅ *Backup Created*`,
        `📂 Type: ${backup.backupType}`,
        `📄 File: ${backup.fileName}`,
        `📊 Records: ${backup.recordCount}`,
        `💾 Size: ${Math.round((backup.fileSize ?? 0) / 1024)}KB`,
        `⏰ Expires: ${backup.expiresAt?.toLocaleDateString('id-ID') ?? 'Never'}`,
      ].join('\n'));
    } catch (error) {
      this.logger.error('Backup failed', error as Error);
      return this.createErrorResult('Failed to create backup');
    }
  }
}
