import { PrismaClient, Prisma, TicketStatus, TicketPriority, TicketCategory, Platform } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';
import { resolveLocation } from '../data/neucentrix-locations';
import { TicketClusteringService } from '../clustering';

export interface CreateTicketInput {
  createdById: string;
  title: string;
  description: string;
  problem: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  customer?: string;
  location?: string;
  ao?: string;
  sid?: string;
  service?: string;
  vlanId?: string;
  vlanType?: string;
  vlanName?: string;
  hostnameSwitch?: string;
  port?: string;
  ipAddress?: string;
  gateway?: string;
  subnet?: string;
  mode?: string;
  source?: 'WHATSAPP' | 'TELEGRAM';
  groupId?: string;
  sourceMessage?: string;
  tags?: string[];
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  customer?: string;
  location?: string;
  assignedToId?: string;
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class TicketService {
  private logger: ILogger;
  private counterKey = 'ticket:counter';
  private readonly maxCreateRetries = 5;
  private clustering?: TicketClusteringService;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    logger: ILogger,
    clustering?: TicketClusteringService,
  ) {
    this.logger = logger.child({ service: 'ticket' });
    this.clustering = clustering;
  }

  /**
   * Generate sequential ticket number.
   * Format: {LOC_CODE}-YYYYMMDD-NNNN  (e.g. BTM-20260405-0001)
   * Falls back to TKT-YYYYMMDD-NNNN when location is unknown.
   */
  private async generateTicketNumber(locationCode?: string, dateStr = this.getTodayDateString()): Promise<string> {
    const prefix = locationCode ?? 'TKT';
    const dailyKey = `${this.counterKey}:${prefix}:${dateStr}`;
    const seq = await this.redis.incr(dailyKey);
    // Expire at midnight + 1 day buffer
    await this.redis.expire(dailyKey, 172800);
    return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
  }

  private getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  private extractSequence(ticketNumber: string): number {
    const seq = Number.parseInt(ticketNumber.split('-').pop() ?? '', 10);
    return Number.isNaN(seq) ? 0 : seq;
  }

  private isTicketNumberUniqueError(error: unknown): boolean {
    const e = error as { code?: string; meta?: { target?: string[] | string } };
    if (e?.code !== 'P2002') return false;
    const target = e.meta?.target;
    if (Array.isArray(target)) return target.includes('ticketNumber');
    return typeof target === 'string' ? target.includes('ticketNumber') : false;
  }

  private async syncCounterWithDatabase(prefix: string, dateStr: string): Promise<void> {
    const latest = await this.db.ticket.findFirst({
      where: { ticketNumber: { startsWith: `${prefix}-${dateStr}-` } },
      // createdAt desc avoids lexicographic errors when suffix grows beyond 4 digits.
      orderBy: { createdAt: 'desc' },
      select: { ticketNumber: true },
    });

    const maxDbSeq = latest?.ticketNumber ? this.extractSequence(latest.ticketNumber) : 0;
    if (maxDbSeq <= 0) return;

    const dailyKey = `${this.counterKey}:${prefix}:${dateStr}`;
    const currentRaw = await this.redis.get(dailyKey);
    const currentSeq = currentRaw ? Number.parseInt(currentRaw, 10) : 0;

    if (Number.isNaN(currentSeq) || currentSeq < maxDbSeq) {
      await this.redis.set(dailyKey, String(maxDbSeq));
      await this.redis.expire(dailyKey, 172800);
    }
  }

