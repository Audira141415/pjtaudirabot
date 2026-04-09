import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import http from 'node:http';
import {
  initInfrastructure,
  createBotServices,
  registerTicketCommands,
  setupMaintenanceScheduler,
  // ── WhatsApp-specific services ──
  EscalationService,
  AlertService,
  DataExtractionService,
  NetworkService,
  BulkOperationsService,
  BackupService,
  ReportService,
  GroupManagementService,
  WhatsAppNotifier,
  TelegramNotifier,
  // ── WhatsApp-specific commands ──
  EscalateCommand,
  EscalationStatsCommand,
  AlertListCommand,
  AlertStatsCommand,
  ExtractCommand,
  NetworkStatusCommand,
  NetworkAuditCommand,
  DailyReportCommand,
  WeeklyReportCommand,
  MonthlyReportCommand,
  AuditReportCommand,
  BackupCommand,
  BulkCloseCommand,
  BulkStatusCommand,
  BulkJobsCommand,
  SetRoleCommand,
  ListGroupsCommand,
  AddGroupCommand,
  SetMonitorGroupCommand,
  SetReportTargetCommand,
  RemoveGroupCommand,
  ReportConfigCommand,
} from '@pjtaudirabot/services';
import { WhatsAppConnection } from './connection';
import { WhatsAppMessageHandler } from './message-handler';

