import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppContext } from '../app';

/**
 * Admin API routes — requires JWT auth with admin role.
 */
export async function adminRoutes(
  app: FastifyInstance,
  ctx: AppContext
): Promise<void> {

  // JWT auth hook for all admin routes
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as { role?: string };
      if (payload.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // ─── User Management ────────────────────────────────────────

  app.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20', search } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = search
      ? {
          OR: [
            { platformUserId: { contains: search } },
            { displayName: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      ctx.db.user.findMany({ where, skip, take, orderBy: { lastActivityAt: 'desc' as const } }),
      ctx.db.user.count({ where }),
    ]);

    return reply.send({
      data: users,
      pagination: { page: parseInt(page, 10), limit: take, total },
    });
  });

  app.get('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await ctx.db.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return reply.send({ data: user });
  });

  app.put('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { role?: string; isActive?: boolean; settings?: object };

    const user = await ctx.db.user.update({
      where: { id },
      data: {
        ...(body.role !== undefined && { role: body.role as any }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.settings !== undefined && { settings: body.settings }),
      },
    });

    return reply.send({ data: user });
  });

  // ─── Analytics & Stats ──────────────────────────────────────

  app.get('/stats/today', async (_request: FastifyRequest, reply: FastifyReply) => {
    const dateKey = new Date().toISOString().split('T')[0];
    const stats: Record<string, string> = {};

    try {
      const hash = await ctx.redis.hGetAll(`analytics:${dateKey}`);
      Object.assign(stats, hash);
    } catch { /* ignore */ }

    const [totalUsers, activeToday] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({
        where: {
          lastActivityAt: { gte: new Date(dateKey) },
        },
      }),
    ]);

    return reply.send({
      data: {
        ...stats,
        totalUsers,
        activeToday,
        date: dateKey,
      },
    });
  });

  app.get('/stats/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { days = '30' } = request.query as Record<string, string>;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    const stats = await ctx.db.dailyStats.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'desc' },
    });

    return reply.send({ data: stats });
  });

  app.get('/tickets/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    const { days = '14' } = request.query as Record<string, string>;
    const parsedDays = Number.parseInt(days, 10);
    const windowDays = Number.isNaN(parsedDays) ? 14 : Math.max(1, Math.min(90, parsedDays));

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (windowDays - 1));

    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      statusCountsRaw,
      priorityCountsRaw,
      categoryCountsRaw,
      recentTickets,
      trendTickets,
    ] = await Promise.all([
      ctx.db.ticket.count(),
      ctx.db.ticket.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'] } },
      }),
      ctx.db.ticket.count({
        where: { status: { in: ['RESOLVED', 'CLOSED'] } },
      }),
      ctx.db.ticket.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      ctx.db.ticket.groupBy({
        by: ['priority'],
        _count: { _all: true },
      }),
      ctx.db.ticket.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
      ctx.db.ticket.findMany({
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          priority: true,
          category: true,
          customer: true,
          createdAt: true,
          resolvedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      ctx.db.ticket.findMany({
        where: {
          OR: [
            { createdAt: { gte: since } },
            { resolvedAt: { gte: since } },
          ],
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      }),
    ]);

    const statusCounts = statusCountsRaw.map((item) => ({
      name: item.status,
      value: item._count._all,
    }));

    const priorityCounts = priorityCountsRaw.map((item) => ({
      name: item.priority,
      value: item._count._all,
    }));

    const categoryCounts = categoryCountsRaw.map((item) => ({
      name: item.category,
      value: item._count._all,
    }));

    const trendMap = new Map<string, { date: string; created: number; resolved: number }>();
    for (let i = 0; i < windowDays; i++) {
      const date = new Date(since);
      date.setDate(since.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      trendMap.set(key, { date: key, created: 0, resolved: 0 });
    }

    for (const ticket of trendTickets) {
      const createdKey = ticket.createdAt.toISOString().slice(0, 10);
      if (trendMap.has(createdKey)) {
        trendMap.get(createdKey)!.created += 1;
      }
      if (ticket.resolvedAt) {
        const resolvedKey = ticket.resolvedAt.toISOString().slice(0, 10);
        if (trendMap.has(resolvedKey)) {
          trendMap.get(resolvedKey)!.resolved += 1;
        }
      }
    }

    const dailyTrend = Array.from(trendMap.values());

    return reply.send({
      data: {
        totalTickets,
        openTickets,
        resolvedTickets,
        statusCounts,
        priorityCounts,
        categoryCounts,
        dailyTrend,
        recentTickets,
      },
    });
  });

  // ─── Broadcast ──────────────────────────────────────────────

  app.get('/broadcasts', async (_request: FastifyRequest, reply: FastifyReply) => {
    const broadcasts = await ctx.db.broadcastMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send({ data: broadcasts });
  });

  app.post('/broadcasts', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      content: string;
      targetPlatform?: string;
      targetRole?: string;
      scheduledAt?: string;
    };

    if (!body.content?.trim()) {
      return reply.status(400).send({ error: 'Content is required' });
    }

    const where: any = { status: 'ACTIVE' };
    if (body.targetPlatform) where.platform = body.targetPlatform.toUpperCase();
    if (body.targetRole) where.role = body.targetRole;
    const recipientCount = await ctx.db.user.count({ where });

    const broadcast = await ctx.db.broadcastMessage.create({
      data: {
        title: body.content.slice(0, 80),
        content: body.content,
        targetPlatform: (body.targetPlatform?.toUpperCase() ?? null) as any,
        targetRole: (body.targetRole ?? null) as any,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        totalRecipients: recipientCount,
        createdBy: 'admin',
        status: 'PENDING',
      },
    });

    return reply.status(201).send({ data: broadcast });
  });

  // ─── Moderation Rules ───────────────────────────────────────

  app.get('/moderation/rules', async (_request: FastifyRequest, reply: FastifyReply) => {
    const rules = await ctx.db.moderationRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ data: rules });
  });

  app.post('/moderation/rules', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name: string;
      type: string;
      pattern: string;
      action: string;
      reason?: string;
    };

    if (!body.name || !body.type || !body.pattern || !body.action) {
      return reply.status(400).send({ error: 'name, type, pattern, and action are required' });
    }

    const rule = await ctx.db.moderationRule.create({
      data: {
        name: body.name,
        ruleType: body.type as any,
        pattern: body.pattern,
        action: body.action as any,
        message: body.reason ?? null,
      },
    });

    return reply.send({ data: rule });
  });

  app.delete('/moderation/rules/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.moderationRule.delete({ where: { id } });
    return reply.send({ success: true });
  });

  app.get('/moderation/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50' } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      ctx.db.moderationLog.findMany({
        skip,
        take: parseInt(limit, 10),
        orderBy: { createdAt: 'desc' },
      }),
      ctx.db.moderationLog.count(),
    ]);

    return reply.send({
      data: logs,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total },
    });
  });

  // ─── Audit Logs ─────────────────────────────────────────────

  app.get('/audit', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', action, userId } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      ctx.db.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' as const } }),
      ctx.db.auditLog.count({ where }),
    ]);

    return reply.send({
      data: logs,
      pagination: { page: parseInt(page, 10), limit: take, total },
    });
  });

  // ─── Webhook Configs ────────────────────────────────────────

  app.get('/webhooks', async (_request: FastifyRequest, reply: FastifyReply) => {
    const webhooks = await ctx.db.webhookConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ data: webhooks });
  });

  app.post('/webhooks', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name: string;
      url: string;
      secret?: string;
      events: string[];
    };

    if (!body.name || !body.url || !body.events?.length) {
      return reply.status(400).send({ error: 'name, url, and events are required' });
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return reply.status(400).send({ error: 'Invalid webhook URL' });
    }

    const webhook = await ctx.db.webhookConfig.create({
      data: {
        name: body.name,
        url: body.url,
        secret: body.secret ?? null,
        events: body.events,
      },
    });

    return reply.send({ data: webhook });
  });

  app.delete('/webhooks/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.webhookConfig.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── Flow Definitions ───────────────────────────────────────

  app.get('/flows', async (_request: FastifyRequest, reply: FastifyReply) => {
    const flows = await ctx.db.flowDefinition.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ data: flows });
  });

  app.post('/flows', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name: string;
      description?: string;
      steps: unknown[];
    };

    if (!body.name || !body.steps?.length) {
      return reply.status(400).send({ error: 'name and steps are required' });
    }

    const flow = await ctx.db.flowDefinition.upsert({
      where: { name: body.name },
      create: {
        name: body.name,
        description: body.description ?? null,
        steps: body.steps as any,
      },
      update: {
        description: body.description ?? null,
        steps: body.steps as any,
      },
    });

    return reply.send({ data: flow });
  });
}
