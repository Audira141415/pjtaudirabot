import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppContext } from '../app';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import crypto from 'node:crypto';
import { MaintenanceScheduleService, GoogleSheetsService, InsightService, TicketService } from '@pjtaudirabot/services';
import { auditLog } from '../utils/audit';

/**
 * Admin API routes — requires JWT auth with admin role.
 */
export async function adminRoutes(
  app: FastifyInstance,
  ctx: AppContext
): Promise<void> {
  const sheetsEnabled = process.env.GOOGLE_SHEETS_ENABLED === 'true';
  const sheetsService = sheetsEnabled && process.env.GOOGLE_SHEETS_CREDENTIALS && process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    ? new GoogleSheetsService({ credentials: process.env.GOOGLE_SHEETS_CREDENTIALS, spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID }, ctx.logger)
    : null;
  const maintenanceScheduleService = new MaintenanceScheduleService(ctx.db, ctx.redis, ctx.logger, sheetsService);
  const ticketService = new TicketService(ctx.db, ctx.redis, ctx.logger, undefined, sheetsService);
  const insightService = new InsightService(ctx.db, ctx.redis, ctx.logger);

  const botHealthHosts: Record<string, string[]> = {
    TELEGRAM: [
      process.env.TELEGRAM_HEALTH_HOST,
      process.env.TELEGRAM_HEALTH_URL ? new URL(process.env.TELEGRAM_HEALTH_URL).hostname : null,
      'telegram',
      '127.0.0.1',
    ].filter((h): h is string => !!h),
    WHATSAPP: [
      process.env.WHATSAPP_HEALTH_HOST,
      process.env.WHATSAPP_HEALTH_URL ? new URL(process.env.WHATSAPP_HEALTH_URL).hostname : null,
      'whatsapp',
      '127.0.0.1',
    ].filter((h): h is string => !!h),
  };

  async function probeBotHealth(platform: 'TELEGRAM' | 'WHATSAPP', port: number) {
    const candidates = Array.from(new Set(botHealthHosts[platform].filter(Boolean)));

    const probeCandidate = async (host: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);

      try {
        const start = Date.now();
        const res = await fetch(`http://${host}:${port}/`, { signal: controller.signal });
        const latency = Date.now() - start;

        if (!res.ok) {
          throw new Error(`Health endpoint returned ${res.status}`);
        }

        const data = await res.json() as { status?: string; waConnectionState?: string };
        const waConnected = platform === 'WHATSAPP'
          ? data.waConnectionState === 'open'
          : true;

        return {
          ok: true as const,
          host,
          latency,
          waConnected,
          data,
        };
      } finally {
        clearTimeout(timeout);
      }
    };

    const settled = await Promise.allSettled(candidates.map((host) => probeCandidate(host)));
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value.ok) {
        return result.value;
      }
    }

    return { ok: false as const };
  }

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
      meta?: {
        platform?: string;
        connectionStatus?: string;
        lastConnectedAt?: string | null;
        ready?: boolean;
      };
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

    // 4. Bot platforms — ping health endpoints + check env tokens
    const botChecks: Array<{
      platform: string;
      port: number;
      envToken: string | undefined;
      envEnabled: string | undefined;
    }> = [
      {
        platform: 'TELEGRAM',
        port: Number(process.env.TELEGRAM_PORT) || 4010,
        envToken: process.env.TELEGRAM_BOT_TOKEN,
        envEnabled: process.env.TELEGRAM_ENABLED,
      },
      {
        platform: 'WHATSAPP',
        port: Number(process.env.WHATSAPP_PORT) || 4020,
        envToken: process.env.WHATSAPP_SESSION_PATH || process.env.WHATSAPP_ENABLED,
        envEnabled: process.env.WHATSAPP_ENABLED,
      },
    ];

    for (const bot of botChecks) {
      let status: 'online' | 'offline' | 'degraded' | 'error' = 'offline';
      let details = '';
      let latency: number | undefined;
      let lastConnectedAt: Date | null = null;

      try {
        const config = await ctx.db.botConfig.findFirst({
          where: { platform: bot.platform as any },
          select: { lastConnectedAt: true },
        });
        lastConnectedAt = config?.lastConnectedAt ?? null;
      } catch {
        // Ignore config lookup failures; the health response should still render.
      }

      // First: try pinging the bot health endpoint.
      const probe = await probeBotHealth(bot.platform as 'TELEGRAM' | 'WHATSAPP', bot.port);

      if (probe.ok) {
        latency = probe.latency;
        const waConnected = bot.platform === 'WHATSAPP' ? probe.waConnected : true;
        status = waConnected ? 'online' : 'degraded';
        details = bot.platform === 'WHATSAPP'
          ? `Terhubung via ${probe.host}:${bot.port} · WA: ${(probe.data as { waConnectionState?: string }).waConnectionState ?? 'unknown'} · ${latency}ms`
          : `Terhubung via ${probe.host}:${bot.port} · ${latency}ms`;

        // Also update BotConfig in DB
        try {
          const connectedAt = new Date();
          await ctx.db.botConfig.updateMany({
            where: { platform: bot.platform as any },
            data: {
              connectionStatus: waConnected ? 'CONNECTED' : 'DISCONNECTED',
              ...(waConnected && { lastConnectedAt: connectedAt }),
            },
          });
          if (waConnected) {
            lastConnectedAt = connectedAt;
          }
        } catch { /* ignore */ }
      } else {
        // Bot not responding — check env for config info
        const hasToken = !!bot.envToken;
        const isEnabled = bot.envEnabled === 'true';

        if (!hasToken) {
          status = 'error';
          details = bot.platform === 'WHATSAPP'
            ? `Session/config WhatsApp belum di-set di .env (WHATSAPP_SESSION_DIR)`
            : `Token/config belum di-set di .env (${bot.platform}_BOT_TOKEN)`;
        } else if (!isEnabled) {
          status = 'offline';
          details = `Disabled di .env (${bot.platform}_ENABLED=false)`;
        } else {
          status = 'offline';
          details = process.env.NODE_ENV === 'production'
            ? `Service ${bot.platform} tidak terjangkau di port ${bot.port} — cek container Docker atau restart servicenya.`
            : `Service ${bot.platform} tidak terjangkau di port ${bot.port} — jalankan ulang: pnpm dev:${bot.platform.toLowerCase()}`;
        }

        // Update DB status
        try {
          await ctx.db.botConfig.updateMany({
            where: { platform: bot.platform as any },
            data: { connectionStatus: hasToken ? 'DISCONNECTED' : 'ERROR' },
          });
        } catch { /* ignore */ }
      }

      const connectionStatus = status === 'online'
        ? 'CONNECTED'
        : status === 'degraded'
          ? 'DEGRADED'
          : status === 'error'
            ? 'ERROR'
            : 'DISCONNECTED';

      components.push({
        name: `${bot.platform} Bot`,
        status,
        latency,
        details,
        lastCheck: now,
        meta: {
          platform: bot.platform,
          connectionStatus,
          lastConnectedAt: lastConnectedAt ? lastConnectedAt.toISOString() : null,
          ready: status === 'online',
          qr: bot.platform === 'WHATSAPP' && status !== 'online' ? (probe as any).data?.qr : undefined,
        } as any,
      });
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

    auditLog(ctx.db, request, { action: 'update', resource: 'user', resourceId: id, changes: body });
    return reply.send({ data: user });
  });

  app.delete('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    // Prevent self-deletion
    const currentUser = request.user as { payload: { id: string } };
    if (currentUser.payload.id === id) {
      return reply.status(400).send({ error: 'Tidak dapat menghapus diri sendiri.' });
    }

    try {
      await ctx.db.user.delete({ where: { id } });
      auditLog(ctx.db, request, { action: 'delete', resource: 'user', resourceId: id });
      return reply.send({ success: true, message: 'User berhasil dihapus permanently.' });
    } catch (err) {
      return reply.status(500).send({ error: `Gagal menghapus user: ${(err as Error).message}` });
    }
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

    auditLog(ctx.db, request, { action: 'create', resource: 'broadcast', resourceId: broadcast.id, changes: { content: body.content, targetPlatform: body.targetPlatform, recipientCount } });
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
    auditLog(ctx.db, request, { action: 'delete', resource: 'moderation_rule', resourceId: id });
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
    auditLog(ctx.db, request, { action: 'delete', resource: 'webhook', resourceId: id });
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
    auditLog(ctx.db, request, { action: 'delete', resource: 'flow', resourceId: id });
    return reply.send({ success: true });
  });

  app.put('/flows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; description?: string; steps?: unknown[]; isActive?: boolean };
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.steps !== undefined) updateData.steps = body.steps;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    const flow = await ctx.db.flowDefinition.update({ where: { id }, data: updateData });
    return reply.send({ data: flow });
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

  app.post('/tickets/bulk-resolve', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      filter?: {
        status?: string;
        priority?: string;
        customer?: string;
        search?: string;
      };
      rootCause?: string;
      solution?: string;
      dryRun?: boolean;
    };

    const unresolvedStatuses: Array<'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'ESCALATED'> = ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'];
    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const requestedStatus = body?.filter?.status;
    if (requestedStatus && !unresolvedStatuses.includes(requestedStatus as any)) {
      return reply.status(400).send({ error: 'Invalid filter.status' });
    }
    if (body?.filter?.priority && !allowedPriorities.includes(body.filter.priority)) {
      return reply.status(400).send({ error: 'Invalid filter.priority' });
    }

    const hasNarrowingFilter = Boolean(
      body?.filter?.status
      || body?.filter?.priority
      || body?.filter?.customer?.trim()
      || body?.filter?.search?.trim()
    );
    if (!hasNarrowingFilter) {
      return reply.status(400).send({ error: 'At least one filter (status/priority/customer/search) is required' });
    }

    const user = request.user as { sub?: string; id?: string; userId?: string };
    const actorId = user?.sub || user?.id || user?.userId || 'system';

    const where: any = {
      status: body?.filter?.status
        ? body.filter.status
        : { in: unresolvedStatuses },
    };

    if (body?.filter?.priority) where.priority = body.filter.priority;
    if (body?.filter?.customer) {
      where.customer = { contains: body.filter.customer, mode: 'insensitive' };
    }
    if (body?.filter?.search) {
      where.OR = [
        { ticketNumber: { contains: body.filter.search } },
        { customer: { contains: body.filter.search, mode: 'insensitive' } },
        { title: { contains: body.filter.search, mode: 'insensitive' } },
        { problem: { contains: body.filter.search, mode: 'insensitive' } },
      ];
    }

    let jobId: string | null = null;
    try {
      const candidates = await ctx.db.ticket.findMany({ where, select: { id: true } });

      if (body?.dryRun) {
        return reply.send({
          data: {
            candidateCount: candidates.length,
            resolvedCount: candidates.length,
            filter: body?.filter ?? {},
            dryRun: true,
          },
        });
      }

      const job = await ctx.db.bulkJob.create({
        data: {
          jobType: 'UPDATE_TICKETS',
          totalItems: candidates.length,
          createdById: actorId,
          status: 'RUNNING',
          startedAt: new Date(),
          results: {
            filter: body?.filter ?? {},
            action: 'BULK_RESOLVE',
          } as any,
        },
      });
      jobId = job.id;

      if (candidates.length === 0) {
        await ctx.db.bulkJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            processedItems: 0,
            successCount: 0,
            failureCount: 0,
            completedAt: new Date(),
          },
        });

        return reply.send({
          data: {
            resolvedCount: 0,
            jobId: job.id,
            filter: body?.filter ?? {},
          },
        });
      }

      const now = new Date();
      const updateData: any = {
        status: 'RESOLVED',
        resolvedAt: now,
      };
      if (body?.rootCause) updateData.rootCause = body.rootCause;
      if (body?.solution) updateData.solution = body.solution;

      const updateResult = await ctx.db.ticket.updateMany({
        where: {
          id: { in: candidates.map((t) => t.id) },
          status: { in: unresolvedStatuses },
        },
        data: updateData,
      });

      const failureCount = Math.max(candidates.length - updateResult.count, 0);
      await ctx.db.bulkJob.update({
        where: { id: job.id },
        data: {
          status: failureCount > 0 ? 'PARTIAL' : 'COMPLETED',
          processedItems: updateResult.count,
          successCount: updateResult.count,
          failureCount,
          completedAt: new Date(),
        },
      });

      return reply.send({
        data: {
          resolvedCount: updateResult.count,
          jobId: job.id,
          filter: body?.filter ?? {},
        },
      });
    } catch (err) {
      if (jobId) {
        await ctx.db.bulkJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorLog: err instanceof Error ? err.message : String(err),
          },
        }).catch(() => undefined);
      }
      return reply.status(500).send({ error: 'Failed to execute bulk resolve' });
    }
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
    auditLog(ctx.db, request, { action: 'update', resource: 'ticket', resourceId: id, changes: updateData });
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

  app.post('/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { title: string; description?: string; priority?: string; dueDate?: string; userId?: string; category?: string };
    if (!body.title) {
      return reply.status(400).send({ error: 'title is required' });
    }
    const task = await ctx.db.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        priority: (body.priority as any) ?? 'MEDIUM',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        userId: body.userId ?? 'system',
        category: body.category ?? null,
      },
    });
    return reply.send({ data: task });
  });

  app.delete('/tasks/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.task.delete({ where: { id } });
    return reply.send({ success: true });
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

  app.post('/backups', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { backupType?: string; fileName?: string };
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = await ctx.db.backup.create({
      data: {
        backupType: (body.backupType as any) ?? 'FULL',
        fileName: body.fileName ?? `backup-${ts}.sql`,
        filePath: `/backups/backup-${ts}.sql`,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    return reply.send({ data: backup });
  });

  app.delete('/backups/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.backup.delete({ where: { id } });
    return reply.send({ success: true });
  });

  app.post('/backups/:id/restore', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const backup = await ctx.db.backup.findUnique({ where: { id } });
    if (!backup) return reply.status(404).send({ error: 'Backup not found' });
    return reply.send({ data: backup, message: 'Restore initiated' });
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

  app.post('/reminders', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { message: string; remindAt: string; userId?: string; platform?: string; recurring?: string };
    if (!body.message || !body.remindAt) {
      return reply.status(400).send({ error: 'message and remindAt are required' });
    }
    const reminder = await ctx.db.reminder.create({
      data: {
        message: body.message,
        remindAt: new Date(body.remindAt),
        userId: body.userId ?? 'system',
        platform: (body.platform as any) ?? 'WHATSAPP',
        recurring: body.recurring ?? null,
      },
    });
    return reply.send({ data: reminder });
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
    const body = request.body as { isMonitored?: boolean; isReportTarget?: boolean; groupName?: string };
    const group = await ctx.db.chatGroup.update({
      where: { id },
      data: {
        ...(body.isMonitored !== undefined && { isMonitored: body.isMonitored }),
        ...(body.isReportTarget !== undefined && { isReportTarget: body.isReportTarget }),
        ...(body.groupName !== undefined && { groupName: body.groupName }),
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

  app.delete('/settings/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.session.update({ where: { id }, data: { isActive: false } });
    return reply.send({ success: true });
  });

  // ═══════════════════════════════════════════════════════
  // SENTIMENT ANALYSIS
  // ═══════════════════════════════════════════════════════

  app.get('/sentiment', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', sentiment, platform, days = '7' } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    const since = new Date(Date.now() - parseInt(days, 10) * 86400000);

    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (sentiment) where.sentiment = sentiment;
    if (platform) where.platform = platform;

    const [logs, total, stats] = await Promise.all([
      ctx.db.sentimentLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      ctx.db.sentimentLog.count({ where }),
      ctx.db.sentimentLog.groupBy({
        by: ['sentiment'],
        where: { createdAt: { gte: since } },
        _count: true,
        _avg: { score: true },
      }),
    ]);

    const distribution = Object.fromEntries(
      stats.map(s => [s.sentiment, { count: s._count, avgScore: s._avg.score }])
    );

    return reply.send({ data: logs, distribution, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.get('/sentiment/trends', async (request: FastifyRequest, reply: FastifyReply) => {
    const { days = '30' } = request.query as Record<string, string>;
    const since = new Date(Date.now() - parseInt(days, 10) * 86400000);

    const raw: Array<{ date: Date; sentiment: string; cnt: bigint; avg: number }> = await ctx.db.$queryRaw`
      SELECT DATE("createdAt") as date, sentiment, COUNT(*)::int as cnt, AVG(score) as avg
      FROM "SentimentLog" WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt"), sentiment ORDER BY date ASC
    `;

    const trends = raw.map(r => ({
      date: r.date,
      sentiment: r.sentiment,
      count: Number(r.cnt),
      avgScore: Number(r.avg),
    }));

    return reply.send({ data: trends });
  });

  // ═══════════════════════════════════════════════════════
  // SCHEDULED MESSAGES
  // ═══════════════════════════════════════════════════════

  app.get('/scheduled-messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', status } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [messages, total] = await Promise.all([
      ctx.db.scheduledMessage.findMany({ where, skip, take, orderBy: { scheduledAt: 'asc' } }),
      ctx.db.scheduledMessage.count({ where }),
    ]);

    return reply.send({ data: messages, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.post('/scheduled-messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    if (!body.title || !body.content || !body.scheduledAt) {
      return reply.status(400).send({ error: 'title, content, and scheduledAt are required' });
    }

    const msg = await ctx.db.scheduledMessage.create({
      data: {
        title: body.title as string,
        content: body.content as string,
        targetPlatform: (body.targetPlatform as string) || null,
        targetGroupId: (body.targetGroupId as string) || null,
        targetUserId: (body.targetUserId as string) || null,
        schedule: (body.schedule as string) || null,
        scheduledAt: new Date(body.scheduledAt as string),
        recurring: body.recurring === true,
        createdBy: 'admin',
      } as any,
    });

    return reply.status(201).send({ data: msg });
  });

  app.delete('/scheduled-messages/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.scheduledMessage.delete({ where: { id } });
    return reply.send({ success: true });
  });

  app.put('/scheduled-messages/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const msg = await ctx.db.scheduledMessage.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    return reply.send({ data: msg });
  });

  // ═══════════════════════════════════════════════════════
  // CAMPAIGN MANAGEMENT
  // ═══════════════════════════════════════════════════════

  app.get('/campaigns', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', status } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      ctx.db.campaign.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      ctx.db.campaign.count({ where }),
    ]);

    return reply.send({ data: campaigns, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.post('/campaigns', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    if (!body.name || !body.content) {
      return reply.status(400).send({ error: 'name and content are required' });
    }

    const campaign = await ctx.db.campaign.create({
      data: {
        name: body.name as string,
        description: (body.description as string) || null,
        content: body.content as string,
        targetPlatform: (body.targetPlatform as string) || null,
        targetSegment: (body.targetSegment as string) || null,
        status: body.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : null,
        createdBy: 'admin',
      } as any,
    });

    return reply.status(201).send({ data: campaign });
  });

  app.put('/campaigns/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.content !== undefined) data.content = body.content;
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'RUNNING') data.startedAt = new Date();
      if (body.status === 'COMPLETED') data.completedAt = new Date();
    }
    if (body.targetPlatform !== undefined) data.targetPlatform = body.targetPlatform;
    if (body.targetSegment !== undefined) data.targetSegment = body.targetSegment;

    const campaign = await ctx.db.campaign.update({ where: { id }, data });
    return reply.send({ data: campaign });
  });

  app.delete('/campaigns/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.campaign.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ═══════════════════════════════════════════════════════
  // CRM / CONTACTS
  // ═══════════════════════════════════════════════════════

  app.get('/crm/contacts', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', search, segment } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = {};
    if (segment) where.segment = segment;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [contacts, total] = await Promise.all([
      ctx.db.cRMContact.findMany({
        where, skip, take,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { interactions: true } } },
      }),
      ctx.db.cRMContact.count({ where }),
    ]);

    return reply.send({ data: contacts, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.post('/crm/contacts', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    if (!body.name) return reply.status(400).send({ error: 'name is required' });

    const contact = await ctx.db.cRMContact.create({
      data: {
        name: body.name as string,
        phone: (body.phone as string) || null,
        email: (body.email as string) || null,
        company: (body.company as string) || null,
        position: (body.position as string) || null,
        segment: (body.segment as string) || null,
        source: (body.source as string) || null,
        notes: (body.notes as string) || null,
        tags: (body.tags as string[]) || [],
      } as any,
    });

    return reply.status(201).send({ data: contact });
  });

  app.put('/crm/contacts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    for (const key of ['name', 'phone', 'email', 'company', 'position', 'segment', 'source', 'notes', 'score']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.tags !== undefined) data.tags = body.tags;
    if (body.customFields !== undefined) data.customFields = body.customFields;

    const contact = await ctx.db.cRMContact.update({ where: { id }, data });
    return reply.send({ data: contact });
  });

  app.delete('/crm/contacts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.cRMContact.delete({ where: { id } });
    return reply.send({ success: true });
  });

  app.get('/crm/contacts/:id/interactions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { page = '1', limit = '30' } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [interactions, total] = await Promise.all([
      ctx.db.cRMInteraction.findMany({
        where: { contactId: id }, skip, take,
        orderBy: { createdAt: 'desc' },
      }),
      ctx.db.cRMInteraction.count({ where: { contactId: id } }),
    ]);

    return reply.send({ data: interactions, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.post('/crm/contacts/:id/interactions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    if (!body.type || !body.content) {
      return reply.status(400).send({ error: 'type and content are required' });
    }

    const [interaction] = await Promise.all([
      ctx.db.cRMInteraction.create({
        data: {
          contactId: id,
          type: body.type as string,
          channel: (body.channel as string) || null,
          subject: (body.subject as string) || null,
          content: body.content as string,
          createdBy: 'admin',
        } as any,
      }),
      ctx.db.cRMContact.update({
        where: { id },
        data: { totalInteractions: { increment: 1 }, lastInteractionAt: new Date() },
      }),
    ]);

    return reply.status(201).send({ data: interaction });
  });

  // ═══════════════════════════════════════════════════════
  // PAYMENT / TRANSACTIONS
  // ═══════════════════════════════════════════════════════

  app.get('/payments', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', status } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [payments, total, stats] = await Promise.all([
      ctx.db.paymentTransaction.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      ctx.db.paymentTransaction.count({ where }),
      ctx.db.paymentTransaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: 'PAID' },
      }),
    ]);

    return reply.send({
      data: payments,
      summary: {
        totalPaid: stats._sum.amount || 0,
        totalTransactions: stats._count,
      },
      pagination: { page: parseInt(page, 10), limit: take, total },
    });
  });

  app.post('/payments', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    if (!body.amount || !body.transactionId) {
      return reply.status(400).send({ error: 'transactionId and amount are required' });
    }

    const payment = await ctx.db.paymentTransaction.create({
      data: {
        transactionId: body.transactionId as string,
        contactId: (body.contactId as string) || null,
        amount: parseFloat(body.amount as string),
        currency: (body.currency as string) || 'IDR',
        method: (body.method as string) || null,
        description: (body.description as string) || null,
        invoiceNumber: (body.invoiceNumber as string) || null,
        createdBy: 'admin',
      } as any,
    });

    return reply.status(201).send({ data: payment });
  });

  app.put('/payments/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'PAID') data.paidAt = new Date();
    }
    if (body.method !== undefined) data.method = body.method;
    if (body.description !== undefined) data.description = body.description;

    const payment = await ctx.db.paymentTransaction.update({ where: { id }, data });
    return reply.send({ data: payment });
  });

  // ═══════════════════════════════════════════════════════
  // UNIFIED INBOX
  // ═══════════════════════════════════════════════════════

  app.get('/inbox', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', platform, isRead, isStarred, isArchived, search } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = {};
    if (platform) where.platform = platform;
    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (isStarred !== undefined) where.isStarred = isStarred === 'true';
    if (isArchived !== undefined) where.isArchived = isArchived === 'true';
    else where.isArchived = false; // default: hide archived
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { fromName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [messages, total, unreadCount] = await Promise.all([
      ctx.db.inboxMessage.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      ctx.db.inboxMessage.count({ where }),
      ctx.db.inboxMessage.count({ where: { isRead: false, isArchived: false } }),
    ]);

    return reply.send({ data: messages, unreadCount, pagination: { page: parseInt(page, 10), limit: take, total } });
  });

  app.put('/inbox/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (body.isRead !== undefined) data.isRead = body.isRead;
    if (body.isStarred !== undefined) data.isStarred = body.isStarred;
    if (body.isArchived !== undefined) data.isArchived = body.isArchived;
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
    if (body.tags !== undefined) data.tags = body.tags;

    const msg = await ctx.db.inboxMessage.update({ where: { id }, data });
    return reply.send({ data: msg });
  });

  app.put('/inbox/mark-all-read', async (_request: FastifyRequest, reply: FastifyReply) => {
    await ctx.db.inboxMessage.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return reply.send({ success: true });
  });

  // ═══════════════════════════════════════════════════════
  // AUTO-MODERATION CONFIG
  // ═══════════════════════════════════════════════════════

  app.get('/auto-moderation', async (_request: FastifyRequest, reply: FastifyReply) => {
    const configs = await ctx.db.autoModConfig.findMany({ orderBy: { feature: 'asc' } });
    return reply.send({ data: configs });
  });

  app.put('/auto-moderation/:feature', async (request: FastifyRequest, reply: FastifyReply) => {
    const { feature } = request.params as { feature: string };
    const body = request.body as Record<string, unknown>;

    const config = await ctx.db.autoModConfig.upsert({
      where: { feature: feature as any },
      create: {
        feature: feature as any,
        isEnabled: body.isEnabled !== false,
        action: (body.action as string) || 'WARN',
        config: (body.config as Record<string, unknown>) || {},
        message: (body.message as string) || null,
      } as any,
      update: {
        ...(body.isEnabled !== undefined && { isEnabled: Boolean(body.isEnabled) }),
        ...(body.action !== undefined && { action: body.action as any }),
        ...(body.config !== undefined && { config: body.config as any }),
        ...(body.message !== undefined && { message: body.message == null ? null : String(body.message) }),
      },
    });

    return reply.send({ data: config });
  });

  // ═══════════════════════════════════════════════════════
  // FAQ SYSTEM
  // ═══════════════════════════════════════════════════════

  app.get('/faq', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', search, category } = request.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [entries, total, categories] = await Promise.all([
      ctx.db.fAQEntry.findMany({ where, skip, take, orderBy: { matchCount: 'desc' } }),
      ctx.db.fAQEntry.count({ where }),
      ctx.db.fAQEntry.findMany({ where: { isActive: true }, select: { category: true }, distinct: ['category'] }),
    ]);

    return reply.send({
      data: entries,
      categories: categories.map(c => c.category).filter(Boolean),
      pagination: { page: parseInt(page, 10), limit: take, total },
    });
  });

  app.post('/faq', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    if (!body.question || !body.answer) {
      return reply.status(400).send({ error: 'question and answer are required' });
    }

    const entry = await ctx.db.fAQEntry.create({
      data: {
        question: body.question as string,
        answer: body.answer as string,
        category: (body.category as string) || null,
        keywords: (body.keywords as string[]) || [],
        aliases: (body.aliases as string[]) || [],
        priority: parseInt((body.priority as string) || '0', 10),
        createdBy: 'admin',
      } as any,
    });

    return reply.status(201).send({ data: entry });
  });

  app.put('/faq/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    for (const key of ['question', 'answer', 'category', 'priority', 'isActive']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.keywords !== undefined) data.keywords = body.keywords;
    if (body.aliases !== undefined) data.aliases = body.aliases;

    const entry = await ctx.db.fAQEntry.update({ where: { id }, data });
    return reply.send({ data: entry });
  });

  app.delete('/faq/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.fAQEntry.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── MESSAGE TEMPLATES ──────────────────────────────────────

  app.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as { category?: string; platform?: string };
    const where: Record<string, unknown> = {};
    if (q.category) where.category = q.category;
    if (q.platform) where.platform = q.platform;
    const data = await ctx.db.messageTemplate.findMany({ where, orderBy: { usageCount: 'desc' } });
    return reply.send({ data });
  });

  app.post('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.messageTemplate.create({ data: body as any });
    return reply.send({ data: item });
  });

  app.put('/templates/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.messageTemplate.update({ where: { id }, data: body as any });
    return reply.send({ data: item });
  });

  app.delete('/templates/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.messageTemplate.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── CHATBOT FLOWS ────────────────────────────────────────

  app.get('/chatbot-flows', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await ctx.db.chatbotFlow.findMany({ orderBy: { updatedAt: 'desc' } });
    return reply.send({ data });
  });

  app.post('/chatbot-flows', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.chatbotFlow.create({ data: body as any });
    return reply.send({ data: item });
  });

  app.put('/chatbot-flows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.chatbotFlow.update({ where: { id }, data: body as any });
    return reply.send({ data: item });
  });

  app.delete('/chatbot-flows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.chatbotFlow.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── CSAT SURVEYS ──────────────────────────────────────────

  app.get('/csat', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as { page?: string };
    const page = Math.max(1, parseInt(q.page || '1', 10));
    const take = 50;
    const [data, total] = await Promise.all([
      ctx.db.cSATSurvey.findMany({ skip: (page - 1) * take, take, orderBy: { respondedAt: 'desc' } }),
      ctx.db.cSATSurvey.count(),
    ]);
    const avg = await ctx.db.cSATSurvey.aggregate({ _avg: { rating: true }, _count: true });
    return reply.send({ data, total, avgRating: avg._avg.rating ?? 0, totalResponses: avg._count });
  });

  app.post('/csat', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.cSATSurvey.create({ data: body as any });
    return reply.send({ data: item });
  });

  // ─── AGENTS ────────────────────────────────────────────────

  app.get('/agents', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await ctx.db.agent.findMany({ orderBy: { name: 'asc' } });
    return reply.send({ data });
  });

  app.post('/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.agent.create({ data: body as any });
    return reply.send({ data: item });
  });

  app.put('/agents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.agent.update({ where: { id }, data: body as any });
    return reply.send({ data: item });
  });

  app.delete('/agents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.agent.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── TAGS ──────────────────────────────────────────────────

  app.get('/tags', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await ctx.db.tag.findMany({ orderBy: { usageCount: 'desc' } });
    return reply.send({ data });
  });

  app.post('/tags', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.tag.create({ data: body as any });
    return reply.send({ data: item });
  });

  app.put('/tags/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.tag.update({ where: { id }, data: body as any });
    return reply.send({ data: item });
  });

  app.delete('/tags/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.tag.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── CRM DEALS (Pipeline) ─────────────────────────────────

  app.get('/deals', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as { stage?: string };
    const where: Record<string, unknown> = {};
    if (q.stage) where.stage = q.stage;
    const data = await ctx.db.cRMDeal.findMany({ where, orderBy: { updatedAt: 'desc' } });
    return reply.send({ data });
  });

  app.post('/deals', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.cRMDeal.create({ data: body as any });
    return reply.send({ data: item });
  });

  app.put('/deals/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    if (body.stage === 'WON' && !body.wonAt) body.wonAt = new Date().toISOString();
    if (body.stage === 'LOST' && !body.lostAt) body.lostAt = new Date().toISOString();
    const item = await ctx.db.cRMDeal.update({ where: { id }, data: body as any });
    return reply.send({ data: item });
  });

  app.delete('/deals/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.cRMDeal.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── PREVENTIVE MAINTENANCE ───────────────────────────────

  app.post('/maintenance', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return reply.status(400).send({ error: 'title is required' });
    }
    const intervalMonths = body.intervalMonths == null ? 3 : Number(body.intervalMonths);
    const anchorMonth = body.anchorMonth == null ? 1 : Number(body.anchorMonth);
    const anchorDay = body.anchorDay == null ? 1 : Number(body.anchorDay);
    const reminderEveryMonths = body.reminderEveryMonths == null ? 3 : Number(body.reminderEveryMonths);
    const notifyDaysBefore = body.notifyDaysBefore == null ? 7 : Number(body.notifyDaysBefore);

    if (![1, 2, 3, 6, 12].includes(intervalMonths)) {
      return reply.status(400).send({ error: 'intervalMonths must be one of 1, 2, 3, 6, 12' });
    }
    if (anchorMonth < 1 || anchorMonth > 12) {
      return reply.status(400).send({ error: 'anchorMonth must be 1–12' });
    }
    if (anchorDay < 1 || anchorDay > 31) {
      return reply.status(400).send({ error: 'anchorDay must be 1–31' });
    }

    // createdById must be a real User FK — use existing schedule's author or first user
    const anyUser = await ctx.db.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!anyUser) {
      return reply.status(500).send({ error: 'No users found in database to assign createdById' });
    }

    try {
      const item = await maintenanceScheduleService.create({
        title: (body.title as string).trim(),
        description: body.description as string | undefined,
        customer: body.customer as string | undefined,
        location: body.location as string | undefined,
        ao: body.ao as string | undefined,
        sid: body.sid as string | undefined,
        service: body.service as string | undefined,
        hostnameSwitch: body.hostnameSwitch as string | undefined,
        intervalMonths,
        anchorMonth,
        anchorDay,
        reminderEveryMonths,
        notifyDaysBefore,
        firstDueDate: body.firstDueDate ? new Date(body.firstDueDate as string) : undefined,
        createdById: anyUser.id,
      });
      return reply.status(201).send({ data: item });
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  app.get('/maintenance', async (request: FastifyRequest, reply: FastifyReply) => {
    const { active, search } = request.query as { active?: string; search?: string };
    const schedules = await maintenanceScheduleService.listDashboard({
      active: active == null ? undefined : active === 'true',
      search: search?.trim() || undefined,
    });
    return reply.send({ data: schedules });
  });

  app.get('/maintenance/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const schedules = await maintenanceScheduleService.listDashboard();
    const item = schedules.find((schedule) => schedule.id === id);
    if (!item) return reply.status(404).send({ error: 'Maintenance schedule not found' });
    return reply.send({ data: item });
  });

  app.get('/maintenance/:id/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tickets = await ctx.db.ticket.findMany({
      where: {
        category: 'MAINTENANCE',
        tags: { array_contains: [`schedule:${id}`] },
      },
      include: {
        ticketHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const events = tickets.flatMap((ticket) =>
      ticket.ticketHistory.map((h) => ({
        id: h.id,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        ticketStatus: String(ticket.status),
        action: h.action,
        note: h.note,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        createdAt: h.createdAt,
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return reply.send({ data: events });
  });

  app.put('/maintenance/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const intervalMonths = body.intervalMonths == null ? undefined : Number(body.intervalMonths);
    const anchorDay = body.anchorDay == null ? undefined : Number(body.anchorDay);
    const reminderEveryMonths = body.reminderEveryMonths == null ? undefined : Number(body.reminderEveryMonths);
    const notifyDaysBefore = body.notifyDaysBefore == null ? undefined : Number(body.notifyDaysBefore);

    if (intervalMonths != null && ![1, 2, 3, 6, 12].includes(intervalMonths)) {
      return reply.status(400).send({ error: 'intervalMonths must be one of 1, 2, 3, 6, 12' });
    }
    if (anchorDay != null && (anchorDay < 1 || anchorDay > 31)) {
      return reply.status(400).send({ error: 'anchorDay must be between 1 and 31' });
    }
    if (reminderEveryMonths != null && reminderEveryMonths < 1) {
      return reply.status(400).send({ error: 'reminderEveryMonths must be at least 1' });
    }
    if (notifyDaysBefore != null && (notifyDaysBefore < 1 || notifyDaysBefore > 60)) {
      return reply.status(400).send({ error: 'notifyDaysBefore must be between 1 and 60' });
    }

    try {
      const item = await maintenanceScheduleService.updateSchedule(id, {
        title: body.title as string | undefined,
        description: body.description as string | undefined,
        customer: body.customer as string | undefined,
        location: body.location as string | undefined,
        ao: body.ao as string | undefined,
        sid: body.sid as string | undefined,
        service: body.service as string | undefined,
        hostnameSwitch: body.hostnameSwitch as string | undefined,
        intervalMonths,
        anchorDay,
        reminderEveryMonths,
        notifyDaysBefore,
        isActive: body.isActive as boolean | undefined,
      });
      return reply.send({ data: item });
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  });

  app.post('/maintenance/:id/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const completedAt = body.completedAt ? new Date(body.completedAt as string) : new Date();
    if (Number.isNaN(completedAt.getTime())) {
      return reply.status(400).send({ error: 'completedAt is invalid' });
    }

    try {
      const item = await maintenanceScheduleService.completeSchedule(id, {
        note: body.note as string | undefined,
        evidenceFileId: body.evidenceFileId as string | undefined,
        completedAt,
        completedBy: String((request.user as { sub?: string })?.sub ?? 'admin'),
      });
      return reply.send({ data: item });
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  });

  app.post('/maintenance/:id/evidence', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const schedule = await ctx.db.maintenanceSchedule.findUnique({ where: { id } });
    if (!schedule) {
      return reply.status(404).send({ error: 'Maintenance schedule not found' });
    }

    const part = await request.file();
    if (!part) {
      return reply.status(400).send({ error: 'Evidence file is required' });
    }

    const notesField = Array.isArray(part.fields.notes) ? part.fields.notes[0] : part.fields.notes;
    const notes = notesField && 'value' in notesField ? String(notesField.value ?? '') : '';
    const uploader = String((request.user as { sub?: string })?.sub ?? 'admin');
    const uploadsDir = path.resolve(process.cwd(), 'data/uploads/maintenance-evidence');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeOriginalName = (part.filename || 'evidence').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeOriginalName}`;
    const absolutePath = path.join(uploadsDir, storedName);
    await pipeline(part.file, createWriteStream(absolutePath));
    const stats = await fs.stat(absolutePath);

    const relativePath = path.posix.join('maintenance-evidence', storedName);
    const publicUrl = `/uploads/${relativePath}`;

    const file = await ctx.db.managedFile.create({
      data: {
        filename: storedName,
        originalName: part.filename,
        mimeType: part.mimetype,
        size: stats.size,
        path: absolutePath,
        url: publicUrl,
        category: 'maintenance-evidence',
        uploadedBy: uploader,
        platform: 'DASHBOARD',
        isPublic: true,
        maintenanceScheduleId: id,
        metadata: {
          notes,
          scheduleTitle: schedule.title,
        } as any,
      },
    });

    // Auto-complete the schedule when evidence is uploaded
    await maintenanceScheduleService.completeSchedule(id, {
      note: notes || 'Evidence uploaded via dashboard',
      evidenceFileId: file.id,
      completedBy: uploader,
    }).catch(err => {
      ctx.logger.error(`Failed to auto-complete schedule ${id} after upload: ${String(err)}`);
    });

    return reply.send({ data: file });
  });

  // DELETE /maintenance/:id — hapus satu jadwal PM + hapus baris dari GSheet
  app.delete('/maintenance/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await maintenanceScheduleService.delete(id);
      auditLog(ctx.db, request, { action: 'delete', resource: 'maintenance_schedule', resourceId: id });
      return reply.send({ success: true, message: `Jadwal PM ${id} berhasil dihapus.` });
    } catch (err: any) {
      if (err.message?.includes('not found')) return reply.status(404).send({ error: err.message });
      ctx.logger.error(`Failed to delete maintenance schedule ${id}: ${String(err)}`);
      return reply.status(500).send({ error: 'Gagal menghapus jadwal PM.' });
    }
  });

  // DELETE /maintenance/bulk — hapus banyak jadwal sekaligus
  // Body: { ids: string[] }  OR  { filter: 'no-location' } untuk hapus semua tanpa lokasi
  app.delete('/maintenance/bulk', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { ids?: string[]; filter?: string };

    let ids: string[] = [];

    if (body.filter === 'no-location') {
      // Hapus semua jadwal yang field location-nya kosong/null
      const found = await ctx.db.maintenanceSchedule.findMany({
        where: { OR: [{ location: null }, { location: '' }] },
        select: { id: true },
      });
      ids = found.map(s => s.id);
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      ids = body.ids;
    } else {
      return reply.status(400).send({ error: 'Berikan ids[] atau filter="no-location"' });
    }

    if (ids.length === 0) {
      return reply.send({ success: true, deleted: 0, message: 'Tidak ada jadwal yang dihapus.' });
    }

    const deleted = await maintenanceScheduleService.deleteMany(ids);
    auditLog(ctx.db, request, { action: 'delete', resource: 'maintenance_schedule', resourceId: ids.join(',') });
    return reply.send({ success: true, deleted, message: `${deleted} jadwal PM berhasil dihapus.` });
  });

  // POST /maintenance/sheets/clear — reset tab GSheet, dann re-sync dari DB
  app.post('/maintenance/sheets/clear', async (_request: FastifyRequest, reply: FastifyReply) => {
    ctx.logger.info('API Call: /maintenance/sheets/clear [START]');
    try {
      const count = await maintenanceScheduleService.clearAndResyncSheets();
      ctx.logger.info(`API Call: /maintenance/sheets/clear [SUCCESS] - Synced: ${count}`);
      return reply.send({ success: true, synced: count, message: `Tab GSheet direset & ${count} jadwal di-sync ulang.` });
    } catch (err) {
      ctx.logger.error(`API Call: /maintenance/sheets/clear [FAILED]: ${err instanceof Error ? err.stack : String(err)}`);
      return reply.status(500).send({ error: `Gagal clear/resync GSheet: ${err instanceof Error ? err.message : String(err)}` });
    }
  });

  // POST /maintenance/sheets/sync — sync semua jadwal DB → GSheet tanpa clear
  app.post('/maintenance/sheets/sync', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const count = await maintenanceScheduleService.syncAllToSheets();
      return reply.send({ success: true, synced: count, message: `${count} jadwal di-sync ke GSheet.` });
    } catch (err) {
      ctx.logger.error(`Failed to sync maintenance to sheets: ${String(err)}`);
      return reply.status(500).send({ error: 'Gagal sync ke GSheet.' });
    }
  });

  // POST /tickets/purge — DELETE ALL TICKETS from DB and Sheets
  app.post('/tickets/purge', async (request: FastifyRequest, reply: FastifyReply) => {
    ctx.logger.info('API Call: /tickets/purge [START]');
    try {
      await ticketService.purgeAllTickets();
      auditLog(ctx.db, request, { action: 'delete', resource: 'ticket', resourceId: 'all' });
      ctx.logger.info('API Call: /tickets/purge [SUCCESS]');
      return reply.send({ success: true, message: 'DATABASE & GSHEET TICKETS BERHASIL DIBERSIHKAN TOTAL.' });
    } catch (err) {
      ctx.logger.error(`API Call: /tickets/purge [FAILED]: ${err instanceof Error ? err.stack : String(err)}`);
      return reply.status(500).send({ error: `Gagal membersihkan data tiket: ${err instanceof Error ? err.message : String(err)}` });
    }
  });

  // POST /admin/purge-modular — Delete selected modules from DB and Sheets
  app.post('/purge-modular', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { modules: string[] };
    const modules = body.modules || [];
    ctx.logger.info(`API Call: /purge-modular [START] - Modules: ${modules.join(', ')}`);

    try {
      const results: string[] = [];
      
      for (const mod of modules) {
        switch (mod) {
          case 'tickets':
            await ticketService.purgeAllTickets();
            results.push('Tickets (includes SLA & History)');
            break;
          case 'maintenance':
            await ctx.db.managedFile.deleteMany({ where: { category: 'maintenance' } });
            await ctx.db.maintenanceSchedule.deleteMany({});
            if (sheetsService) await (sheetsService as any).clearGenericSheet('maintenance_schedules');
            results.push('Maintenance Schedules');
            break;
          case 'tasks':
            await ctx.db.task.deleteMany({});
            if (sheetsService) await (sheetsService as any).clearGenericSheet('tasks');
            results.push('Tasks');
            break;
          case 'incidents':
            await ctx.db.incident.deleteMany({});
            if (sheetsService) await (sheetsService as any).clearGenericSheet('incidents');
            results.push('Incidents');
            break;
          case 'broadcasts':
            await ctx.db.broadcastReceipt.deleteMany({});
            await ctx.db.broadcastMessage.deleteMany({});
            results.push('Broadcasts');
            break;
          case 'logs':
            await ctx.db.auditLog.deleteMany({});
            if (sheetsService) await (sheetsService as any).clearGenericSheet('logs');
            results.push('Audit Logs');
            break;
          case 'reminders':
            await ctx.db.reminder.deleteMany({});
            if (sheetsService) await (sheetsService as any).clearGenericSheet('reminders');
            results.push('Reminders');
            break;
          case 'notes':
            await ctx.db.note.deleteMany({});
            if (sheetsService) await (sheetsService as any).clearGenericSheet('notes');
            results.push('Notes');
            break;
        }
      }

      auditLog(ctx.db, request, { action: 'delete', resource: 'system_data', resourceId: modules.join(',') });
      ctx.logger.info('API Call: /purge-modular [SUCCESS]');
      return reply.send({ success: true, message: `Berhasil membersihkan: ${results.join(', ')}` });
    } catch (err) {
      ctx.logger.error(`API Call: /purge-modular [FAILED]: ${err instanceof Error ? err.stack : String(err)}`);
      return reply.status(500).send({ error: `Gagal membersihkan data: ${err instanceof Error ? err.message : String(err)}` });
    }
  });

  // ─── FILE MANAGER ──────────────────────────────────────────

  app.get('/files', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as { category?: string; page?: string };
    const page = Math.max(1, parseInt(q.page || '1', 10));
    const take = 50;
    const where: Record<string, unknown> = {};
    if (q.category) where.category = q.category;
    const [data, total] = await Promise.all([
      ctx.db.managedFile.findMany({ where, skip: (page - 1) * take, take, orderBy: { createdAt: 'desc' } }),
      ctx.db.managedFile.count({ where }),
    ]);
    return reply.send({ data, total });
  });

  app.post('/files', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.managedFile.create({ data: body as any });
    return reply.send({ data: item });
  });

  app.delete('/files/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.managedFile.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── API KEYS ──────────────────────────────────────────────

  app.get('/api-keys', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await ctx.db.apiKey.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, prefix: true, permissions: true, rateLimit: true, expiresAt: true, lastUsedAt: true, usageCount: true, isActive: true, createdAt: true } });
    return reply.send({ data });
  });

  app.post('/api-keys', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const crypto = await import('node:crypto');
    const raw = crypto.randomBytes(32).toString('hex');
    const prefix = 'ak_' + raw.substring(0, 8);
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    const item = await ctx.db.apiKey.create({ data: { name: body.name as string, keyHash, prefix, permissions: (body.permissions as any) ?? [], rateLimit: (body.rateLimit as number) ?? 1000, expiresAt: body.expiresAt ? new Date(body.expiresAt as string) : null, createdBy: body.createdBy as string } });
    return reply.send({ data: { ...item, key: raw } });
  });

  app.put('/api-keys/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.rateLimit !== undefined) data.rateLimit = body.rateLimit;
    if (body.permissions !== undefined) data.permissions = body.permissions;
    const item = await ctx.db.apiKey.update({ where: { id }, data });
    return reply.send({ data: item });
  });

  app.delete('/api-keys/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.apiKey.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── CANNED RESPONSES ─────────────────────────────────────

  app.get('/canned-responses', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await ctx.db.cannedResponse.findMany({ orderBy: { usageCount: 'desc' } });
    return reply.send({ data });
  });

  app.post('/canned-responses', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.cannedResponse.create({ data: body as any });
    return reply.send({ data: item });
  });

  app.put('/canned-responses/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.cannedResponse.update({ where: { id }, data: body as any });
    return reply.send({ data: item });
  });

  app.delete('/canned-responses/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.cannedResponse.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── WEBHOOK LOGS ──────────────────────────────────────────

  app.get('/webhook-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as { webhookId?: string; status?: string; page?: string };
    const page = Math.max(1, parseInt(q.page || '1', 10));
    const take = 50;
    const where: Record<string, unknown> = {};
    if (q.webhookId) where.webhookId = q.webhookId;
    if (q.status) where.status = q.status;
    const [data, total] = await Promise.all([
      ctx.db.webhookLog.findMany({ where, skip: (page - 1) * take, take, orderBy: { createdAt: 'desc' } }),
      ctx.db.webhookLog.count({ where }),
    ]);
    return reply.send({ data, total });
  });

  // ─── EXPORT CENTER ─────────────────────────────────────────

  app.get('/exports', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await ctx.db.exportJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return reply.send({ data });
  });

  app.post('/exports', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { module: string; format: string; filters?: Record<string, unknown> };
    const item = await ctx.db.exportJob.create({ data: { module: body.module, format: body.format as any, filters: (body.filters ?? {}) as any, status: 'PROCESSING', requestedBy: ((request.user as any)?.sub ?? 'admin') } });
    // simulate processing
    setTimeout(async () => { try { await ctx.db.exportJob.update({ where: { id: item.id }, data: { status: 'COMPLETED', fileName: `${body.module}_export.${body.format.toLowerCase()}`, totalRows: Math.floor(Math.random() * 500) + 10, fileSize: Math.floor(Math.random() * 500000) + 1000, completedAt: new Date() } }); } catch {} }, 2000);
    return reply.send({ data: item });
  });

  // ─── NOTIFICATION RULES ───────────────────────────────────

  app.get('/notification-rules', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await ctx.db.notificationRule.findMany({ orderBy: { createdAt: 'desc' } });
    return reply.send({ data });
  });

  app.post('/notification-rules', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.notificationRule.create({ data: body as any });
    return reply.send({ data: item });
  });

  app.put('/notification-rules/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const item = await ctx.db.notificationRule.update({ where: { id }, data: body as any });
    return reply.send({ data: item });
  });

  app.delete('/notification-rules/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await ctx.db.notificationRule.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // ─── USER PREFERENCES ─────────────────────────────────────

  app.get('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any)?.sub ?? 'admin';
    let pref = await ctx.db.userPreference.findUnique({ where: { userId } });
    if (!pref) pref = await ctx.db.userPreference.create({ data: { userId } });
    return reply.send({ data: pref });
  });

  app.put('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any)?.sub ?? 'admin';
    const body = request.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.theme !== undefined) data.theme = body.theme;
    if (body.language !== undefined) data.language = body.language;
    if (body.timezone !== undefined) data.timezone = body.timezone;
    if (body.notifications !== undefined) data.notifications = body.notifications;
    if (body.dashboardLayout !== undefined) data.dashboardLayout = body.dashboardLayout;
    const pref = await ctx.db.userPreference.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    return reply.send({ data: pref });
  });

  // ─── ANALYTICS ─────────────────────────────────────────────

  app.get('/analytics/overview', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [tickets, contacts, deals, messages, agents, surveys] = await Promise.all([
      ctx.db.ticket.count(),
      ctx.db.cRMContact.count(),
      ctx.db.cRMDeal.count(),
      ctx.db.sentimentLog.count(),
      ctx.db.agent.count(),
      ctx.db.cSATSurvey.aggregate({ _avg: { rating: true }, _count: true }),
    ]);
    const dealsByStage = await ctx.db.cRMDeal.groupBy({ by: ['stage'], _count: true, _sum: { value: true } });
    return reply.send({ data: { tickets, contacts, deals, messages, agents, csatAvg: surveys._avg.rating ?? 0, csatTotal: surveys._count, dealsByStage } });
  });

  app.get('/analytics/snapshots', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as { period?: string };
    const where: Record<string, unknown> = {};
    if (q.period) where.period = q.period;
    const data = await ctx.db.analyticsSnapshot.findMany({ where, orderBy: { date: 'desc' }, take: 30 });
    return reply.send({ data });
  });

  app.get('/insights', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await insightService.getPredictiveForecast();
    return reply.send({ data });
  });

}
