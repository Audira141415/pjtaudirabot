import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { PrismaClient } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@pjtaudirabot/core';
import { getBotsConfig, getRedisConfig, getConfig, getPortConfig, getPortRegistry } from '@pjtaudirabot/config';
import http from 'node:http';
import {
  CommandRegistry,
  CommandExecutor,
  HelpCommand,
  PingCommand,
  StatusCommand,
  EchoCommand,
  RedisRateLimiter,
} from '@pjtaudirabot/services';
import {
  AIService,
  AICommand,
  AIClearCommand,
  UserService,
  SessionService,
  ShortTermMemory,
  LongTermMemory,
  SemanticMemory,
  NoOpSemanticMemory,
  MemoryExtractor,
  RuleBasedExtractor,
  ContextBuilder,
  MemoryManager,
  AnalyticsService,
  ModerationService,
  FlowEngine,
  EventBus,
  I18n,
  Scheduler,
  createMaintenanceTasks,
  GoogleSheetsService,
  TaskManagerService,
  ChecklistService,
  DocumentationService,
  DevOpsService,
  ReminderService,
  KnowledgeBaseService,
  ReportingService,
  IntentDetector,
  AIExtractor,
  ChatPipeline,
  GroupManagementService,
  ListGroupsCommand,
  AddGroupCommand,
  SetMonitorGroupCommand,
  SetReportTargetCommand,
  RemoveGroupCommand,
  ReportConfigCommand,
  TasksCommand,
  DoneCommand,
  AddTaskCommand,
  ChecklistCommand,
  CheckDoneCommand,
  ServerStatusCommand,
  DockerCommand,
  LogsCommand,
  HealthCheckCommand,
  SoloHealthCommand,
  RemindCommand,
  RemindersListCommand,
  KBSearchCommand,
  KBTopicsCommand,
  ReportCommand,
  IncidentsCommand,
  // ── Migrated features ──
  TicketService,
  SLAService,
  EscalationService,
  AlertService,
  DataExtractionService,
  NetworkService,
  BulkOperationsService,
  BackupService,
  ReportService,
  WhatsAppNotifier,
  TelegramNotifier,
  TicketCreateCommand,
  TicketStatusCommand,
  TicketListCommand,
  TicketAssignCommand,
  TicketPickCommand,
  TicketResolveCommand,
  TicketCloseCommand,
  TicketStatsCommand,
  MySLACommand,
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
  // ── New NOC features ──
  UptimeMonitorService,
  ShiftHandoverService,
  MonitorAddCommand,
  MonitorListCommand,
  MonitorRemoveCommand,
  MonitorStatusCommand,
  MonitorPauseCommand,
  MonitorResumeCommand,
  HandoverCommand,
  HandoverAckCommand,
  ShiftInfoCommand,
} from '@pjtaudirabot/services';
import { WhatsAppConnection } from './connection';
import { WhatsAppMessageHandler } from './message-handler';

