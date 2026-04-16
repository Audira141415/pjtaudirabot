import { PrismaClient, Prisma } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';

export interface SearchFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignedToId?: string;
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
  customer?: string;
  query?: string;
}

export interface SearchResult {
  tickets: any[];
  tasks: any[];
  incidents: any[];
  total: number;
}

export class SearchService {
  private logger: ILogger;

  constructor(private db: PrismaClient, logger: ILogger) {
    this.logger = logger.child({ service: 'search' });
  }

  async search(type: 'ticket' | 'task' | 'incident' | 'all', filters: SearchFilters, limit = 10, offset = 0): Promise<SearchResult> {
    this.logger.info(`Performing search for ${type}`, { filters, limit, offset });

    const results: SearchResult = {
      tickets: [],
      tasks: [],
      incidents: [],
      total: 0,
    };

    if (type === 'ticket' || type === 'all') {
      const ticketWhere: Prisma.TicketWhereInput = this.buildTicketWhere(filters);
      const [tickets, count] = await Promise.all([
        this.db.ticket.findMany({
          where: ticketWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: { assignedTo: true, createdBy: true },
        }),
        this.db.ticket.count({ where: ticketWhere }),
      ]);
      results.tickets = tickets;
      results.total += count;
    }

    if (type === 'task' || type === 'all') {
      const taskWhere: Prisma.TaskWhereInput = this.buildTaskWhere(filters);
      const [tasks, count] = await Promise.all([
        this.db.task.findMany({
          where: taskWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.db.task.count({ where: taskWhere }),
      ]);
      results.tasks = tasks;
      results.total += count;
    }

    if (type === 'incident' || type === 'all') {
      const incidentWhere: Prisma.IncidentWhereInput = this.buildIncidentWhere(filters);
      const [incidents, count] = await Promise.all([
        this.db.incident.findMany({
          where: incidentWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.db.incident.count({ where: incidentWhere }),
      ]);
      results.incidents = incidents;
      results.total += count;
    }

    return results;
  }

  async saveSearch(userId: string, name: string, type: string, query: string, filters: any) {
    return this.db.savedSearch.create({
      data: {
        userId,
        name,
        type,
        query,
        filters,
      },
    });
  }

  async listSavedSearches(userId: string) {
    return this.db.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSavedSearch(userId: string, name: string) {
    return this.db.savedSearch.findUnique({
      where: {
        userId_name: { userId, name },
      },
    });
  }

  private buildTicketWhere(filters: SearchFilters): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};
    
    if (filters.status) where.status = filters.status as any;
    if (filters.priority) where.priority = filters.priority as any;
    if (filters.category) where.category = filters.category as any;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.customer) where.customer = { contains: filters.customer, mode: 'insensitive' };
    
    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    return where;
  }

  private buildTaskWhere(filters: SearchFilters): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {};
    
    if (filters.status) where.status = filters.status as any;
    if (filters.priority) where.priority = filters.priority as any;
    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    return where;
  }

  private buildIncidentWhere(filters: SearchFilters): Prisma.IncidentWhereInput {
    const where: Prisma.IncidentWhereInput = {};
    
    if (filters.status) where.status = filters.status as any;
    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    return where;
  }
}
