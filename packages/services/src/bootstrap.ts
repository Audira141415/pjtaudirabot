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
  TicketStatsCommand,
  MySLACommand,
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
import { UptimeMonitorService } from './uptime-monitor';
import { ShiftHandoverService } from './shift-handover';

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
  if (config.MEMORY_ENABLED === 'true') {
    const shortTerm = new ShortTermMemory(redis, logger, config.MEMORY_SHORT_TERM_MAX, config.MEMORY_SHORT_TERM_TTL);
    const longTerm = new LongTermMemory(db, logger);

    const semantic =
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
    const sheetsOpts: Record<string, any> = {
      credentials: config.GOOGLE_SHEETS_CREDENTIALS,
      spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID,
    };
    if (options.sheetsTicketsOnly) {
      sheetsOpts.ticketsOnly = true;
    }
    sheetsService = new GoogleSheetsService(sheetsOpts, logger);
    if (sheetsService.isAvailable()) {
      sheetsService.initializeSheets().catch((err) => logger.error('Sheets init failed', err));
      logger.info('Google Sheets integration enabled');
    }
  }

  // Productivity services
  const taskManager = new TaskManagerService(db, sheetsService, logger);
  const checklistService = new ChecklistService(db, sheetsService, logger);
  checklistService.seedDefaults().catch(() => {});
  const documentationService = new DocumentationService(db, sheetsService, logger);
  const devopsService = new DevOpsService(db, sheetsService, logger);
  const knowledgeBase = new KnowledgeBaseService(db, logger);
  const reportingService = new ReportingService(db, sheetsService, logger);
  const reminderService = new ReminderService(db, redis, logger);
  const intentDetector = new IntentDetector(taskManager, documentationService, reminderService, knowledgeBase, logger);

  // AI Extractor & Chat Pipeline
  const aiExtractor = new AIExtractor(aiService.getProvider(), logger);
  const chatPipeline = new ChatPipeline(db, aiExtractor, sheetsService, logger);

  // Ticket & SLA
  const ticketService = new TicketService(db, redis, logger);
  const slaService = new SLAService(db, redis, logger);

  // Uptime & Shift Handover
  const uptimeMonitorService = new UptimeMonitorService(db, redis, logger);
  const shiftHandoverService = new ShiftHandoverService(db, redis, logger);

  // Scheduler
  const scheduler = new Scheduler(db, redis, logger);

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
    uptimeMonitorService, shiftHandoverService, scheduler,
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
  registry.register(new TicketStatsCommand(logger, ticketService, slaService));
  registry.register(new MySLACommand(logger, ticketService));
}

// ─── Maintenance Scheduler ────────────────────────────────────

export function setupMaintenanceScheduler(services: BotServices, infra: BotInfrastructure): void {
  const { scheduler, analytics, flowEngine } = services;
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
}