  async create(input: CreateTicketInput) {
    const normalizedLocation = input.location ? (resolveLocation(input.location)?.fullName ?? input.location) : undefined;
    const locationCode = normalizedLocation ? resolveLocation(normalizedLocation)?.code : undefined;
    const prefix = locationCode ?? 'TKT';
    const dateStr = this.getTodayDateString();

    await this.syncCounterWithDatabase(prefix, dateStr);

    for (let attempt = 1; attempt <= this.maxCreateRetries; attempt += 1) {
      const ticketNumber = await this.generateTicketNumber(locationCode, dateStr);
      try {
        const ticket = await this.db.ticket.create({
          data: {
            ticketNumber,
            createdById: input.createdById,
            title: input.title,
            description: input.description,
            problem: input.problem,
            priority: input.priority ?? 'MEDIUM',
            category: input.category ?? 'INCIDENT',
            customer: input.customer,
            location: normalizedLocation,
            ao: input.ao,
            sid: input.sid,
            service: input.service,
            vlanId: input.vlanId,
            vlanType: input.vlanType,
            vlanName: input.vlanName,
            hostnameSwitch: input.hostnameSwitch,
            port: input.port,
            ipAddress: input.ipAddress,
            gateway: input.gateway,
            subnet: input.subnet,
            mode: input.mode,
            source: input.source as Platform | undefined,
            groupId: input.groupId,
            sourceMessage: input.sourceMessage,
            tags: input.tags ?? [],
          },
          include: { slaTracking: true },
        });

        await this.addHistory(ticket.id, 'created', undefined, undefined, undefined, input.createdById);
        
        // Trigger clustering if service available
        if (this.clustering) {
          try {
            await this.clustering.clusterNewTicket(ticket);
          } catch (clusterError) {
            this.logger.warn('Clustering failed for ticket', {
              ticketId: ticket.id,
              error: clusterError instanceof Error ? clusterError.message : String(clusterError),
            });
            // Don't throw - clustering is non-critical to ticket creation
          }
        }

        this.logger.info('Ticket created', { ticketNumber, id: ticket.id, attempt });
        return ticket;
      } catch (error) {
        if (!this.isTicketNumberUniqueError(error) || attempt === this.maxCreateRetries) {
          throw error;
        }

        await this.syncCounterWithDatabase(prefix, dateStr);
        this.logger.warn('Ticket number collision detected, retrying', { prefix, dateStr, attempt });
      }
    }

    throw new Error('Failed to generate unique ticket number after retries');
  }

  async findById(id: string) {
    return this.db.ticket.findUnique({
      where: { id },
      include: { slaTracking: true, escalations: true, createdBy: true, assignedTo: true },
    });
  }

  async findByNumber(ticketNumber: string) {
    return this.db.ticket.findUnique({
      where: { ticketNumber },
      include: { slaTracking: true, escalations: true, createdBy: true, assignedTo: true },
    });
  }

  async list(filters: TicketFilters = {}, limit = 20, offset = 0) {
    const where: Prisma.TicketWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.customer) where.customer = { contains: filters.customer, mode: 'insensitive' };
    if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [tickets, total] = await Promise.all([
      this.db.ticket.findMany({
        where,
        include: { slaTracking: true, assignedTo: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.db.ticket.count({ where }),
    ]);

    return { tickets, total };
  }

  async updateStatus(ticketId: string, status: TicketStatus, changedById?: string, note?: string) {
    const ticket = await this.db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return null;

    const data: Prisma.TicketUpdateInput = { status };
    if (status === 'RESOLVED') data.resolvedAt = new Date();
    if (status === 'CLOSED') data.closedAt = new Date();

    const updated = await this.db.ticket.update({
      where: { id: ticketId },
      data,
      include: { slaTracking: true, assignedTo: true },
    });

    await this.addHistory(ticketId, 'status_changed', 'status', ticket.status, status, changedById, note);
    this.logger.info('Ticket status updated', { ticketId, from: ticket.status, to: status });
    return updated;
  }

  async assign(ticketId: string, assignedToId: string, changedById?: string) {
    const ticket = await this.db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return null;

    const updated = await this.db.ticket.update({
      where: { id: ticketId },
      data: { assignedToId, status: 'IN_PROGRESS' },
      include: { assignedTo: true, slaTracking: true },
    });

    await this.addHistory(ticketId, 'assigned', 'assignedToId', ticket.assignedToId, assignedToId, changedById);
    this.logger.info('Ticket assigned', { ticketId, assignedToId });
    return updated;
  }

  async resolve(ticketId: string, rootCause: string, solution: string, changedById?: string) {
    const updated = await this.db.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'RESOLVED',
        rootCause,
        solution,
        resolvedAt: new Date(),
      },
      include: { slaTracking: true, assignedTo: true },
    });