async function main(): Promise<void> {
  const logger = createLogger('whatsapp-bot', 'debug');
  logger.info('Starting WhatsApp bot...');

  const config = getConfig();
  const botsConfig = getBotsConfig();
  const redisConfig = getRedisConfig();
  const portConfig = getPortConfig();
  const ports = getPortRegistry();

  // Reserve preferred health endpoint port (fallback binding handles collisions at runtime)
  ports.reserve('whatsapp', portConfig.whatsapp);
  logger.info(`WhatsApp preferred health port configured: ${portConfig.whatsapp}`);

  if (!botsConfig.whatsapp.enabled) {
    logger.warn('WhatsApp bot is disabled via config');
    return;
  }

  // Initialize database
  const db = new PrismaClient();
  await db.$connect();
  logger.info('Database connected');

  // Initialize Redis
  const redis = createClient({
    url: redisConfig.url,
    password: redisConfig.password,
    socket: { reconnectStrategy: (retries: number) => Math.min(retries * 50, 500) },
  }) as RedisClientType;

  await redis.connect();
  logger.info('Redis connected');

  // Services
  const userService = new UserService(db, redis, logger);
  const sessionService = new SessionService(db, redis, logger);

  // AI service
  const aiService = new AIService(
    {
      provider: config.AI_PROVIDER as any,
      openai: config.OPENAI_API_KEY
        ? {
            apiKey: config.OPENAI_API_KEY,
            model: config.OPENAI_MODEL,
            temperature: config.OPENAI_TEMPERATURE,
          }
        : undefined,
    },
    redis,
    logger
  );

  // Memory system
  if (config.MEMORY_ENABLED === 'true') {
    const shortTerm = new ShortTermMemory(
      redis,
      logger,
      config.MEMORY_SHORT_TERM_MAX,
      config.MEMORY_SHORT_TERM_TTL
    );

    const longTerm = new LongTermMemory(db, logger);

    const semantic = config.MEMORY_SEMANTIC_ENABLED === 'true' && config.OPENAI_API_KEY
      ? new SemanticMemory(db, {
          openaiApiKey: config.OPENAI_API_KEY,
          embeddingModel: config.OPENAI_EMBEDDING_MODEL,
        }, logger)
      : new NoOpSemanticMemory();

    const extractor = config.MEMORY_EXTRACTOR_MODE === 'ai' && config.OPENAI_API_KEY
      ? new MemoryExtractor(config.OPENAI_API_KEY, logger, config.OPENAI_MODEL)
      : config.MEMORY_EXTRACTOR_MODE === 'rules'
        ? new RuleBasedExtractor()
        : new RuleBasedExtractor(); // fallback

    const contextBuilder = new ContextBuilder(shortTerm, longTerm, semantic, logger);
    const memoryManager = new MemoryManager(shortTerm, longTerm, semantic, extractor, contextBuilder, logger);

    aiService.setMemoryManager(memoryManager);
    logger.info('Memory system initialized', {
      extractor: config.MEMORY_EXTRACTOR_MODE,
      semantic: config.MEMORY_SEMANTIC_ENABLED,
    });
  }

  // Rate limiter
  const rateLimiter = new RedisRateLimiter(
    redis,
    {
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
      strategy: config.RATE_LIMIT_STRATEGY as any,
    },
    logger
  );

  // Command registry
  const registry = new CommandRegistry(logger);
  registry.register(new HelpCommand(logger, registry));
  registry.register(new PingCommand(logger));
  registry.register(new StatusCommand(logger));
  registry.register(new EchoCommand(logger));
  registry.register(new AICommand(logger, aiService));
  registry.register(new AIClearCommand(logger, aiService));

  const executor = new CommandExecutor(registry, rateLimiter, logger);

  // Professional services
  const analytics = new AnalyticsService(db, redis, logger);
  const moderation = new ModerationService(db, redis, logger);
  const flowEngine = new FlowEngine(db, redis, logger);
  const eventBus = new EventBus(logger);
  const i18n = new I18n();

  // ── New productivity & DevOps services ──

  // Google Sheets integration
  let sheetsService: GoogleSheetsService | null = null;
  if (config.GOOGLE_SHEETS_ENABLED === 'true' && config.GOOGLE_SHEETS_CREDENTIALS) {
    sheetsService = new GoogleSheetsService(
      {
        credentials: config.GOOGLE_SHEETS_CREDENTIALS,
        spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID,
        ticketsOnly: true,
      },
      logger
    );
    if (sheetsService.isAvailable()) {
      sheetsService.initializeSheets().catch((err) => logger.error('Sheets init failed', err));
      logger.info('Google Sheets integration enabled');
    }
  }

  // Task Manager
  const taskManager = new TaskManagerService(db, sheetsService, logger);

  // Checklist
  const checklistService = new ChecklistService(db, sheetsService, logger);
  checklistService.seedDefaults().catch(() => {});

  // Documentation / Incidents
  const documentationService = new DocumentationService(db, sheetsService, logger);

  // DevOps
  const devopsService = new DevOpsService(db, sheetsService, logger);

  // Knowledge Base
  const knowledgeBase = new KnowledgeBaseService(db, logger);

  // Reporting
  const reportingService = new ReportingService(db, sheetsService, logger);

  // Reminders — with send callback for WhatsApp
  const reminderService = new ReminderService(db, redis, logger);

  // Intent Detector
  const intentDetector = new IntentDetector(
    taskManager, documentationService, reminderService, knowledgeBase, logger
  );

  // AI Extractor & Chat Pipeline
  const aiExtractor = new AIExtractor(aiService.getProvider(), logger);
  const chatPipeline = new ChatPipeline(db, aiExtractor, sheetsService, logger);

  // Register new commands
  registry.register(new TasksCommand(logger, taskManager));
  registry.register(new DoneCommand(logger, taskManager));
  registry.register(new AddTaskCommand(logger, taskManager));
  registry.register(new ChecklistCommand(logger, checklistService));
  registry.register(new CheckDoneCommand(logger, checklistService));
  registry.register(new ServerStatusCommand(logger, devopsService));
  registry.register(new DockerCommand(logger, devopsService));
  registry.register(new LogsCommand(logger, devopsService));
  registry.register(new HealthCheckCommand(logger, devopsService));
  registry.register(new SoloHealthCommand(logger, devopsService));
  registry.register(new RemindCommand(logger, reminderService));
  registry.register(new RemindersListCommand(logger, reminderService));
  registry.register(new KBSearchCommand(logger, knowledgeBase));
  registry.register(new KBTopicsCommand(logger, knowledgeBase));
  registry.register(new ReportCommand(logger, reportingService));
  registry.register(new IncidentsCommand(logger, db));

  // ── Migrated NOC/Helpdesk services ──
  const ticketService = new TicketService(db, redis, logger);
  const slaService = new SLAService(db, redis, logger);
  const escalationService = new EscalationService(db, redis, logger);
  const alertService = new AlertService(db, redis, logger);
  const dataExtractionService = new DataExtractionService(db, logger);
  const networkService = new NetworkService(db, redis, logger);
  const bulkOpsService = new BulkOperationsService(db, ticketService, logger);
  const backupService = new BackupService(db, logger);
  const reportService = new ReportService(db, logger);
  
  // Group Management Service
  const groupManagementService = new GroupManagementService(db, logger);

  // ── New NOC features: Uptime Monitor + Shift Handover ──
  const uptimeMonitorService = new UptimeMonitorService(db, redis, logger);
  const shiftHandoverService = new ShiftHandoverService(db, redis, logger);

  // Admin group notifier (configure ADMIN_GROUP_JIDS as comma-separated JIDs)
  const adminGroupJids = (config.ADMIN_GROUP_JIDS ?? '')
    .split(',')
    .map((j: string) => j.trim())
    .filter((j: string) => j.endsWith('@g.us'));

  // Seed defaults (non-blocking)
  escalationService.seedDefaultRules().catch(() => {});
  networkService.seedBranches().catch(() => {});

  // Late-bound callback for new-ticket broadcast (wired after notifier is available)
  let broadcastNewTicket: ((params: import('@pjtaudirabot/services').NewTicketBroadcast) => Promise<void>) | null = null;
  let broadcastTicketPicked: ((params: import('@pjtaudirabot/services').TicketPickedBroadcast) => Promise<void>) | null = null;
  let broadcastTicketResolved: ((params: import('@pjtaudirabot/services').TicketResolvedBroadcast) => Promise<void>) | null = null;

  // Register ticket commands
  registry.register(new TicketCreateCommand(logger, ticketService, slaService, sheetsService, (params) => broadcastNewTicket?.(params) ?? Promise.resolve()));
  registry.register(new TicketStatusCommand(logger, ticketService));
  registry.register(new TicketListCommand(logger, ticketService));
  registry.register(new TicketAssignCommand(logger, ticketService, slaService, sheetsService));
  registry.register(new TicketPickCommand(logger, ticketService, slaService, sheetsService, (params) => broadcastTicketPicked?.(params) ?? Promise.resolve()));
  registry.register(new TicketResolveCommand(logger, ticketService, slaService, sheetsService, (params) => broadcastTicketResolved?.(params) ?? Promise.resolve()));
  registry.register(new TicketCloseCommand(logger, ticketService, sheetsService));
  registry.register(new TicketStatsCommand(logger, ticketService, slaService));
  registry.register(new MySLACommand(logger, ticketService));
  // Escalation & Alert commands
  registry.register(new EscalateCommand(logger, escalationService));
  registry.register(new EscalationStatsCommand(logger, escalationService));
  registry.register(new AlertListCommand(logger, alertService));
  registry.register(new AlertStatsCommand(logger, alertService));
  // Data extraction command
  registry.register(new ExtractCommand(logger, dataExtractionService, ticketService, slaService));
  // Network commands
  registry.register(new NetworkStatusCommand(logger, networkService));
  registry.register(new NetworkAuditCommand(logger, networkService));
  // Report & Backup commands
  registry.register(new DailyReportCommand(logger, reportService));
  registry.register(new WeeklyReportCommand(logger, reportService));
  registry.register(new MonthlyReportCommand(logger, reportService));
  registry.register(new AuditReportCommand(logger, reportService));
  registry.register(new BackupCommand(logger, backupService));
  // Bulk operation commands
  registry.register(new BulkCloseCommand(logger, bulkOpsService));
  registry.register(new BulkStatusCommand(logger, bulkOpsService));
  registry.register(new BulkJobsCommand(logger, bulkOpsService));
  // Admin commands
  registry.register(new SetRoleCommand(logger, userService));
  
  // Group Management commands
  registry.register(new ListGroupsCommand(logger, groupManagementService));
  registry.register(new AddGroupCommand(logger, groupManagementService));
  registry.register(new SetMonitorGroupCommand(logger, groupManagementService));
  registry.register(new SetReportTargetCommand(logger, groupManagementService));
  registry.register(new RemoveGroupCommand(logger, groupManagementService));
  registry.register(new ReportConfigCommand(logger, groupManagementService));

  // ── Uptime monitoring commands ──
  registry.register(new MonitorAddCommand(logger, uptimeMonitorService));
  registry.register(new MonitorListCommand(logger, uptimeMonitorService));
  registry.register(new MonitorRemoveCommand(logger, uptimeMonitorService));
  registry.register(new MonitorStatusCommand(logger, uptimeMonitorService));
  registry.register(new MonitorPauseCommand(logger, uptimeMonitorService));
  registry.register(new MonitorResumeCommand(logger, uptimeMonitorService));

  // ── Shift handover commands ──
  registry.register(new HandoverCommand(logger, shiftHandoverService));
  registry.register(new HandoverAckCommand(logger, shiftHandoverService));
  registry.register(new ShiftInfoCommand(logger, shiftHandoverService));

  logger.info(`Registered ${registry.getAll().length} commands`);

  // Auto-promote: if no admin exists, promote the first user who sends a message
  const hasAdmin = await userService.hasAdmin();
  if (!hasAdmin) {
    logger.warn('No admin user found — the first person to message the bot will be promoted to admin');
  }

  // Scheduler
  const scheduler = new Scheduler(db, redis, logger);
  const maintenanceTasks = createMaintenanceTasks({
    db,
    redis,
    logger,
    analyticsFlush: () => analytics.flushToDatabase(),
    flowCleaner: () => flowEngine.cleanExpired().then(() => {}),
  });
  for (const task of maintenanceTasks) {
    scheduler.register(task);
  }

  // WhatsApp connection
  const connection = new WhatsAppConnection(
    {
      sessionDir: botsConfig.whatsapp.sessionDir,
      reconnectAttempts: botsConfig.whatsapp.reconnectAttempts,
      reconnectDelay: botsConfig.whatsapp.reconnectDelay,
    },
    logger
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
    // Auto-extract NOC messages
    dataExtractionService,
    ticketService,
    slaService,
    nocAutoExtract: true,
    sheetsService,
    // Broadcast auto-extracted tickets to admin groups (late-bound — set after notifier is ready)
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
      where: {
        role: 'ADMIN',
        platform: 'WHATSAPP',
      },
      select: {
        id: true,
        platformUserId: true,
      },
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

  // ── WhatsApp Notifier (uses connection.sendMessage) ──
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

  // Wire new-ticket broadcast callback (late-bound after notifier is ready)
  broadcastNewTicket = (params) => notifier.sendNewTicket(params);

  // ── Telegram NOC Notifier ──
  // Forwards ticket events from WhatsApp to a Telegram NOC group.
  // Requires TELEGRAM_BOT_TOKEN + TELEGRAM_NOC_CHAT_ID in .env
  const telegramNotifier = new TelegramNotifier(
    botsConfig.telegram.botToken ?? '',
    botsConfig.telegram.nocChatId ?? '',
    logger,
  );

  if (telegramNotifier.isConfigured()) {
    logger.info('Telegram NOC notifier configured — ticket events will be forwarded to Telegram');

    // Extend broadcastNewTicket to also fire Telegram (non-blocking)
    const waOnlyBroadcast = broadcastNewTicket!;
    broadcastNewTicket = async (params) => {
      await Promise.allSettled([
        waOnlyBroadcast(params),
        telegramNotifier.sendNewTicket(params),
      ]);
    };

    // Wire pick and resolve events to Telegram
    broadcastTicketPicked = (params) => telegramNotifier.sendTicketPicked(params);
    broadcastTicketResolved = (params) => telegramNotifier.sendTicketResolved(params);

    // Forward messageHandler's onTicketCreated as well (already set above, update it)
    messageHandler.onTicketCreated = broadcastNewTicket;
  } else {
    logger.info('Telegram NOC notifier: TELEGRAM_BOT_TOKEN or TELEGRAM_NOC_CHAT_ID not set — Telegram forwarding disabled');
  }

  // ── Scheduled Reports ──
  // Daily report — runs every hour, sends at 7:00 AM → Telegram group only
  scheduler.register({
    name: 'daily-report-auto',
    intervalMs: 60 * 60 * 1000, // every hour
    runOnStart: false,
    handler: async () => {
      const now = new Date();
      if (now.getHours() !== 7) return; // only at 7 AM
      try {
        const report = await reportService.generateDailyReport();
        await telegramNotifier.sendReportText(report);
      } catch (err) {
        logger.error('Scheduled daily report failed', err as Error);
      }
    },
  });

  // Weekly report — runs every hour, sends Monday 8:00 AM → Telegram group only
  scheduler.register({
    name: 'weekly-report-auto',
    intervalMs: 60 * 60 * 1000, // every hour
    runOnStart: false,
    handler: async () => {
      const now = new Date();
      if (now.getDay() !== 1 || now.getHours() !== 8) return; // Monday 8 AM
      try {
        const report = await reportService.generateWeeklyReport();
        await telegramNotifier.sendReportText(report);
      } catch (err) {
        logger.error('Scheduled weekly report failed', err as Error);
      }
    },
  });

  // Monthly report — runs every hour, sends on last day at 6:00 PM → Telegram group only
  scheduler.register({
    name: 'monthly-report-auto',
    intervalMs: 60 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();
      if (!isLastDayOfMonth || now.getHours() !== 18) return;

      try {
        const report = await reportService.generateMonthlyReport(now);
        await telegramNotifier.sendReportText(report);
      } catch (err) {
        logger.error('Scheduled monthly report failed', err as Error);
      }
    },
  });

  // Auto-backup — daily at 2:00 AM
  scheduler.register({
    name: 'auto-backup',
    intervalMs: 60 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      const now = new Date();
      if (now.getHours() !== 2) return;
      try {
        const result = await backupService.createFullBackup();
        logger.info('Auto-backup completed', { file: result.fileName, records: result.recordCount });
        await backupService.cleanupExpired();
      } catch (err) {
        logger.error('Scheduled backup failed', err as Error);
      }
    },
  });

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

      // Log all warnings/breaches
      for (const msg of [...warnings, ...breaches]) {
        logger.warn(msg);
      }
      for (const esc of escalations) {
        logger.warn(esc.message);
      }

      // Send to admin groups via notifier
      if (notifier.isConfigured()) {
        if (warnings.length > 0 || breaches.length > 0) {
          await notifier.sendSLAWarnings(warnings, breaches);
        }
        if (escalations.length > 0) {
          await notifier.sendEscalations(escalations);
        }
      }

      // Forward SLA alerts to Telegram NOC group
      if (telegramNotifier.isConfigured() && (warnings.length > 0 || breaches.length > 0)) {
        telegramNotifier.sendSLAAlert(warnings, breaches).catch(() => {});
      }

      // Fire alert notifications for SLA breaches
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

  // Solo Pro Pack Stage 2A: Personal SLA auto-reminder every 5 minutes.
  setInterval(async () => {
    if (personalSlaReminderRunning) {
      return;
    }

    personalSlaReminderRunning = true;
    try {
      const admins = await db.user.findMany({
        where: {
          role: 'ADMIN',
          platform: 'WHATSAPP',
        },
        select: {
          id: true,
          platformUserId: true,
        },
      });

      for (const admin of admins) {
        const overview = await ticketService.getPersonalSLAOverview(admin.id, 10);
        if (overview.breachedCount === 0 && overview.dueSoonCount === 0) {
          continue;
        }

        const fingerprint = `${overview.breachedCount}:${overview.dueSoonCount}:${overview.rows.map((r) => r.ticketNumber).join(',')}`;
        const dedupeKey = `solo:sla:last-reminder:${admin.id}`;
        const lockKey = `solo:sla:reminder-lock:${admin.id}`;

        const lockAcquired = await redis.set(lockKey, '1', { NX: true, EX: 240 });
        if (!lockAcquired) {
          continue;
        }

        const previous = await redis.get(dedupeKey);
        if (previous === fingerprint) {
          continue;
        }

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

        // WA personal DM disabled — SLA reminder goes to Telegram NOC group only
        await telegramNotifier.sendReportText(message);
        await redis.set(dedupeKey, fingerprint, { EX: 1800 });
      }
    } catch (err) {
      logger.error('Personal SLA auto-reminder failed', err as Error);
    } finally {
      personalSlaReminderRunning = false;
    }
  }, 5 * 60_000);

  // Solo Pro Pack Stage 2B: Auto-recovery reliability every 5 minutes.
  setInterval(async () => {
    if (autoRecoveryRunning) {
      return;
    }

    autoRecoveryRunning = true;
    try {
      const lockKey = 'solo:recovery:loop-lock';
      const lockAcquired = await redis.set(lockKey, '1', { NX: true, EX: 240 });
      if (!lockAcquired) {
        return;
      }

      const checks = await devopsService.healthCheck();
      const downServices = checks.filter((item) => item.status === 'down').map((item) => item.service);
      if (downServices.length === 0) {
        return;
      }

      const dedupeKey = 'solo:recovery:last-fingerprint';
      const fingerprint = downServices.slice().sort().join(',');
      const previous = await redis.get(dedupeKey);
      if (previous === fingerprint) {
        return;
      }

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

  // ── SLA countdown warnings — every 90 seconds ──
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

  // ── Unassigned ticket reminder — every 5 minutes ──
  // Reminds admin groups about OPEN tickets with no assignee.
  // Thresholds: CRITICAL/HIGH after 5m, MEDIUM after 15m, LOW after 30m.
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
        if (t.assignedToId) continue; // already assigned skip
        const minutesOpen = Math.floor((now - t.createdAt.getTime()) / 60_000);
        const threshold = thresholdMinutes[t.priority] ?? 15;
        if (minutesOpen < threshold) continue;

        // Redis dedup — remind once per threshold window
        const dedupKey = `ticket:unassigned:reminded:${t.id}`;
        const alreadyReminded = await redis.get(dedupKey);
        if (alreadyReminded) continue;

        // Mark reminded; TTL = 2× threshold (reminder fires again after window passes)
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

  // Health-check HTTP server on dedicated port
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
  // Never crash the bot process on runtime errors - Baileys uses aggressive async throws
  console.warn('[uncaughtException caught - bot continues]', err?.message ?? err);
});

process.on('unhandledRejection', (reason) => {
  // Never crash the bot process on unhandled rejections from Baileys internals
  console.warn('[unhandledRejection caught - bot continues]', (reason as any)?.message ?? reason);
});

main().catch((error) => {
  // Only fatal errors during STARTUP should kill the process
  console.error('Fatal error starting WhatsApp bot:', error);
  process.exit(1);
});
