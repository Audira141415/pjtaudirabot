import { ILogger, CommandContext, CommandResult } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { BulkOperationsService } from '../bulk';

export class BulkCloseCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private bulkService: BulkOperationsService,
  ) {
    super(logger);
  }

  getName() { return 'bulk-close'; }
  getDescription() { return 'Close resolved tickets older than N days (default: 7)'; }
  getCategory() { return 'bulk'; }
  getRequiredRole() { return 'admin' as const; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!bulk-close\s*/i, '').trim();
    const days = parseInt(args, 10) || 7;

    const result = await this.bulkService.bulkCloseResolved(days);

    return {
      success: true,
      message: [
        `🗂️ *Bulk Close Completed*`,
        ``,
        `• Closed: ${result.closed} tickets`,
        `• Threshold: resolved > ${days} days`,
        result.closed > 0 ? `• Job ID: ${result.jobId}` : '',
      ].filter(Boolean).join('\n'),
    };
  }
}

export class BulkStatusCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private bulkService: BulkOperationsService,
  ) {
    super(logger);
  }

  getName() { return 'bulk-status'; }
  getDescription() { return 'Check status of a bulk job'; }
  getCategory() { return 'bulk'; }
  getRequiredRole() { return 'admin' as const; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const jobId = context.input.replace(/^!bulk-status\s*/i, '').trim();
    if (!jobId) {
      return { success: false, message: '⚠️ Usage: !bulk-status <jobId>' };
    }

    const job = await this.bulkService.getJobStatus(jobId);
    if (!job) {
      return { success: false, message: '❌ Job not found.' };
    }

    return {
      success: true,
      message: [
        `📋 *Bulk Job Status*`,
        ``,
        `• Job ID: ${job.id.slice(0, 8)}...`,
        `• Type: ${job.jobType}`,
        `• Status: ${job.status}`,
        `• Total: ${job.totalItems}`,
        `• Processed: ${job.processedItems}`,
        `• Success: ${job.successCount} | Failed: ${job.failureCount}`,
        `• Created: ${job.createdAt.toLocaleString('id-ID')}`,
        job.completedAt ? `• Completed: ${job.completedAt.toLocaleString('id-ID')}` : '',
      ].filter(Boolean).join('\n'),
    };
  }
}

export class BulkJobsCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private bulkService: BulkOperationsService,
  ) {
    super(logger);
  }

  getName() { return 'bulk-jobs'; }
  getDescription() { return 'List recent bulk jobs'; }
  getCategory() { return 'bulk'; }
  getRequiredRole() { return 'admin' as const; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    const jobs = await this.bulkService.listJobs(10);

    if (jobs.length === 0) {
      return { success: true, message: '📋 No bulk jobs found.' };
    }

    const lines = jobs.map((j, i) =>
      `${i + 1}. [${j.status}] ${j.jobType} — ${j.successCount}/${j.totalItems} ok — ${j.createdAt.toLocaleDateString('id-ID')}`
    );

    return {
      success: true,
      message: [`📋 *Recent Bulk Jobs*`, ``, ...lines].join('\n'),
    };
  }
}
