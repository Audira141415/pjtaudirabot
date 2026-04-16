/**
 * Shared bot bootstrap — eliminates duplicated init code between Telegram and WhatsApp bots.
 *
 * Usage:
 *   const infra = await initInfrastructure('telegram-bot');
 *   const services = await createBotServices(infra);
 *   registerTicketCommands(services, broadcasts);
 *   setupMaintenanceScheduler(services);
 */

import { PrismaClient } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';
import { createLogger, ILogger } from '@pjtaudirabot/core';
import {
  getBotsConfig,
  getRedisConfig,
  getConfig,
  getPortConfig,
  getPortRegistry,
} from '@pjtaudirabot/config';

import { CommandRegistry } from './command/registry';
import { CommandExecutor } from './command/executor';
import { HelpCommand, PingCommand, StatusCommand, EchoCommand } from './command/builtins';
import { AICommand, AIClearCommand } from './command/ai-command';
import { TasksCommand, DoneCommand, AddTaskCommand } from './command/task-commands';
import { ChecklistCommand, CheckDoneCommand } from './command/checklist-commands';
import {
  ServerStatusCommand,
  DockerCommand,
  LogsCommand,
  HealthCheckCommand,
  SoloHealthCommand,
} from './command/devops-commands';
import { RemindCommand, RemindersListCommand } from './command/reminder-commands';
import { KBSearchCommand, KBTopicsCommand } from './command/knowledge-commands';
import { ReportCommand, IncidentsCommand } from './command/report-commands';
import {
  TicketCreateCommand,
  TicketStatusCommand,
  TicketListCommand,
  TicketAssignCommand,
  TicketPickCommand,
  TicketResolveCommand,
  TicketCloseCommand,
  TicketSyncCommand,
  TicketStatsCommand,
  MySLACommand,
  TicketReportTemplateCommand,
} from './command/ticket-commands';
import {
  MonitorAddCommand,
  MonitorListCommand,
  MonitorRemoveCommand,
  MonitorStatusCommand,
  MonitorPauseCommand,
  MonitorResumeCommand,
} from './command/uptime-commands';
import { HandoverCommand, HandoverAckCommand, ShiftInfoCommand } from './command/handover-commands';

import { RedisRateLimiter } from './rate-limiter';
import { AIService } from './ai';
import { UserService } from './user';
import { SessionService } from './session';
import {
  ShortTermMemory,
  LongTermMemory,
  SemanticMemory,
  ISemanticMemory,
  NoOpSemanticMemory,
  MemoryExtractor,
  RuleBasedExtractor,
  ContextBuilder,
  MemoryManager,
} from './memory';
import { AnalyticsService } from './analytics';
import { ModerationService } from './moderation';
import { FlowEngine } from './flow';
import { EventBus } from './events';
import { I18n } from './i18n';
import { Scheduler, createMaintenanceTasks } from './scheduler';
import { GoogleSheetsService } from './sheets';
import { TaskManagerService } from './task-manager';
import { ChecklistService } from './checklist';
import { DocumentationService } from './documentation';
import { DevOpsService } from './devops';
import { KnowledgeBaseService } from './knowledge';
import { ReportingService } from './reporting';
import { ReminderService } from './reminders';
import { IntentDetector } from './intent';
import { AIExtractor } from './extractor';
import { ChatPipeline } from './pipeline';
import { TicketService } from './ticket';
import { SLAService } from './sla';
import { TicketClusteringService } from './clustering';
import { UptimeMonitorService } from './uptime-monitor';
import { ShiftHandoverService } from './shift-handover';
import { MaintenanceScheduleService } from './maintenance-schedule';
import { DataExtractionService } from './data-extraction';
import { LiveChatService } from './live-chat';

// ─── Types ────────────────────────────────────────────────────

export interface BotInfrastructure {
  db: PrismaClient;
  redis: RedisClientType;
  logger: ILogger;
  config: ReturnType<typeof getConfig>;
  botsConfig: ReturnType<typeof getBotsConfig>;
  redisConfig: ReturnType<typeof getRedisConfig>;
  portConfig: ReturnType<typeof getPortConfig>;
  ports: ReturnType<typeof getPortRegistry>;
}

