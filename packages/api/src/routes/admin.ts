import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppContext } from '../app';
import os from 'node:os';

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

  // ─── System Health ──────────────────────────────────────────
  app.get('/system/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const components: Array<{
      name: string;
      status: 'online' | 'offline' | 'degraded' | 'error';
      latency?: number;
      details?: string;
      lastCheck: string;
    }> = [];
    const now = new Date().toISOString();

    // 1. API Server (always online if we reach here)
    components.push({
      name: 'API Server',
      status: 'online',
      details: `PID ${process.pid} · Uptime ${Math.floor(process.uptime())}s · Node ${process.version}`,
      lastCheck: now,
    });

    // 2. Database (PostgreSQL)
    try {
      const dbStart = Date.now();
      await ctx.db.$queryRaw`SELECT 1`;
      components.push({
        name: 'Database (PostgreSQL)',
        status: 'online',
        latency: Date.now() - dbStart,
        lastCheck: now,
      });
    } catch (err) {
      components.push({
        name: 'Database (PostgreSQL)',
        status: 'offline',
        details: (err as Error).message,
        lastCheck: now,
      });
    }

    // 3. Redis
    try {
      const redisStart = Date.now();
      await ctx.redis.ping();
      components.push({
        name: 'Redis',
        status: 'online',
        latency: Date.now() - redisStart,
        lastCheck: now,
      });
    } catch (err) {
      components.push({
        name: 'Redis',
        status: 'offline',
        details: (err as Error).message,
        lastCheck: now,
      });
    }

    // 4. Bot platforms (from BotConfig table)
    try {
      const bots = await ctx.db.botConfig.findMany();
      for (const bot of bots) {
        let status: 'online' | 'offline' | 'degraded' | 'error' = 'offline';
        if (bot.connectionStatus === 'CONNECTED' && bot.isActive) status = 'online';
        else if (bot.connectionStatus === 'CONNECTING') status = 'degraded';
        else if (bot.connectionStatus === 'ERROR') status = 'error';

        components.push({
          name: `${bot.platform} Bot`,
          status,
          details: `${bot.connectionStatus}${bot.lastConnectedAt ? ` · Last seen ${bot.lastConnectedAt.toISOString()}` : ''}`,
          lastCheck: now,
        });
      }

      // If no bot configs, show as unknown
      const platforms = bots.map(b => b.platform);
      if (!platforms.includes('WHATSAPP' as any)) {
        components.push({ name: 'WHATSAPP Bot', status: 'offline', details: 'No config found', lastCheck: now });
      }
      if (!platforms.includes('TELEGRAM' as any)) {
        components.push({ name: 'TELEGRAM Bot', status: 'offline', details: 'No config found', lastCheck: now });
      }
    } catch {
      components.push({ name: 'WHATSAPP Bot', status: 'error', details: 'Failed to query BotConfig', lastCheck: now });
      components.push({ name: 'TELEGRAM Bot', status: 'error', details: 'Failed to query BotConfig', lastCheck: now });
    }

    // 5. Server metrics
    const memUsed = os.totalmem() - os.freemem();
    const memTotal = os.totalmem();
    const memPct = ((memUsed / memTotal) * 100).toFixed(1);
    const loadAvg = os.loadavg();

    // 6. Active session counts
    let activeSessions = 0;
    try {
      activeSessions = await ctx.db.session.count({ where: { isActive: true, expiresAt: { gt: new Date() } } });
    } catch { /* ignore */ }

    // 7. Recent errors (last 1h)
    let recentErrors = 0;
    try {
      const oneHourAgo = new Date(Date.now() - 3600_000);
      recentErrors = await ctx.db.serverLog.count({
        where: { logLevel: 'ERROR', createdAt: { gte: oneHourAgo } },
      });
    } catch { /* ServerLog might not exist */ }

    // 8. Open alerts count
    let openAlerts = 0;
    try {
      openAlerts = await ctx.db.alert.count({ where: { status: 'ACTIVE' } });
    } catch { /* ignore */ }

    const allOnline = components.every(c => c.status === 'online');
    const hasError = components.some(c => c.status === 'error' || c.status === 'offline');

    return reply.send({
      data: {
        overallStatus: allOnline ? 'healthy' : hasError ? 'unhealthy' : 'degraded',
        components,
        metrics: {
          memoryUsedPct: parseFloat(memPct),
          memoryUsedGB: parseFloat((memUsed / 1073741824).toFixed(2)),
          memoryTotalGB: parseFloat((memTotal / 1073741824).toFixed(2)),
          cpuCores: os.cpus().length,
          loadAvg1m: parseFloat(loadAvg[0].toFixed(2)),
          uptime: Math.floor(process.uptime()),
          activeSessions,
          recentErrors,
          openAlerts,
        },
        timestamp: now,
      },
    });
  });

  app.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20', search, role, status: userStatus } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (search) {
      where.OR = [
        { platformUserId: { contains: search } },
        { displayName: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (userStatus) where.status = userStatus;

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
    const body = request.body as { role?: string; status?: string; isActive?: boolean; settings?: object };

    const user = await ctx.db.user.update({
      where: { id },
      data: {
        ...(body.role !== undefined && { role: body.role as any }),
        ...(body.status !== undefined && { status: body.status as any }),
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

  app.delete('/flows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.flowDefinition.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── Tickets (Full CRUD) ────────────────────────────────────

  app.get('/tickets', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20', status, priority, category, search, assignedToId } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { customer: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { problem: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      ctx.db.ticket.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          slaTracking: { select: { responseDeadline: true, resolutionDeadline: true, responseBreached: true, resolutionBreached: true, respondedAt: true, resolvedAt: true } },
          createdBy: { select: { id: true, displayName: true } },
          assignedTo: { select: { id: true, displayName: true } },
        },
      }),
      ctx.db.ticket.count({ where }),
    ]);

    return reply.send({ data: tickets, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.get('/tickets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const ticket = await ctx.db.ticket.findUnique({
      where: { id },
      include: {
        slaTracking: true,
        escalations: { orderBy: { createdAt: 'desc' } },
        ticketHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
        dataExtractions: { orderBy: { createdAt: 'desc' }, take: 5 },
        createdBy: { select: { id: true, displayName: true, platform: true } },
        assignedTo: { select: { id: true, displayName: true, platform: true } },
      },
    });
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
    return reply.send({ data: ticket });
  });

  app.put('/tickets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, any>;

    const updateData: any = {};
    const fields = ['status', 'priority', 'category', 'assignedToId', 'title', 'description', 'problem', 'rootCause', 'solution', 'customer', 'location'];
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f];
    }
    if (body.status === 'RESOLVED' && !updateData.resolvedAt) updateData.resolvedAt = new Date();
    if (body.status === 'CLOSED' && !updateData.closedAt) updateData.closedAt = new Date();

    const ticket = await ctx.db.ticket.update({ where: { id }, data: updateData });
    return reply.send({ data: ticket });
  });

  // ─── SLA Dashboard ──────────────────────────────────────────

  app.get('/sla/dashboard', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [
      totalTracked,
      responseBreaches,
      resolutionBreaches,
      activeTracking,
      recentBreach,
    ] = await Promise.all([
      ctx.db.sLATracking.count(),
      ctx.db.sLATracking.count({ where: { responseBreached: true } }),
      ctx.db.sLATracking.count({ where: { resolutionBreached: true } }),
      ctx.db.sLATracking.findMany({
        where: {
          ticket: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'] } },
        },
        include: {
          ticket: { select: { id: true, ticketNumber: true, status: true, priority: true, customer: true, createdAt: true } },
        },
        orderBy: { resolutionDeadline: 'asc' },
        take: 50,
      }),
      ctx.db.sLATracking.findMany({
        where: { OR: [{ responseBreached: true }, { resolutionBreached: true }] },
        include: { ticket: { select: { id: true, ticketNumber: true, status: true, priority: true, customer: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    const complianceRate = totalTracked > 0
      ? ((totalTracked - responseBreaches - resolutionBreaches) / totalTracked * 100).toFixed(1)
      : '100.0';

    return reply.send({
      data: {
        totalTracked,
        responseBreaches,
        resolutionBreaches,
        complianceRate: parseFloat(complianceRate),
        activeTracking,
        recentBreach,
      },
    });
  });

  // ─── Escalation ─────────────────────────────────────────────

  app.get('/escalations', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20' } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [escalations, total] = await Promise.all([
      ctx.db.escalation.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { ticket: { select: { id: true, ticketNumber: true, customer: true, priority: true, status: true } } },
      }),
      ctx.db.escalation.count(),
    ]);

    return reply.send({ data: escalations, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.get('/escalation-rules', async (_request: FastifyRequest, reply: FastifyReply) => {
    const rules = await ctx.db.escalationRule.findMany({ orderBy: { priority: 'desc' } });
    return reply.send({ data: rules });
  });

  app.post('/escalation-rules', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { name: string; description?: string; triggerType: string; condition: object; targetLevel?: string; priority?: number };
    if (!body.name || !body.triggerType || !body.condition) {
      return reply.status(400).send({ error: 'name, triggerType, and condition are required' });
    }
    const rule = await ctx.db.escalationRule.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        triggerType: body.triggerType as any,
        condition: body.condition as any,
        targetLevel: (body.targetLevel as any) ?? 'L2',
        priority: body.priority ?? 0,
      },
    });
    return reply.send({ data: rule });
  });

  app.delete('/escalation-rules/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.escalationRule.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── Alerts ─────────────────────────────────────────────────

  app.get('/alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', status, severity } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [alerts, total] = await Promise.all([
      ctx.db.alert.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { rule: { select: { name: true, alertType: true } } },
      }),
      ctx.db.alert.count({ where }),
    ]);

    return reply.send({ data: alerts, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.put('/alerts/:id/acknowledge', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const alert = await ctx.db.alert.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), acknowledgedById: 'admin' },
    });
    return reply.send({ data: alert });
  });

  app.put('/alerts/:id/resolve', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const alert = await ctx.db.alert.update({ where: { id }, data: { status: 'RESOLVED' } });
    return reply.send({ data: alert });
  });

  app.get('/alert-rules', async (_request: FastifyRequest, reply: FastifyReply) => {
    const rules = await ctx.db.alertRule.findMany({ orderBy: { createdAt: 'desc' } });
    return reply.send({ data: rules });
  });

  app.post('/alert-rules', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { name: string; description?: string; alertType: string; conditions: object; actions: object; cooldownMin?: number };
    if (!body.name || !body.alertType || !body.conditions) {
      return reply.status(400).send({ error: 'name, alertType, and conditions are required' });
    }
    const rule = await ctx.db.alertRule.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        alertType: body.alertType as any,
        conditions: body.conditions as any,
        actions: (body.actions ?? []) as any,
        cooldownMin: body.cooldownMin ?? 5,
      },
    });
    return reply.send({ data: rule });
  });

  app.delete('/alert-rules/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.alertRule.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── Uptime Monitor ─────────────────────────────────────────

  app.get('/uptime/targets', async (_request: FastifyRequest, reply: FastifyReply) => {
    const targets = await ctx.db.uptimeTarget.findMany({
      orderBy: { name: 'asc' },
      include: {
        checks: { orderBy: { checkedAt: 'desc' }, take: 1 },
      },
    });
    return reply.send({ data: targets });
  });

  app.post('/uptime/targets', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { name: string; host: string; port?: number; checkType?: string; intervalSec?: number; tags?: string[] };
    if (!body.name || !body.host) {
      return reply.status(400).send({ error: 'name and host are required' });
    }
    const target = await ctx.db.uptimeTarget.create({
      data: {
        name: body.name,
        host: body.host,
        port: body.port ?? null,
        checkType: (body.checkType as any) ?? 'PING',
        intervalSec: body.intervalSec ?? 60,
        tags: (body.tags ?? []) as any,
        createdById: 'admin',
      },
    });
    return reply.send({ data: target });
  });

  app.delete('/uptime/targets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.uptimeTarget.delete({ where: { id } });
    return reply.send({ success: true });
  });

  app.get('/uptime/targets/:id/checks', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { limit = '100' } = request.query as Record<string, string>;
    const checks = await ctx.db.uptimeCheck.findMany({
      where: { targetId: id },
      orderBy: { checkedAt: 'desc' },
      take: parseInt(limit, 10),
    });
    return reply.send({ data: checks });
  });

  // ─── Network Health ─────────────────────────────────────────

  app.get('/network/branches', async (_request: FastifyRequest, reply: FastifyReply) => {
    const branches = await ctx.db.networkBranch.findMany({ orderBy: { name: 'asc' } });
    return reply.send({ data: branches });
  });

  // ─── Server Status (DevOps) ─────────────────────────────────

  app.get('/server/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const uptime = os.uptime();

    const cpuUsage = cpus.length > 0
      ? cpus.reduce((acc, cpu) => {
          const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
          const idle = cpu.times.idle;
          return acc + ((total - idle) / total) * 100;
        }, 0) / cpus.length
      : 0;

    return reply.send({
      data: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: cpus.length,
        cpuUsage: Math.round(cpuUsage * 10) / 10,
        totalMemoryMB: Math.round(totalMem / 1048576),
        freeMemoryMB: Math.round(freeMem / 1048576),
        usedMemoryMB: Math.round((totalMem - freeMem) / 1048576),
        memoryUsagePercent: Math.round((1 - freeMem / totalMem) * 1000) / 10,
        uptimeSeconds: uptime,
        uptimeFormatted: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        loadAverage: os.loadavg(),
        nodeVersion: process.version,
        processUptime: Math.round(process.uptime()),
      },
    });
  });

  app.get('/server/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', level, service } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (level) where.logLevel = level;
    if (service) where.service = service;

    const [logs, total] = await Promise.all([
      ctx.db.serverLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      ctx.db.serverLog.count({ where }),
    ]);

    return reply.send({ data: logs, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  // ─── Shift Handover ─────────────────────────────────────────

  app.get('/shift-handovers', async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '20' } = request.query as Record<string, string>;
    const handovers = await ctx.db.shiftHandover.findMany({
      orderBy: { generatedAt: 'desc' },
      take: parseInt(limit, 10),
    });
    return reply.send({ data: handovers });
  });

  app.get('/shift-handovers/current', async (_request: FastifyRequest, reply: FastifyReply) => {
    const now = new Date();
    const hour = now.getHours();
    let shiftLabel: string;
    if (hour >= 7 && hour < 15) shiftLabel = 'PAGI';
    else if (hour >= 15 && hour < 23) shiftLabel = 'SIANG';
    else shiftLabel = 'MALAM';

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const handover = await ctx.db.shiftHandover.findFirst({
      where: { shiftLabel, shiftDate: today },
      orderBy: { generatedAt: 'desc' },
    });

    return reply.send({ data: { shiftLabel, shiftDate: today.toISOString().slice(0, 10), handover } });
  });

  // ─── Tasks ──────────────────────────────────────────────────

  app.get('/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20', status, priority, search } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      ctx.db.task.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, displayName: true } } },
      }),
      ctx.db.task.count({ where }),
    ]);

    return reply.send({ data: tasks, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.put('/tasks/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status?: string; priority?: string; title?: string; dueDate?: string };
    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.title) updateData.title = body.title;
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.status === 'COMPLETED') updateData.completedAt = new Date();

    const task = await ctx.db.task.update({ where: { id }, data: updateData });
    return reply.send({ data: task });
  });

  // ─── Reports ────────────────────────────────────────────────

  app.get('/reports/scheduled', async (_request: FastifyRequest, reply: FastifyReply) => {
    const reports = await ctx.db.scheduledReport.findMany({ orderBy: { createdAt: 'desc' } });
    return reply.send({ data: reports });
  });

  app.post('/reports/scheduled', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { name: string; reportType: string; schedule: string; recipients?: object[]; format?: string };
    if (!body.name || !body.reportType || !body.schedule) {
      return reply.status(400).send({ error: 'name, reportType, and schedule are required' });
    }
    const report = await ctx.db.scheduledReport.create({
      data: {
        name: body.name,
        reportType: body.reportType as any,
        schedule: body.schedule,
        recipients: (body.recipients ?? []) as any,
        format: body.format ?? 'text',
      },
    });
    return reply.send({ data: report });
  });

  app.delete('/reports/scheduled/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.scheduledReport.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── Knowledge Base ─────────────────────────────────────────

  app.get('/knowledge', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20', search, topic } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (topic) where.topic = topic;
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [entries, total, topics] = await Promise.all([
      ctx.db.knowledgeEntry.findMany({ where, skip, take, orderBy: { referenceCount: 'desc' }, include: { user: { select: { displayName: true } } } }),
      ctx.db.knowledgeEntry.count({ where }),
      ctx.db.knowledgeEntry.groupBy({ by: ['topic'], _count: { _all: true }, orderBy: { _count: { topic: 'desc' } } }),
    ]);

    return reply.send({
      data: entries,
      pagination: { page: parseInt(page, 10), limit: take, total },
      topics: topics.map((t) => ({ name: t.topic, count: t._count._all })),
    });
  });

  app.post('/knowledge', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { topic: string; question: string; answer: string; tags?: string[] };
    if (!body.topic || !body.question || !body.answer) {
      return reply.status(400).send({ error: 'topic, question, and answer are required' });
    }
    // Use first admin user or create a system entry
    const adminUser = await ctx.db.user.findFirst({ where: { role: 'ADMIN' } });
    const entry = await ctx.db.knowledgeEntry.create({
      data: {
        userId: adminUser?.id ?? 'system',
        topic: body.topic,
        question: body.question,
        answer: body.answer,
        tags: (body.tags ?? []) as any,
      },
    });
    return reply.send({ data: entry });
  });

  app.delete('/knowledge/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.knowledgeEntry.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── Incidents ──────────────────────────────────────────────

  app.get('/incidents', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20', status, severity } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [incidents, total] = await Promise.all([
      ctx.db.incident.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, displayName: true } } },
      }),
      ctx.db.incident.count({ where }),
    ]);

    return reply.send({ data: incidents, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.put('/incidents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status?: string; rootCause?: string; solution?: string; severity?: string };
    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.rootCause) updateData.rootCause = body.rootCause;
    if (body.solution) updateData.solution = body.solution;
    if (body.severity) updateData.severity = body.severity;
    if (body.status === 'RESOLVED') updateData.resolvedAt = new Date();

    const incident = await ctx.db.incident.update({ where: { id }, data: updateData });
    return reply.send({ data: incident });
  });

  // ─── Backup ─────────────────────────────────────────────────

  app.get('/backups', async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '50' } = request.query as Record<string, string>;
    const backups = await ctx.db.backup.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });
    return reply.send({ data: backups });
  });

  // ─── Bulk Operations ────────────────────────────────────────

  app.get('/bulk-jobs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '50' } = request.query as Record<string, string>;
    const jobs = await ctx.db.bulkJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });
    return reply.send({ data: jobs });
  });

  // ─── Checklists ─────────────────────────────────────────────

  app.get('/checklists/templates', async (_request: FastifyRequest, reply: FastifyReply) => {
    const templates = await ctx.db.checklistTemplate.findMany({ orderBy: { createdAt: 'desc' } });
    return reply.send({ data: templates });
  });

  app.post('/checklists/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { name: string; description?: string; items: object[]; schedule?: string };
    if (!body.name || !body.items?.length) {
      return reply.status(400).send({ error: 'name and items are required' });
    }
    const template = await ctx.db.checklistTemplate.upsert({
      where: { name: body.name },
      create: { name: body.name, description: body.description ?? null, items: body.items as any, schedule: body.schedule ?? null },
      update: { description: body.description ?? null, items: body.items as any, schedule: body.schedule ?? null },
    });
    return reply.send({ data: template });
  });

  app.delete('/checklists/templates/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.checklistTemplate.delete({ where: { id } });
    return reply.send({ success: true });
  });

  app.get('/checklists/items', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', date } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (date) where.scheduledDate = new Date(date);

    const [items, total] = await Promise.all([
      ctx.db.checklistItem.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledDate: 'desc' },
        include: {
          template: { select: { name: true } },
          user: { select: { displayName: true } },
        },
      }),
      ctx.db.checklistItem.count({ where }),
    ]);

    return reply.send({ data: items, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  // ─── Reminders ──────────────────────────────────────────────

  app.get('/reminders', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', delivered } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (delivered === 'true') where.isDelivered = true;
    if (delivered === 'false') where.isDelivered = false;

    const [reminders, total] = await Promise.all([
      ctx.db.reminder.findMany({
        where,
        skip,
        take,
        orderBy: { remindAt: 'asc' },
        include: { user: { select: { displayName: true } } },
      }),
      ctx.db.reminder.count({ where }),
    ]);

    return reply.send({ data: reminders, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.delete('/reminders/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.reminder.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── Group Management ───────────────────────────────────────

  app.get('/groups', async (_request: FastifyRequest, reply: FastifyReply) => {
    const groups = await ctx.db.chatGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: { reportConfig: true },
    });
    return reply.send({ data: groups });
  });

  app.put('/groups/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { isMonitored?: boolean; isReportTarget?: boolean };
    const group = await ctx.db.chatGroup.update({
      where: { id },
      data: {
        ...(body.isMonitored !== undefined && { isMonitored: body.isMonitored }),
        ...(body.isReportTarget !== undefined && { isReportTarget: body.isReportTarget }),
      },
    });
    return reply.send({ data: group });
  });

  // ─── Memory Browser ─────────────────────────────────────────

  app.get('/memory', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', userId, category } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: any = {};
    if (userId) where.userId = userId;
    if (category) where.category = category;

    const [memories, total] = await Promise.all([
      ctx.db.userMemory.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { displayName: true } } },
      }),
      ctx.db.userMemory.count({ where }),
    ]);

    return reply.send({ data: memories, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.delete('/memory/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.userMemory.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── Settings & Config ──────────────────────────────────────

  app.get('/settings/bot-config', async (_request: FastifyRequest, reply: FastifyReply) => {
    const configs = await ctx.db.botConfig.findMany();
    return reply.send({ data: configs });
  });

  app.put('/settings/bot-config/:platform', async (request: FastifyRequest, reply: FastifyReply) => {
    const { platform } = request.params as { platform: string };
    const body = request.body as { isActive?: boolean; configuration?: object };

    const config = await ctx.db.botConfig.upsert({
      where: { platform: platform.toUpperCase() as any },
      create: {
        platform: platform.toUpperCase() as any,
        isActive: body.isActive ?? true,
        configuration: (body.configuration ?? {}) as any,
      },
      update: {
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.configuration !== undefined && { configuration: body.configuration as any }),
      },
    });

    return reply.send({ data: config });
  });

  app.get('/settings/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50' } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [sessions, total] = await Promise.all([
      ctx.db.session.findMany({
        where: { isActive: true },
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { displayName: true, platform: true } } },
      }),
      ctx.db.session.count({ where: { isActive: true } }),
    ]);

    return reply.send({ data: sessions, pagination: { page: parseInt(page, 10), limit: take, total } });
  });
}
