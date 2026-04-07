import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { TicketService, CreateTicketInput } from '../ticket';

export class BulkOperationsService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private ticketService: TicketService,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'bulk-ops' });
  }

  /** Create a bulk job and start processing */
  async bulkCreateTickets(
    tickets: CreateTicketInput[],
    createdById: string,
  ) {
    const job = await this.db.bulkJob.create({
      data: {
        jobType: 'CREATE_TICKETS',
        totalItems: tickets.length,
        createdById,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    const results: Array<{ success: boolean; ticketNumber?: string; error?: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const input of tickets) {
      try {
        const ticket = await this.ticketService.create({ ...input, createdById });
        results.push({ success: true, ticketNumber: ticket.ticketNumber });
        successCount++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ success: false, error: errMsg });
        failureCount++;
      }
    }

    await this.db.bulkJob.update({
      where: { id: job.id },
      data: {
        status: failureCount === 0 ? 'COMPLETED' : failureCount === tickets.length ? 'FAILED' : 'PARTIAL',
        processedItems: tickets.length,
        successCount,
        failureCount,
        results,
        completedAt: new Date(),
      },
    });

    this.logger.info('Bulk create completed', { jobId: job.id, successCount, failureCount });
    return { jobId: job.id, successCount, failureCount, results };
  }

  /** Bulk close resolved tickets older than N days */
  async bulkCloseResolved(olderThanDays = 7) {
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
    const resolved = await this.db.ticket.findMany({
      where: { status: 'RESOLVED', resolvedAt: { lte: cutoff } },
    });

    if (resolved.length === 0) return { closed: 0 };

    const job = await this.db.bulkJob.create({
      data: {
        jobType: 'CLOSE_TICKETS',
        totalItems: resolved.length,
        createdById: 'system',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    let closed = 0;
    for (const ticket of resolved) {
      await this.db.ticket.update({
        where: { id: ticket.id },
        data: { status: 'CLOSED', closedAt: new Date() },
      });
      closed++;
    }

    await this.db.bulkJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', processedItems: closed, successCount: closed, completedAt: new Date() },
    });

    this.logger.info('Bulk close completed', { closed });
    return { closed, jobId: job.id };
  }

  /** Bulk update tickets by filter */
  async bulkUpdateStatus(
    filter: { status?: string; priority?: string; customer?: string },
    newStatus: string,
    _createdById: string,
  ) {
    const where: any = {};
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.customer) where.customer = { contains: filter.customer, mode: 'insensitive' };

    const tickets = await this.db.ticket.findMany({ where });
    if (tickets.length === 0) return { updated: 0 };

    await this.db.ticket.updateMany({ where, data: { status: newStatus as any } });

    this.logger.info('Bulk status updated', { count: tickets.length, newStatus });
    return { updated: tickets.length };
  }

  /** Get job status */
  async getJobStatus(jobId: string) {
    return this.db.bulkJob.findUnique({ where: { id: jobId } });
  }

  /** List recent jobs */
  async listJobs(limit = 10) {
    return this.db.bulkJob.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  }
}