export interface BotServices {
  userService: UserService;
  sessionService: SessionService;
  aiService: AIService;
  rateLimiter: RedisRateLimiter;
  registry: CommandRegistry;
  executor: CommandExecutor;
  analytics: AnalyticsService;
  moderation: ModerationService;
  flowEngine: FlowEngine;
  eventBus: EventBus;
  i18n: I18n;
  sheetsService: GoogleSheetsService | null;
  taskManager: TaskManagerService;
  checklistService: ChecklistService;
  documentationService: DocumentationService;
  devopsService: DevOpsService;
  knowledgeBase: KnowledgeBaseService;
  reportingService: ReportingService;
  reminderService: ReminderService;
  intentDetector: IntentDetector;
  aiExtractor: AIExtractor;
  chatPipeline: ChatPipeline;
  ticketService: TicketService;
  slaService: SLAService;
  uptimeMonitorService: UptimeMonitorService;
  shiftHandoverService: ShiftHandoverService;
  maintenanceScheduleService: MaintenanceScheduleService;
  liveChatService: LiveChatService;
  dataExtractionService: DataExtractionService;
  scheduler: Scheduler;
}

export interface CreateServicesOptions {
  /** Pass true for WhatsApp to only sync ticket data to Google Sheets */
  sheetsTicketsOnly?: boolean;
}

// ─── Infrastructure ───────────────────────────────────────────

export async function initInfrastructure(botName: string): Promise<BotInfrastructure> {
  const logger = createLogger(botName, 'debug');
  logger.info(`Starting ${botName}...`);

  const config = getConfig();
  const botsConfig = getBotsConfig();
  const redisConfig = getRedisConfig();
  const portConfig = getPortConfig();
  const ports = getPortRegistry();

  // Database
  const db = new PrismaClient();
  await db.$connect();
  logger.info('Database connected');

  // Redis
  const redis = createClient({
    url: redisConfig.url,
    password: redisConfig.password,
    socket: { reconnectStrategy: (retries: number) => Math.min(retries * 50, 500) },
  }) as RedisClientType;
  await redis.connect();
  logger.info('Redis connected');

  return { db, redis, logger, config, botsConfig, redisConfig, portConfig, ports };
}

// ─── Services ─────────────────────────────────────────────────