    await this.addHistory(ticketId, 'resolved', undefined, undefined, undefined, changedById,
      `Root cause: ${rootCause}\nSolution: ${solution}`);

    // Cascade resolution in cluster if service available
    if (this.clustering) {
      try {
        await this.clustering.cascadeResolution(ticketId, rootCause, solution, changedById);
      } catch (clusterError) {
        this.logger.warn('Cascade resolution failed', {
          ticketId,
          error: clusterError instanceof Error ? clusterError.message : String(clusterError),
        });
        // Don't throw - cascade is non-critical
      }
    }

    this.logger.info('Ticket resolved', { ticketId });
    return updated;
  }

  async close(ticketId: string, changedById?: string) {
    return this.updateStatus(ticketId, 'CLOSED', changedById);
  }

  async getStats(filters: { dateFrom?: Date; dateTo?: Date } = {}) {
    const where: Prisma.TicketWhereInput = {};
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [total, open, inProgress, resolved, closed, critical, high] = await Promise.all([
      this.db.ticket.count({ where }),
      this.db.ticket.count({ where: { ...where, status: 'OPEN' } }),
      this.db.ticket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.db.ticket.count({ where: { ...where, status: 'RESOLVED' } }),
      this.db.ticket.count({ where: { ...where, status: 'CLOSED' } }),
      this.db.ticket.count({ where: { ...where, priority: 'CRITICAL' } }),
      this.db.ticket.count({ where: { ...where, priority: 'HIGH' } }),
    ]);

    return { total, open, inProgress, resolved, closed, critical, high };
  }

  async getPersonalSLAOverview(userId: string, limit = 10) {
    const now = Date.now();
    const activeStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'];

    const tickets = await this.db.ticket.findMany({
      where: {
        status: { in: activeStatuses },
        OR: [
          { assignedToId: userId },
          { createdById: userId },
        ],
      },
      include: {
        slaTracking: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const rows = tickets.map((ticket) => {
      const responseRemainingMin = ticket.slaTracking?.respondedAt
        ? null
        : ticket.slaTracking
          ? Math.floor((ticket.slaTracking.responseDeadline.getTime() - now) / 60000)
          : null;

      const resolutionRemainingMin = ticket.slaTracking?.resolvedAt
        ? null
        : ticket.slaTracking
          ? Math.floor((ticket.slaTracking.resolutionDeadline.getTime() - now) / 60000)
          : null;

      const breached = Boolean(ticket.slaTracking?.responseBreached || ticket.slaTracking?.resolutionBreached);
      const dueSoon = !breached && (
        (responseRemainingMin !== null && responseRemainingMin <= 30) ||
        (resolutionRemainingMin !== null && resolutionRemainingMin <= 30)
      );

      return {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        hasSLA: Boolean(ticket.slaTracking),
        breached,
        dueSoon,
        responseRemainingMin,
        resolutionRemainingMin,
      };
    });

    const breachedCount = rows.filter((row) => row.breached).length;
    const dueSoonCount = rows.filter((row) => row.dueSoon).length;
    const noSlaCount = rows.filter((row) => !row.hasSLA).length;

    return {
      totalActive: rows.length,
      breachedCount,
      dueSoonCount,
      noSlaCount,
      rows,
    };
  }

  private async addHistory(
    ticketId: string, action: string, field?: string,
    oldValue?: string | null, newValue?: string | null, changedById?: string, note?: string,
  ) {
    await this.db.ticketHistory.create({
      data: { ticketId, action, field, oldValue, newValue, changedById, note },
    });
  }
}
