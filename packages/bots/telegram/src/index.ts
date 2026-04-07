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
  // ── NOC Ticket commands ──
  TicketService,
  SLAService,
  TicketCreateCommand,
  TicketStatusCommand,
  TicketListCommand,
  TicketAssignCommand,
  TicketPickCommand,
  TicketResolveCommand,
  TicketCloseCommand,
  TicketStatsCommand,
  MySLACommand,
  TelegramNotifier,
  // ── Uptime monitoring ──
  UptimeMonitorService,
  MonitorAddCommand,
  MonitorListCommand,
  MonitorRemoveCommand,
  MonitorStatusCommand,
  MonitorPauseCommand,
  MonitorResumeCommand,
  // ── Shift handover ──
  ShiftHandoverService,
  HandoverCommand,
  HandoverAckCommand,
  ShiftInfoCommand,
} from '@pjtaudirabot/services';
import { TelegramConnection } from './bot';
import { TelegramMessageHandler } from './message-handler';

async function main(): Promise<void> {
  const logger = createLogger('telegram-bot', 'debug');
  logger.info('Starting Telegram bot...');

  const config = getConfig();
  const botsConfig = getBotsConfig();
  const redisConfig = getRedisConfig();
  const portConfig = getPortConfig();
  const ports = getPortRegistry();

  // Reserve dedicated port for this bot
  ports.reserve('telegram', portConfig.telegram);
  await ports.validateAll();
  logger.info(`Telegram port ${portConfig.telegram} reserved and validated`);

  if (!botsConfig.telegram.enabled) {
    logger.warn('Telegram bot is disabled via config');
    return;
  }

  if (!botsConfig.telegram.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
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

  // Command registry — same commands as WhatsApp
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

  let sheetsService: GoogleSheetsService | null = null;
  if (config.GOOGLE_SHEETS_ENABLED === 'true' && config.GOOGLE_SHEETS_CREDENTIALS) {
    sheetsService = new GoogleSheetsService(
      { credentials: config.GOOGLE_SHEETS_CREDENTIALS, spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID },
      logger
    );
    if (sheetsService.isAvailable()) {
      sheetsService.initializeSheets().catch((err) => logger.error('Sheets init failed', err));
      logger.info('Google Sheets integration enabled');
    }
  }

  const taskManager = new TaskManagerService(db, sheetsService, logger);
  const checklistService = new ChecklistService(db, sheetsService, logger);
  checklistService.seedDefaults().catch(() => {});
  const documentationService = new DocumentationService(db, sheetsService, logger);
  const devopsService = new DevOpsService(db, sheetsService, logger);
  const knowledgeBase = new KnowledgeBaseService(db, logger);
  const reportingService = new ReportingService(db, sheetsService, logger);
  const reminderService = new ReminderService(db, redis, logger);
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

  // ── NOC Ticket commands — NOC can use !take, !ticket-status etc. from Telegram ──
  const ticketService = new TicketService(db, redis, logger);
  const slaService = new SLAService(db, redis, logger);

  // ── Uptime monitoring & shift handover services ──
  const uptimeMonitorService = new UptimeMonitorService(db, redis, logger);
  const shiftHandoverService = new ShiftHandoverService(db, redis, logger);

  // TelegramNotifier for broadcasting pick/resolve events back to the NOC group
  const nocChatId = botsConfig.telegram.nocChatId ?? '';
  const telegramNotifier = new TelegramNotifier(
    botsConfig.telegram.botToken,
    nocChatId,
    logger,
  );

  let broadcastTicketPicked: ((params: import('@pjtaudirabot/services').TicketPickedBroadcast) => Promise<void>) | null = null;
  let broadcastTicketResolved: ((params: import('@pjtaudirabot/services').TicketResolvedBroadcast) => Promise<void>) | null = null;
  let broadcastNewTicket: ((params: import('@pjtaudirabot/services').NewTicketBroadcast) => Promise<void>) | null = null;

  if (telegramNotifier.isConfigured()) {
    broadcastTicketPicked = (params) => telegramNotifier.sendTicketPicked(params);
    broadcastTicketResolved = (params) => telegramNotifier.sendTicketResolved(params);
    broadcastNewTicket = (params) => telegramNotifier.sendNewTicket(params);
    logger.info('Telegram ticket broadcast configured for NOC group');
  }

  registry.register(new TicketCreateCommand(logger, ticketService, slaService, sheetsService,
    (params) => broadcastNewTicket?.(params) ?? Promise.resolve()));
  registry.register(new TicketStatusCommand(logger, ticketService));
  registry.register(new TicketListCommand(logger, ticketService));
  registry.register(new TicketAssignCommand(logger, ticketService, slaService, sheetsService));
  registry.register(new TicketPickCommand(logger, ticketService, slaService, sheetsService,
    (params) => broadcastTicketPicked?.(params) ?? Promise.resolve()));
  registry.register(new TicketResolveCommand(logger, ticketService, slaService, sheetsService,
    (params) => broadcastTicketResolved?.(params) ?? Promise.resolve()));
  registry.register(new TicketCloseCommand(logger, ticketService, sheetsService));
  registry.register(new TicketStatsCommand(logger, ticketService, slaService));
  registry.register(new MySLACommand(logger, ticketService));

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

  logger.info(`Telegram bot: ${registry.getAll().length} commands registered`);

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

  // Telegram bot
  const connection = new TelegramConnection(
    {
      token: botsConfig.telegram.botToken,
      webhookUrl: botsConfig.telegram.webhookUrl,
    },
    logger
  );

  const messageHandler = new TelegramMessageHandler({
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
  });

  connection.onMessage((ctx) => messageHandler.handle(ctx));

  await connection.start();

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

  // ── Uptime monitoring loop — every 60 seconds ──
  setInterval(async () => {
    try {
      const alerts = await uptimeMonitorService.checkAll();
      if (!telegramNotifier.isConfigured()) return;
      for (const alert of alerts) {
        const icon = alert.status === 'DOWN' ? '🔴' : '🟢';
        const msg = alert.status === 'DOWN'
          ? `${icon} *[UPTIME ALERT]*\n*${alert.targetName}* (${alert.host}) DOWN!\n${alert.errorMessage ?? 'Tidak ada respon'}`
          : `${icon} *[UPTIME RECOVERED]*\n*${alert.targetName}* (${alert.host}) kembali online`;
        telegramNotifier.sendReportText(msg).catch((err) => logger.error('Uptime alert send failed', err as Error));
      }
    } catch (err) {
      logger.error('Uptime check loop error', err as Error);
    }
  }, 60_000);

  // ── SLA countdown warnings — every 2 minutes ──
  setInterval(async () => {
    try {
      const countdowns = await slaService.checkCountdown(redis);
      if (!telegramNotifier.isConfigured() || countdowns.length === 0) return;
      for (const msg of countdowns) {
        telegramNotifier.sendReportText(msg).catch((err) => logger.error('SLA countdown send failed', err as Error));
      }
    } catch (err) {
      logger.error('SLA countdown check error', err as Error);
    }
  }, 2 * 60_000);

  // ── Shift handover auto-push — every 5 minutes ──
  setInterval(async () => {
    try {
      if (!shiftHandoverService.isHandoverTime()) return;
      if (!telegramNotifier.isConfigured()) return;
      const currentShift = shiftHandoverService.getCurrentShift();
      const dedupeKey = `handover:auto:${currentShift.label}:${new Date().toDateString()}`;
      const locked = await redis.set(dedupeKey, '1', { NX: true, EX: 3600 });
      if (!locked) return; // already sent for this shift today
      const handover = await shiftHandoverService.generateHandover();
      telegramNotifier.sendReportText(handover.formattedText).catch((err) => logger.error('Handover auto-push failed', err as Error));
      logger.info('Handover auto-push sent', { shift: currentShift.label });
    } catch (err) {
      logger.error('Handover auto-push error', err as Error);
    }
  }, 5 * 60_000);

  // Health-check HTTP server on dedicated port
  const healthServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'telegram-bot',
      status: 'healthy',
      port: portConfig.telegram,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }));
  });
  healthServer.listen(portConfig.telegram, () => {
    logger.info(`Telegram health endpoint on :${portConfig.telegram}/`);
  });

  logger.info('Telegram bot started');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down Telegram bot...');
    healthServer.close();
    scheduler.shutdown();
    await connection.stop();
    await redis.quit();
    await db.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error starting Telegram bot:', error);
  process.exit(1);
});