export async function createBotServices(
  infra: BotInfrastructure,
  options: CreateServicesOptions = {},
): Promise<BotServices> {
  const { db, redis, config, logger } = infra;

  // Core services
  const userService = new UserService(db, redis, logger);
  const sessionService = new SessionService(db, redis, logger);

  // AI service
  const aiService = new AIService(
    {
      provider: config.AI_PROVIDER as any,
      openai: config.OPENAI_API_KEY
        ? { apiKey: config.OPENAI_API_KEY, model: config.OPENAI_MODEL, temperature: config.OPENAI_TEMPERATURE }
        : undefined,
    },
    redis,
    logger,
  );

  // Memory system
  let semantic: ISemanticMemory = new NoOpSemanticMemory();
  if (config.MEMORY_ENABLED === 'true') {
    const shortTerm = new ShortTermMemory(redis, logger, config.MEMORY_SHORT_TERM_MAX, config.MEMORY_SHORT_TERM_TTL);
    const longTerm = new LongTermMemory(db, logger);

    semantic =
      config.MEMORY_SEMANTIC_ENABLED === 'true' && config.OPENAI_API_KEY
        ? new SemanticMemory(
            db,
            { openaiApiKey: config.OPENAI_API_KEY, embeddingModel: config.OPENAI_EMBEDDING_MODEL },
            logger,
          )
        : new NoOpSemanticMemory();

    const extractor =
      config.MEMORY_EXTRACTOR_MODE === 'ai' && config.OPENAI_API_KEY
        ? new MemoryExtractor(config.OPENAI_API_KEY, logger, config.OPENAI_MODEL)
        : new RuleBasedExtractor();

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
    logger,
  );

  // Command registry + base commands
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

  // Google Sheets
  let sheetsService: GoogleSheetsService | null = null;
  if (config.GOOGLE_SHEETS_ENABLED === 'true' && config.GOOGLE_SHEETS_CREDENTIALS) {
    if (!config.GOOGLE_SHEETS_SPREADSHEET_ID) {
      logger.warn('Google Sheets is enabled but GOOGLE_SHEETS_SPREADSHEET_ID is missing; sheet sync will be disabled');
    } else {
      logger.info('Initializing Google Sheets service...', { spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID });
    }
    const sheetsOpts: Record<string, any> = {
      credentials: config.GOOGLE_SHEETS_CREDENTIALS,
      spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID,
    };
    if (options.sheetsTicketsOnly) {
      sheetsOpts.ticketsOnly = true;
    }
    sheetsService = new GoogleSheetsService(sheetsOpts as any, logger);
    if (sheetsService.isAvailable()) {
      sheetsService.initializeSheets().catch((err) => logger.error('Sheets init failed', err));
      logger.info('Google Sheets integration enabled');
    } else if (config.GOOGLE_SHEETS_ENABLED === 'true') {
      throw new Error('Google Sheets is enabled but the service is not available; check credentials and spreadsheet ID');
    }
  }

  // Productivity services
  const taskManager = new TaskManagerService(db, sheetsService, logger);
  const checklistService = new ChecklistService(db, sheetsService, logger);
  checklistService.seedDefaults().catch(() => {});
  const documentationService = new DocumentationService(db, sheetsService, logger);
  const devopsService = new DevOpsService(db, sheetsService, logger);
  const knowledgeBase = new KnowledgeBaseService(db, semantic, logger);
  const reportingService = new ReportingService(db, sheetsService, logger);
  const reminderService = new ReminderService(db, redis, logger);
  const dataExtractionService = new DataExtractionService(db, logger);
  
  // Ticket & SLA (Need to move these up so they can be passed to IntentDetector)
  const clusteringService = new TicketClusteringService(db, logger, {
    windowMinutes: parseInt(process.env.CLUSTERING_WINDOW_MIN ?? '60', 10),
    similarityThreshold: parseFloat(process.env.CLUSTERING_SIMILARITY_THRESHOLD ?? '0.75'),
    minClusterSize: parseInt(process.env.CLUSTERING_MIN_SIZE ?? '2', 10),
  });
  const ticketService = new TicketService(db, redis, logger, clusteringService, sheetsService);
  const slaService = new SLAService(db, redis, logger);

  const intentDetector = new IntentDetector(
    taskManager, 
    documentationService, 
    reminderService, 
    knowledgeBase, 
    dataExtractionService,
    ticketService,
    slaService,
    logger
  );

  // AI Extractor & Chat Pipeline
  const aiExtractor = new AIExtractor(aiService.getProvider(), logger);
  const chatPipeline = new ChatPipeline(db, aiExtractor, sheetsService, logger);

  // Uptime & Shift Handover
  const uptimeMonitorService = new UptimeMonitorService(db, redis, logger);
  const shiftHandoverService = new ShiftHandoverService(db, redis, logger);

  // Maintenance Schedule (Preventive Maintenance)
  const maintenanceScheduleService = new MaintenanceScheduleService(db, redis, logger, sheetsService);

  // Scheduler
  const scheduler = new Scheduler(db, redis, logger);

  // Live Chat WebSocket Bridge (Phase 2)
  const liveChatService = new LiveChatService(eventBus, logger, infra.ports.getPort('terminal') ?? 4005);

  // ── Register common commands ───────────────────────────────

  // Productivity
  registry.register(new TasksCommand(logger, taskManager));
  registry.register(new DoneCommand(logger, taskManager));
  registry.register(new AddTaskCommand(logger, taskManager));
  registry.register(new ChecklistCommand(logger, checklistService));
  registry.register(new CheckDoneCommand(logger, checklistService));

  // DevOps
  registry.register(new ServerStatusCommand(logger, devopsService));
  registry.register(new DockerCommand(logger, devopsService));
  registry.register(new LogsCommand(logger, devopsService));
  registry.register(new HealthCheckCommand(logger, devopsService));
  registry.register(new SoloHealthCommand(logger, devopsService));

  // Reminders
  registry.register(new RemindCommand(logger, reminderService));
  registry.register(new RemindersListCommand(logger, reminderService));

  // Knowledge Base
  registry.register(new KBSearchCommand(logger, knowledgeBase));
  registry.register(new KBTopicsCommand(logger, knowledgeBase));

  // Reporting
  registry.register(new ReportCommand(logger, reportingService));
  registry.register(new IncidentsCommand(logger, db));

  // Uptime Monitor
  registry.register(new MonitorAddCommand(logger, uptimeMonitorService));
  registry.register(new MonitorListCommand(logger, uptimeMonitorService));
  registry.register(new MonitorRemoveCommand(logger, uptimeMonitorService));
  registry.register(new MonitorStatusCommand(logger, uptimeMonitorService));
  registry.register(new MonitorPauseCommand(logger, uptimeMonitorService));
  registry.register(new MonitorResumeCommand(logger, uptimeMonitorService));

  // Shift Handover
  registry.register(new HandoverCommand(logger, shiftHandoverService));
  registry.register(new HandoverAckCommand(logger, shiftHandoverService));
  registry.register(new ShiftInfoCommand(logger, shiftHandoverService));

  return {
    userService, sessionService, aiService, rateLimiter, registry, executor,
    analytics, moderation, flowEngine, eventBus, i18n, sheetsService,
    taskManager, checklistService, documentationService, devopsService,
    knowledgeBase, reportingService, reminderService, intentDetector,
    aiExtractor, chatPipeline, ticketService, slaService,
    uptimeMonitorService, shiftHandoverService, maintenanceScheduleService, 
    liveChatService, dataExtractionService, scheduler,
  };
}

