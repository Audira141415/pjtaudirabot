import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import http from 'node:http';
import {
  initInfrastructure,
  createBotServices,
  registerTicketCommands,
  setupMaintenanceScheduler,
  TelegramNotifier,
} from '@pjtaudirabot/services';
import { TelegramConnection } from './bot';
import { TelegramMessageHandler } from './message-handler';

async function main(): Promise<void> {
  const infra = await initInfrastructure('telegram-bot');
  const { logger, botsConfig, portConfig, ports, db, redis } = infra;

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

  // ── Shared services (AI, memory, commands, scheduler, etc.) ──
  const services = await createBotServices(infra);
  const {
    registry, executor, userService, sessionService,
    analytics, moderation, flowEngine, eventBus, i18n,
    intentDetector, chatPipeline, slaService,
    uptimeMonitorService, shiftHandoverService,
    scheduler, reminderService,
  } = services;

  // ── Telegram Notifier ──
  const nocChatId = botsConfig.telegram.nocChatId ?? '';
  const telegramNotifier = new TelegramNotifier(
    botsConfig.telegram.botToken,
    nocChatId,
    logger,
  );

  let broadcastTicketPicked: ((params: any) => Promise<void>) | null = null;
  let broadcastTicketResolved: ((params: any) => Promise<void>) | null = null;
  let broadcastNewTicket: ((params: any) => Promise<void>) | null = null;

  if (telegramNotifier.isConfigured()) {
    broadcastTicketPicked = (params) => telegramNotifier.sendTicketPicked(params);
    broadcastTicketResolved = (params) => telegramNotifier.sendTicketResolved(params);
    broadcastNewTicket = (params) => telegramNotifier.sendNewTicket(params);
    logger.info('Telegram ticket broadcast configured for NOC group');
  }

  // ── Ticket commands ──
  registerTicketCommands(services, logger, {
    onNewTicket: (params) => broadcastNewTicket?.(params) ?? Promise.resolve(),
    onTicketPicked: (params) => broadcastTicketPicked?.(params) ?? Promise.resolve(),
    onTicketResolved: (params) => broadcastTicketResolved?.(params) ?? Promise.resolve(),
  });

  logger.info(`Telegram bot: ${registry.getAll().length} commands registered`);

  // ── Scheduler ──
  setupMaintenanceScheduler(services, infra);

  // ── Telegram bot connection ──
  const connection = new TelegramConnection(
    {
      token: botsConfig.telegram.botToken,
      webhookUrl: botsConfig.telegram.webhookUrl,
    },
    logger,
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

  // Uptime monitoring — every 60 seconds
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

  // SLA countdown warnings — every 2 minutes
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

  // Shift handover auto-push — every 5 minutes
  setInterval(async () => {
    try {
      if (!shiftHandoverService.isHandoverTime()) return;
      if (!telegramNotifier.isConfigured()) return;
      const currentShift = shiftHandoverService.getCurrentShift();
      const dedupeKey = `handover:auto:${currentShift.label}:${new Date().toDateString()}`;
      const locked = await redis.set(dedupeKey, '1', { NX: true, EX: 3600 });
      if (!locked) return;
      const handover = await shiftHandoverService.generateHandover();
      telegramNotifier.sendReportText(handover.formattedText).catch((err) => logger.error('Handover auto-push failed', err as Error));
      logger.info('Handover auto-push sent', { shift: currentShift.label });
    } catch (err) {
      logger.error('Handover auto-push error', err as Error);
    }
  }, 5 * 60_000);

  // ── Health-check HTTP server ──
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