async function main(): Promise<void> {
  const infra = await initInfrastructure('whatsapp-bot');
  const { logger, config, botsConfig, portConfig, ports, db, redis } = infra;

  // Reserve preferred health endpoint port (fallback binding handles collisions at runtime)
  ports.reserve('whatsapp', portConfig.whatsapp);
  logger.info(`WhatsApp preferred health port configured: ${portConfig.whatsapp}`);

  if (!botsConfig.whatsapp.enabled) {
    logger.warn('WhatsApp bot is disabled via config');
    return;
  }

  // ── Shared services (AI, memory, commands, scheduler, etc.) ──
  const services = await createBotServices(infra, { sheetsTicketsOnly: true });
  const {
    registry, executor, userService, sessionService,
    analytics, moderation, flowEngine, eventBus, i18n,
    intentDetector, chatPipeline, sheetsService,
    ticketService, slaService, devopsService,
    uptimeMonitorService, shiftHandoverService,
    reminderService, scheduler,
  } = services;

  // ── WhatsApp-specific NOC services ──
  const escalationService = new EscalationService(db, redis, logger);
  const alertService = new AlertService(db, redis, logger);
  const dataExtractionService = new DataExtractionService(db, logger);
  const networkService = new NetworkService(db, redis, logger);
  const bulkOpsService = new BulkOperationsService(db, ticketService, logger);
  const backupService = new BackupService(db, logger);
  const reportService = new ReportService(db, logger);
  const groupManagementService = new GroupManagementService(db, logger);

  // Seed defaults (non-blocking)
  escalationService.seedDefaultRules().catch(() => {});
  networkService.seedBranches().catch(() => {});

  // Admin group notifier (ADMIN_GROUP_JIDS as comma-separated JIDs)
  const adminGroupJids = (config.ADMIN_GROUP_JIDS ?? '')
    .split(',')
    .map((j: string) => j.trim())
    .filter((j: string) => j.endsWith('@g.us'));

  // Late-bound broadcast callbacks
  let broadcastNewTicket: ((params: any) => Promise<void>) | null = null;
  let broadcastTicketPicked: ((params: any) => Promise<void>) | null = null;
  let broadcastTicketResolved: ((params: any) => Promise<void>) | null = null;

  // ── Ticket commands ──
  registerTicketCommands(services, logger, {
    onNewTicket: (params) => broadcastNewTicket?.(params) ?? Promise.resolve(),
    onTicketPicked: (params) => broadcastTicketPicked?.(params) ?? Promise.resolve(),
    onTicketResolved: (params) => broadcastTicketResolved?.(params) ?? Promise.resolve(),
  });

  // ── WhatsApp-specific commands ──
  registry.register(new EscalateCommand(logger, escalationService));
  registry.register(new EscalationStatsCommand(logger, escalationService));
  registry.register(new AlertListCommand(logger, alertService));
  registry.register(new AlertStatsCommand(logger, alertService));
  registry.register(new ExtractCommand(logger, dataExtractionService, ticketService, slaService));
  registry.register(new NetworkStatusCommand(logger, networkService));
  registry.register(new NetworkAuditCommand(logger, networkService));
  registry.register(new DailyReportCommand(logger, reportService));
  registry.register(new WeeklyReportCommand(logger, reportService));
  registry.register(new MonthlyReportCommand(logger, reportService));
  registry.register(new AuditReportCommand(logger, reportService));
  registry.register(new BackupCommand(logger, backupService));
  registry.register(new BulkCloseCommand(logger, bulkOpsService));
  registry.register(new BulkStatusCommand(logger, bulkOpsService));
  registry.register(new BulkJobsCommand(logger, bulkOpsService));
  registry.register(new SetRoleCommand(logger, userService));
  registry.register(new ListGroupsCommand(logger, groupManagementService));
  registry.register(new AddGroupCommand(logger, groupManagementService));
  registry.register(new SetMonitorGroupCommand(logger, groupManagementService));
  registry.register(new SetReportTargetCommand(logger, groupManagementService));
  registry.register(new RemoveGroupCommand(logger, groupManagementService));
  registry.register(new ReportConfigCommand(logger, groupManagementService));

  logger.info(`Registered ${registry.getAll().length} commands`);

  // Auto-promote: if no admin exists, promote the first user who sends a message
  const hasAdmin = await userService.hasAdmin();
  if (!hasAdmin) {
    logger.warn('No admin user found — the first person to message the bot will be promoted to admin');
  }

  // ── Scheduler / maintenance ──
  setupMaintenanceScheduler(services, infra);

  // ── WhatsApp connection ──
  const connection = new WhatsAppConnection(
    {
      sessionDir: botsConfig.whatsapp.sessionDir,
      reconnectAttempts: botsConfig.whatsapp.reconnectAttempts,
      reconnectDelay: botsConfig.whatsapp.reconnectDelay,
    },
    logger,
  );

  const messageHandler = new WhatsAppMessageHandler({
    connection,
    commandExecutor: executor,
    userService,
    sessionService,
    logger,
    moderation,
    analytics,
    flowEngine,
    eventBus,
    i18n,
    intentDetector,
    chatPipeline,
    dataExtractionService,
    ticketService,
    slaService,
    nocAutoExtract: true,
    sheetsService,
    onTicketCreated: (params) => broadcastNewTicket?.(params) ?? Promise.resolve(),
  });

  connection.onMessage((msg) => messageHandler.handle(msg));
  await connection.connect();

  const effectiveAdminGroupJids = botsConfig.whatsapp.silentMode ? [] : adminGroupJids;
  let personalSlaReminderRunning = false;
  let autoRecoveryRunning = false;
  let boundHealthPort = portConfig.whatsapp;

  const sendToAdminUsers = async (message: string): Promise<number> => {
    const admins = await db.user.findMany({
      where: { role: 'ADMIN', platform: 'WHATSAPP' },
      select: { id: true, platformUserId: true },
    });
    let sent = 0;
    for (const admin of admins) {
      try {
        await connection.sendMessage(admin.platformUserId, message);
        sent += 1;
      } catch (err) {
        logger.error(`Failed to send admin DM to ${admin.id}`, err as Error);
      }
    }
    return sent;
  };

  // ── WhatsApp Notifier ──
  const notifier = new WhatsAppNotifier(
    effectiveAdminGroupJids,
    (jid, text) => connection.sendMessage(jid, text),
    logger,
  );
  if (botsConfig.whatsapp.silentMode) {
    logger.info('WhatsApp silent mode enabled — broadcast notifications are disabled');
  } else if (notifier.isConfigured()) {
    logger.info(`Admin notifier configured for ${effectiveAdminGroupJids.length} group(s)`);
  } else {
    logger.info('Admin notifier: no ADMIN_GROUP_JIDS configured — alerts will only be logged');
  }

  // Wire new-ticket broadcast callback
  broadcastNewTicket = (params) => notifier.sendNewTicket(params);

  // ── Telegram NOC Notifier (cross-platform forwarding) ──
  const telegramNotifier = new TelegramNotifier(
    botsConfig.telegram.botToken ?? '',
    botsConfig.telegram.nocChatId ?? '',
    logger,
  );

  if (telegramNotifier.isConfigured()) {
    logger.info('Telegram NOC notifier configured — ticket events will be forwarded to Telegram');

    const waOnlyBroadcast = broadcastNewTicket!;
    broadcastNewTicket = async (params) => {
      await Promise.allSettled([
        waOnlyBroadcast(params),
        telegramNotifier.sendNewTicket(params),
      ]);
    };

    broadcastTicketPicked = (params) => telegramNotifier.sendTicketPicked(params);
    broadcastTicketResolved = (params) => telegramNotifier.sendTicketResolved(params);
    messageHandler.onTicketCreated = broadcastNewTicket;
  } else {
    logger.info('Telegram NOC notifier: TELEGRAM_BOT_TOKEN or TELEGRAM_NOC_CHAT_ID not set — Telegram forwarding disabled');
  }

  // ── Scheduled Reports ──
  scheduler.register({
    name: 'daily-report-auto',
    intervalMs: 60 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      if (new Date().getHours() !== 7) return;
      try {
        const report = await reportService.generateDailyReport();
        await telegramNotifier.sendReportText(report);
      } catch (err) {
        logger.error('Scheduled daily report failed', err as Error);
      }
    },
  });

  scheduler.register({
    name: 'weekly-report-auto',
    intervalMs: 60 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      const now = new Date();
      if (now.getDay() !== 1 || now.getHours() !== 8) return;
      try {
        const report = await reportService.generateWeeklyReport();
        await telegramNotifier.sendReportText(report);
      } catch (err) {
        logger.error('Scheduled weekly report failed', err as Error);
      }
    },
  });

  scheduler.register({
    name: 'monthly-report-auto',
    intervalMs: 60 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      if (tomorrow.getMonth() === now.getMonth() || now.getHours() !== 18) return;
      try {
        const report = await reportService.generateMonthlyReport(now);
        await telegramNotifier.sendReportText(report);
      } catch (err) {
        logger.error('Scheduled monthly report failed', err as Error);
      }
    },
  });

  scheduler.register({
    name: 'auto-backup',
    intervalMs: 60 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      if (new Date().getHours() !== 2) return;
      try {
        const result = await backupService.createFullBackup();
        logger.info('Auto-backup completed', { file: result.fileName, records: result.recordCount });
        await backupService.cleanupExpired();
      } catch (err) {
        logger.error('Scheduled backup failed', err as Error);
      }
    },
  });

  // ── Uptime monitoring check — every 2 minutes ──
  scheduler.register({
    name: 'uptime-check',
    intervalMs: 2 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      try {
        const alerts = await uptimeMonitorService.checkAll();
        if (alerts.length > 0 && notifier.isConfigured()) {
          await notifier.sendUptimeAlerts(alerts);
        }
      } catch (err) {
        logger.error('Uptime check failed', err as Error);
      }
    },
  });

  // ── Uptime data purge — daily at 3 AM ──
  scheduler.register({
    name: 'uptime-purge',
    intervalMs: 60 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      if (new Date().getHours() !== 3) return;
      try {
        await uptimeMonitorService.purgeOldChecks(30);
      } catch (err) {
        logger.error('Uptime purge failed', err as Error);
      }
    },
  });

  // ── Shift handover auto-broadcast — check every 5 minutes ──
  scheduler.register({
    name: 'shift-handover-auto',
    intervalMs: 5 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      try {
        const handover = await shiftHandoverService.checkAndBroadcast();
        if (handover && notifier.isConfigured()) {
          await notifier.sendShiftHandover(handover.formattedText);
        }
      } catch (err) {
        logger.error('Shift handover auto-broadcast failed', err as Error);
      }
    },
  });

  // ── Interval loops ──

  // Poll reminders every 30 seconds
  setInterval(async () => {
    try {
      await reminderService.checkAndDeliver(async (userId, text) => {
        try {
          await connection.sendMessage(userId, text);
        } catch (err) {
          logger.error(`Failed to send reminder to ${userId}`, err as Error);
        }
      });
    } catch (err) {
      logger.error('Reminder poll error', err as Error);
    }
  }, 30_000);

  // SLA & Escalation check every 60 seconds
  setInterval(async () => {
    try {
      const { warnings, breaches } = await slaService.checkAll();
      const escalations = await escalationService.checkForEscalations();

      for (const msg of [...warnings, ...breaches]) {
        logger.warn(msg);
      }
      for (const esc of escalations) {
        logger.warn(esc.message);
      }

      if (notifier.isConfigured()) {
        if (warnings.length > 0 || breaches.length > 0) {
          await notifier.sendSLAWarnings(warnings, breaches);
        }
        if (escalations.length > 0) {
          await notifier.sendEscalations(escalations);
        }
      }

      if (telegramNotifier.isConfigured() && (warnings.length > 0 || breaches.length > 0)) {
        telegramNotifier.sendSLAAlert(warnings, breaches).catch(() => {});
      }

      if (breaches.length > 0) {
        const alertNotifications = await alertService.evaluateSLAAlerts(breaches);
        if (notifier.isConfigured() && alertNotifications.length > 0) {
          await notifier.sendAlerts(alertNotifications);
        }
      }
    } catch (err) {
      logger.error('SLA/Escalation check error', err as Error);
    }
  }, 60_000);

  // Personal SLA auto-reminder every 5 minutes
  setInterval(async () => {
    if (personalSlaReminderRunning) return;
    personalSlaReminderRunning = true;
    try {
      const admins = await db.user.findMany({
        where: { role: 'ADMIN', platform: 'WHATSAPP' },
        select: { id: true, platformUserId: true },
      });

      for (const admin of admins) {
        const overview = await ticketService.getPersonalSLAOverview(admin.id, 10);
        if (overview.breachedCount === 0 && overview.dueSoonCount === 0) continue;

        const fingerprint = `${overview.breachedCount}:${overview.dueSoonCount}:${overview.rows.map((r) => r.ticketNumber).join(',')}`;
        const dedupeKey = `solo:sla:last-reminder:${admin.id}`;
        const lockKey = `solo:sla:reminder-lock:${admin.id}`;

        const lockAcquired = await redis.set(lockKey, '1', { NX: true, EX: 240 });
        if (!lockAcquired) continue;

        const previous = await redis.get(dedupeKey);
        if (previous === fingerprint) continue;

        const topLines = overview.rows.slice(0, 4).map((row) => {
          const icon = row.breached ? '🚨' : row.dueSoon ? '⚠️' : '✅';
          const resp = row.responseRemainingMin === null
            ? 'resp:done'
            : row.responseRemainingMin < 0
              ? `resp:over ${Math.abs(row.responseRemainingMin)}m`
              : `resp:${row.responseRemainingMin}m`;
          const res = row.resolutionRemainingMin === null
            ? 'res:done'
            : row.resolutionRemainingMin < 0
              ? `res:over ${Math.abs(row.resolutionRemainingMin)}m`
              : `res:${row.resolutionRemainingMin}m`;
          return `${icon} ${row.ticketNumber} (${resp}, ${res})`;
        });

        const message = [
          '⏰ *AUTO REMINDER SLA PERSONAL*',
          `🚨 Breached: ${overview.breachedCount}`,
          `⚠️ Due ≤30m: ${overview.dueSoonCount}`,
          '',
          ...topLines,
          '',
          'Aksi cepat:',
          '• !sla-me',
          '• !ticket-status <ticket-number>',
          '• !ticket-resolve <ticket-number> | <root-cause> | <solution>',
        ].join('\n');

        await telegramNotifier.sendReportText(message);
        await redis.set(dedupeKey, fingerprint, { EX: 1800 });
      }
    } catch (err) {
      logger.error('Personal SLA auto-reminder failed', err as Error);
    } finally {
      personalSlaReminderRunning = false;
    }
  }, 5 * 60_000);

  // Auto-recovery reliability every 5 minutes
  setInterval(async () => {
    if (autoRecoveryRunning) return;
    autoRecoveryRunning = true;
    try {
      const lockKey = 'solo:recovery:loop-lock';
      const lockAcquired = await redis.set(lockKey, '1', { NX: true, EX: 240 });
      if (!lockAcquired) return;

      const checks = await devopsService.healthCheck();
      const downServices = checks.filter((item) => item.status === 'down').map((item) => item.service);
      if (downServices.length === 0) return;

      const dedupeKey = 'solo:recovery:last-fingerprint';
      const fingerprint = downServices.slice().sort().join(',');
      const previous = await redis.get(dedupeKey);
      if (previous === fingerprint) return;

      const recovery = await devopsService.attemptAutoRecovery(downServices);
      const ok = recovery.filter((item) => item.success).map((item) => item.service);
      const failed = recovery.filter((item) => !item.success).map((item) => item.service);

      const message = [
        '🛠️ *AUTO RECOVERY REPORT*',
        `Down detected: ${downServices.join(', ')}`,
        ok.length > 0 ? `✅ Recovered: ${ok.join(', ')}` : '✅ Recovered: -',
        failed.length > 0 ? `❌ Need manual check: ${failed.join(', ')}` : '❌ Need manual check: -',
        '',
        'Aksi cepat:',
        '• !solo-health',
        '• !health',
        '• !logs <service>',
      ].join('\n');

      await sendToAdminUsers(message);
      await redis.set(dedupeKey, fingerprint, { EX: 1800 });
    } catch (err) {
      logger.error('Auto-recovery reliability check failed', err as Error);
    } finally {
      autoRecoveryRunning = false;
    }
  }, 5 * 60_000);

  // SLA countdown warnings — every 90 seconds
  setInterval(async () => {
    try {
      const countdowns = await slaService.checkCountdown(redis);
      if (countdowns.length > 0 && notifier.isConfigured()) {
        await notifier.sendSLACountdowns(countdowns);
      }
    } catch (err) {
      logger.error('SLA countdown check failed', err as Error);
    }
  }, 90_000);

  // Unassigned ticket reminder — every 5 minutes
  setInterval(async () => {
    if (!notifier.isConfigured()) return;
    try {
      const { tickets } = await ticketService.list({ status: 'OPEN' }, 50);
      const now = Date.now();
      const toRemind: Array<{ ticketNumber: string; title: string; priority: string; minutesOpen: number }> = [];

      const thresholdMinutes: Record<string, number> = {
        CRITICAL: 5, HIGH: 5, MEDIUM: 15, LOW: 30,
      };

      for (const t of tickets) {
        if (t.assignedToId) continue;
        const minutesOpen = Math.floor((now - t.createdAt.getTime()) / 60_000);
        const threshold = thresholdMinutes[t.priority] ?? 15;
        if (minutesOpen < threshold) continue;

        const dedupKey = `ticket:unassigned:reminded:${t.id}`;
        const alreadyReminded = await redis.get(dedupKey);
        if (alreadyReminded) continue;

        await redis.set(dedupKey, '1', { EX: threshold * 60 * 2 });
        toRemind.push({ ticketNumber: t.ticketNumber, title: t.title, priority: t.priority, minutesOpen });
      }

      if (toRemind.length > 0) {
        await notifier.sendUnassignedReminders(toRemind);
      }
    } catch (err) {
      logger.error('Unassigned ticket reminder failed', err as Error);
    }
  }, 5 * 60_000);

  // ── Health-check HTTP server ──
  const healthServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'whatsapp-bot',
      status: 'healthy',
      port: boundHealthPort,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }));
  });

  const bindHealthServer = async () => {
    const desiredPort = portConfig.whatsapp;
    const maxPort = desiredPort + 20;

    for (let port = desiredPort; port <= maxPort; port += 1) {
      const listened = await new Promise<boolean>((resolve) => {
        const onError = (err: NodeJS.ErrnoException) => {
          healthServer.off('listening', onListening);
          if (err.code === 'EADDRINUSE') {
            resolve(false);
            return;
          }
          logger.error(`Health server failed on :${port}`, err);
          resolve(false);
        };

        const onListening = () => {
          healthServer.off('error', onError);
          resolve(true);
        };

        healthServer.once('error', onError);
        healthServer.once('listening', onListening);
        healthServer.listen(port);
      });

      if (listened) {
        boundHealthPort = port;
        if (port !== desiredPort) {
          logger.info(`WhatsApp health endpoint moved to fallback port :${port}/ (default :${desiredPort} in use)`);
        } else {
          logger.info(`WhatsApp health endpoint on :${port}/`);
        }
        return;
      }
    }

    logger.error(`No available health endpoint port in range ${desiredPort}-${maxPort}; health endpoint disabled`);
  };

  await bindHealthServer();

  logger.info('WhatsApp bot started — scan QR code to authenticate');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down WhatsApp bot...');
    healthServer.close();
    scheduler.shutdown();
    await connection.disconnect();
    await redis.quit();
    await db.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Keep the bot alive despite Baileys internal errors (signal protocol, WebSocket, ECONNRESET)
process.on('uncaughtException', (err) => {
  console.warn('[uncaughtException caught - bot continues]', err?.message ?? err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[unhandledRejection caught - bot continues]', (reason as any)?.message ?? reason);
});

main().catch((error) => {
  console.error('Fatal error starting WhatsApp bot:', error);
  process.exit(1);
});