// ─── Ticket Command Registration ──────────────────────────────

export interface TicketBroadcasts {
  onNewTicket: (params: any) => Promise<void>;
  onTicketPicked: (params: any) => Promise<void>;
  onTicketResolved: (params: any) => Promise<void>;
}

export function registerTicketCommands(
  services: BotServices,
  logger: ILogger,
  broadcasts: TicketBroadcasts,
): void {
  const { registry, ticketService, slaService, sheetsService } = services;

  registry.register(new TicketCreateCommand(logger, ticketService, slaService, sheetsService, broadcasts.onNewTicket));
  registry.register(new TicketStatusCommand(logger, ticketService));
  registry.register(new TicketListCommand(logger, ticketService));
  registry.register(new TicketAssignCommand(logger, ticketService, slaService, sheetsService));
  registry.register(new TicketPickCommand(logger, ticketService, slaService, sheetsService, broadcasts.onTicketPicked));
  registry.register(new TicketResolveCommand(logger, ticketService, slaService, sheetsService, broadcasts.onTicketResolved));
  registry.register(new TicketCloseCommand(logger, ticketService, sheetsService));
  registry.register(new TicketSyncCommand(logger, ticketService, async (ticket) => {
    await broadcasts.onNewTicket(ticket);
    return true;
  }));
  registry.register(new TicketStatsCommand(logger, ticketService, slaService));
  registry.register(new MySLACommand(logger, ticketService));
  registry.register(new TicketReportTemplateCommand(logger));
}

// ─── Maintenance Scheduler ────────────────────────────────────

export function setupMaintenanceScheduler(services: BotServices, infra: BotInfrastructure, onMaintenanceAlert?: (msgs: string[]) => Promise<void>): void {
  const { scheduler, analytics, flowEngine, maintenanceScheduleService, ticketService, slaService, sheetsService } = services;
  const { db, redis, logger } = infra;

  const tasks = createMaintenanceTasks({
    db,
    redis,
    logger,
    analyticsFlush: () => analytics.flushToDatabase(),
    flowCleaner: () => flowEngine.cleanExpired().then(() => {}),
  });

  for (const task of tasks) {
    scheduler.register(task);
  }

  // Daily preventive maintenance check (every 24 hours)
  scheduler.register({
    name: 'pm-schedule-check',
    intervalMs: 24 * 60 * 60 * 1000,
    lockTtlMs: 60 * 60 * 1000,
    runOnStart: true,
    handler: async () => {
      await maintenanceScheduleService.syncAllToSheets().catch(err => {
        logger.error('Failed to sync all schedules on routine check', err);
      });

      const { dueTickets, reminders, quarterlyReminders, syncedCompleted } = await maintenanceScheduleService.checkDue(
        async (opts) => {
          const ticket = await ticketService.create(opts);
          if (ticket && slaService) {
            await slaService.startTracking(ticket.id, opts.priority as any, opts.category as any, opts.problem).catch(() => {});
          }
          if (ticket && sheetsService?.isAvailable()) {
            await sheetsService.syncTicket(ticket as any).catch(() => {});
          }
          return { ticketNumber: ticket.ticketNumber, id: ticket.id };
        },
      );

      if (syncedCompleted > 0) {
        logger.info(`Maintenance completion synced: ${syncedCompleted}`);
      }

      const msgs = [...dueTickets, ...reminders, ...quarterlyReminders];
      for (const msg of msgs) {
        logger.info(msg);
      }
      if (msgs.length > 0 && onMaintenanceAlert) {
        await onMaintenanceAlert(msgs).catch((err) => logger.error('Maintenance alert callback failed', err));
      }
    },
  });
  
  // Ticket self-repair sync (every 1 hour)
  scheduler.register({
    name: 'ticket-auto-sync',
    intervalMs: 1 * 60 * 60 * 1000, 
    lockTtlMs: 30 * 60 * 1000,
    runOnStart: false,
    handler: async () => {
      logger.info('Running automated ticket sync recovery...');
      try {
        const result = await ticketService.syncStuckTickets(
          onMaintenanceAlert ? async (ticket) => {
            // Re-trigger alert as generic notify
            await onMaintenanceAlert([`[RECOVERY] New ticket: ${ticket.ticketNumber} - ${ticket.title}`]);
            return true;
          } : undefined
        );
        if (result.fixedGSheet > 0 || result.fixedTelegram > 0) {
          logger.info('Automated ticket sync completed', result);
        }
      } catch (err) {
        logger.error('Automated ticket sync failed', err as Error);
      }
    },
  });
}
