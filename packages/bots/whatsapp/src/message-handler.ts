import { proto } from '@whiskeysockets/baileys';
import { ILogger, CommandContext } from '@pjtaudirabot/core';
import {
  CommandExecutor, UserService, SessionService,
  ModerationService, AnalyticsService, FlowEngine, EventBus, I18n,
  DataExtractionService, TicketService, SLAService,
  GoogleSheetsService, NewTicketBroadcast,
} from '@pjtaudirabot/services';
import { WhatsAppConnection } from './connection';
import { IntentDetector, ChatPipeline } from '@pjtaudirabot/services';

const COMMAND_PREFIX = '!';
const NOC_AUTO_EXTRACT_MIN_FIELDS = 3;
const FORCE_DM_GROUP_JIDS_DEFAULT: string[] = [];
const FORCE_DM_LOG_COOLDOWN_MS = 5 * 60 * 1000;

export interface WhatsAppHandlerDeps {
  connection: WhatsAppConnection;
  commandExecutor: CommandExecutor;
  userService: UserService;
  sessionService: SessionService;
  logger: ILogger;
  moderation?: ModerationService;
  analytics?: AnalyticsService;
  flowEngine?: FlowEngine;
  eventBus?: EventBus;
  i18n?: I18n;
  intentDetector?: IntentDetector;
  chatPipeline?: ChatPipeline;
  // Auto-extract NOC deps
  dataExtractionService?: DataExtractionService;
  ticketService?: TicketService;
  slaService?: SLAService;
  nocAutoExtract?: boolean;
  sheetsService?: GoogleSheetsService | null;
  /** Broadcast new ticket to admin groups — set by bot index after notifier is ready */
  onTicketCreated?: (params: NewTicketBroadcast) => Promise<void>;
}

export class WhatsAppMessageHandler {
  private connection: WhatsAppConnection;
  private commandExecutor: CommandExecutor;
  private userService: UserService;
  private sessionService: SessionService;
  private logger: ILogger;
  private moderation?: ModerationService;
  private analytics?: AnalyticsService;
  private flowEngine?: FlowEngine;
  private eventBus?: EventBus;
  private i18n?: I18n;
  private intentDetector?: IntentDetector;
  private chatPipeline?: ChatPipeline;
  private dataExtractionService?: DataExtractionService;
  private ticketService?: TicketService;
  private slaService?: SLAService;
  private nocAutoExtract: boolean;
  private sheetsService?: GoogleSheetsService | null;
  private forceDmGroupJids: Set<string>;
  private forceDmLogTimestamps = new Map<string, number>();
  onTicketCreated?: (params: NewTicketBroadcast) => Promise<void>;

  constructor(deps: WhatsAppHandlerDeps) {
    this.connection = deps.connection;
    this.commandExecutor = deps.commandExecutor;
    this.userService = deps.userService;
    this.sessionService = deps.sessionService;
    this.logger = deps.logger;
    this.moderation = deps.moderation;
    this.analytics = deps.analytics;
    this.flowEngine = deps.flowEngine;
    this.eventBus = deps.eventBus;
    this.i18n = deps.i18n;
    this.intentDetector = deps.intentDetector;
    this.chatPipeline = deps.chatPipeline;
    this.dataExtractionService = deps.dataExtractionService;
    this.ticketService = deps.ticketService;
    this.slaService = deps.slaService;
    this.nocAutoExtract = deps.nocAutoExtract ?? false;
    this.sheetsService = deps.sheetsService;
    this.onTicketCreated = deps.onTicketCreated;

    const configuredForceDmJids = (process.env.WHATSAPP_FORCE_DM_GROUP_JIDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.endsWith('@g.us'));
    this.forceDmGroupJids = new Set([...FORCE_DM_GROUP_JIDS_DEFAULT, ...configuredForceDmJids]);
  }

  private async sendReply(
    jid: string,
    senderJid: string,
    text: string,
    quotedMessage?: proto.IWebMessageInfo,
  ): Promise<void> {
    try {
      const isGroup = jid.endsWith('@g.us');
      const shouldForceDm =
        isGroup
        && senderJid !== jid
        && (this.forceDmGroupJids.size === 0 || this.forceDmGroupJids.has(jid));
      if (shouldForceDm) {
        const lastLogAt = this.forceDmLogTimestamps.get(jid) ?? 0;
        if (Date.now() - lastLogAt >= FORCE_DM_LOG_COOLDOWN_MS) {
          this.forceDmLogTimestamps.set(jid, Date.now());
          this.logger.warn('Group reply redirected to DM', { jid, senderJid });
        }

        const dmSent = await this.connection.sendMessage(
          senderJid,
          `⚠️ Balasan ke grup ini dialihkan ke chat pribadi untuk stabilitas.\n\n${text}`,
        );
        if (!dmSent) {
          this.logger.error('Forced DM reply failed', {
            jid,
            senderJid,
          } as any);
        }
        return;
      }

      const quoteForGroupReply = this.getQuotedForTargetJid(jid, quotedMessage);
      const sent = await this.connection.sendMessage(jid, text, { quoted: quoteForGroupReply });
      if (sent || !jid.endsWith('@g.us') || senderJid === jid) return;

      this.logger.warn('Group reply failed, falling back to direct message', { jid, senderJid });
      await this.connection.sendMessage(
        senderJid,
        `⚠️ Gagal kirim ke grup, saya kirim via chat pribadi.\n\n${text}`,
      );
    } catch (error) {
      this.logger.error('Reply dispatch failed', error as Error);
    }
  }

  private getQuotedForTargetJid(
    targetJid: string,
    quotedMessage?: proto.IWebMessageInfo,
  ): proto.IWebMessageInfo | undefined {
    const quotedJid = quotedMessage?.key?.remoteJid;
    if (!quotedJid || quotedJid !== targetJid) {
      return undefined;
    }
    return quotedMessage;
  }

  private async sendAutoExtractAck(
    jid: string,
    senderJid: string,
    ticketNumber: string,
    priority: string,
    category: string,
  ): Promise<void> {
    const ackMessage = [
      `✅ *Ticket Created*`,
      `📋 ${ticketNumber}`,
      `🎯 Priority: ${priority}`,
      `📂 Category: ${category}`,
      `📨 Detail teknis dikirim ke Telegram NOC.`,
    ].join('\n');

    if (jid.endsWith('@g.us') && senderJid !== jid) {
      try {
        await this.connection.sendMessage(senderJid, ackMessage);
      } catch (error) {
        this.logger.error('Auto-extract DM acknowledgement failed', error as Error);
      }
      return;
    }

    await this.sendReply(jid, senderJid, ackMessage);
  }

  async handle(msg: proto.IWebMessageInfo): Promise<void> {
    const startTime = Date.now();
    const text = this.extractText(msg);
    if (!text) return;

    const jid = msg.key.remoteJid;
    if (!jid) return;

    // For groups, the sender is msg.key.participant; for DMs, it's the JID itself
    const isGroup = jid.endsWith('@g.us');
    const senderJid = isGroup ? (msg.key.participant ?? jid) : jid;
    const platformUserId = senderJid.replace(/@s\.whatsapp\.net$/, '');
    const pushName = msg.pushName ?? 'Unknown';

    this.logger.debug('WhatsApp message received', { platformUserId, text });

    // Track message analytics
    this.analytics?.track({ eventType: 'message_received', platform: 'whatsapp', userId: platformUserId }).catch(() => {});

    try {
      const user = await this.userService.findOrCreate(
        'whatsapp',
        platformUserId,
        pushName,
        { phoneNumber: platformUserId }
      );

      // Auto-promote first user to admin if no admin exists
      if (user.role === 'user') {
        const hasAdmin = await this.userService.hasAdmin();
        if (!hasAdmin) {
          await this.userService.setRole(user.id, 'admin');
          user.role = 'admin' as any;
          this.logger.info('Auto-promoted first user to admin', { userId: user.id, platformUserId });
          await this.sendReply(jid, senderJid, '👑 Anda telah dipromosikan menjadi *admin* (user pertama otomatis admin).', msg);
        }
      }

      // Moderation check (applies to all messages)
      if (this.moderation) {
        const modResult = await this.moderation.check(user.id, text, 'whatsapp');
        if (!modResult.allowed) {
          const blockedMessage = modResult.message ?? this.i18n?.t('mod_blocked') ?? '⚠️ Message blocked by moderation.';
          await this.sendReply(jid, senderJid, blockedMessage, msg);
          this.eventBus?.emit('moderation.action', {
            userId: user.id, platform: 'whatsapp', action: modResult.action, rule: modResult.ruleName,
          }).catch(() => {});
          return;
        }
      }

      // Check active flow (intercept if user is in a wizard)
      if (this.flowEngine && await this.flowEngine.hasActiveFlow(user.id, 'whatsapp')) {
        if (text === '!cancel') {
          await this.flowEngine.cancel(user.id, 'whatsapp');
          await this.sendReply(jid, senderJid, this.i18n?.t('flow_cancelled') ?? '❌ Flow cancelled.', msg);
          return;
        }

        const flowResult = await this.flowEngine.processInput(user.id, 'whatsapp', text);
        if (flowResult.error) {
          await this.sendReply(jid, senderJid, `⚠️ ${flowResult.error}`, msg);
          return;
        }
        if (flowResult.completed) {
          await this.sendReply(jid, senderJid, this.i18n?.t('flow_completed') ?? '✅ Flow completed!', msg);
          this.eventBus?.emit('flow.completed', {
            userId: user.id, platform: 'whatsapp', data: flowResult.data,
          }).catch(() => {});
        } else if (flowResult.prompt) {
          await this.sendReply(jid, senderJid, flowResult.prompt, msg);
        }
        return;
      }

      // ── Auto-extract NOC messages before pipeline ──
      if (!text.startsWith(COMMAND_PREFIX) && this.nocAutoExtract && this.dataExtractionService && this.ticketService && this.slaService) {
        const extraction = this.dataExtractionService.extract(text);
        if (extraction.isValid && extraction.fieldCount >= NOC_AUTO_EXTRACT_MIN_FIELDS) {
          try {
            const dup = await this.dataExtractionService.checkDuplicate(extraction.data);
            if (dup.isDuplicate) {
              await this.sendReply(jid, senderJid,
                `⚠️ *Duplicate detected* (${Math.round(dup.similarity * 100)}% match)\nExisting ID: ${dup.duplicateId?.slice(0, 8)}`
              , msg);
              return;
            }

            // Map priority score to enum
            const priority = extraction.priorityScore >= 8 ? 'CRITICAL' as const
              : extraction.priorityScore >= 6 ? 'HIGH' as const
              : extraction.priorityScore >= 4 ? 'MEDIUM' as const
              : 'LOW' as const;

            const ticket = await this.ticketService.create({
              title: extraction.data.problem ?? `NOC Auto-Extract`,
              description: text,
              problem: extraction.data.problem ?? text.slice(0, 200),
              priority,
              category: extraction.category,
              createdById: user.id,
              customer: extraction.data.customer,
              location: extraction.data.location,
              ao: extraction.data.ao,
              sid: extraction.data.sid,
              service: extraction.data.service,
              vlanId: extraction.data.vlanId,
              hostnameSwitch: extraction.data.hostnameSwitch,
              port: extraction.data.port,
              ipAddress: extraction.data.ipAddress,
              gateway: extraction.data.gateway,
              subnet: extraction.data.subnet,
              mode: extraction.data.mode,
            });

            await this.slaService.startTracking(
              ticket.id, priority, extraction.category,
              extraction.data.problem ?? text.slice(0, 100),
            );

            const extractedFields = Object.entries(extraction.data)
              .filter(([, v]) => v)
              .map(([k, v]) => `  • ${k}: ${v}`)
              .join('\n');

            // Broadcast new ticket to admin groups (non-blocking)
            this.onTicketCreated?.({
              id: ticket.id,
              ticketNumber: ticket.ticketNumber,
              title: ticket.title,
              priority,
              category: extraction.category,
              problem: extraction.data.problem ?? text.slice(0, 200),
              createdByName: user.displayName ?? user.phoneNumber ?? 'Unknown',
              groupId: jid.includes('@g.us') ? jid : null,
              technicalDetails: extractedFields,
            }).catch(() => {});

            await this.dataExtractionService.save(extraction.data, text, {
              ticketId: ticket.id,
              extractedById: user.id,
              platform: 'whatsapp',
              groupId: jid.includes('@g.us') ? jid : undefined,
              category: extraction.category,
              priorityScore: extraction.priorityScore,
            });

            // Sync to Google Sheets with all NOC fields
            if (this.sheetsService?.isAvailable()) {
              this.sheetsService.syncTicket({
                id: ticket.id,
                ticketNumber: ticket.ticketNumber,
                customer: extraction.data.customer,
                location: extraction.data.location,
                ao: extraction.data.ao,
                sid: extraction.data.sid,
                service: extraction.data.service,
                vlanId: extraction.data.vlanId,
                vlanType: extraction.data.vlanType,
                vlanName: extraction.data.vlanName,
                hostnameSwitch: extraction.data.hostnameSwitch,
                port: extraction.data.port,
                ipAddress: extraction.data.ipAddress,
                gateway: extraction.data.gateway,
                subnet: extraction.data.subnet,
                mode: extraction.data.mode,
                problem: extraction.data.problem,
                priority,
                category: extraction.category,
                status: 'OPEN',
                createdBy: user.displayName,
                createdAt: new Date(),
              }).catch((err) => this.logger.error('GSheet syncTicket (auto-extract) failed', err as Error));
            }

            await this.sendAutoExtractAck(
              jid,
              senderJid,
              ticket.ticketNumber,
              `${priority} (score: ${extraction.priorityScore}/10)`,
              extraction.category,
            );

            this.eventBus?.emit('noc.auto_extracted', {
              userId: user.id, platform: 'whatsapp', ticketNumber: ticket.ticketNumber,
              fieldCount: extraction.fieldCount, priority,
            }).catch(() => {});

            return;
          } catch (err) {
            this.logger.error('Auto-extract failed', err as Error);
            // Fall through to normal pipeline
          }
        }
      }

      // Process non-command messages through the chat-to-data pipeline
      if (!text.startsWith(COMMAND_PREFIX)) {
        if (this.chatPipeline) {
          try {
            const pipelineResult = await this.chatPipeline.process(
              user.id, text, 'whatsapp', user.displayName
            );
            await this.sendReply(jid, senderJid, pipelineResult.reply, msg);
            this.eventBus?.emit('pipeline.processed', {
              userId: user.id, platform: 'whatsapp',
              type: pipelineResult.extraction.result.type,
              confidence: pipelineResult.extraction.confidence,
            }).catch(() => {});
          } catch (pipelineErr) {
            this.logger.error('Pipeline processing failed', pipelineErr as Error);
            await this.sendReply(jid, senderJid, '⚠️ Gagal memproses pesan. Coba lagi nanti.', msg);
          }
        } else if (this.intentDetector) {
          // Legacy fallback: rule-only intent detection
          const intentResponse = await this.intentDetector.process(user.id, text, 'whatsapp');
          if (intentResponse) {
            await this.sendReply(jid, senderJid, intentResponse, msg);
            this.eventBus?.emit('intent.detected', {
              userId: user.id, platform: 'whatsapp', text,
            }).catch(() => {});
          }
        }
        return;
      }

      // Track command analytics
      const commandName = text.split(' ')[0].slice(COMMAND_PREFIX.length);
      this.analytics?.track({ eventType: 'command_executed', platform: 'whatsapp', userId: platformUserId, metadata: { commandName } }).catch(() => {});

      const session = await this.sessionService.getOrCreate(user.id, 'whatsapp');

      const context: CommandContext = {
        user,
        session: {
          id: session.id,
          userId: session.userId,
          botPlatform: 'whatsapp',
          sessionToken: session.token,
          metadata: session.metadata as Record<string, any>,
          expiresAt: session.expiresAt,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        command: {
          id: '',
          name: '',
          description: '',
          category: '',
          handler: '',
          requiredRole: 'user',
          rateLimitConfig: { perMinute: 30, perHour: 300 },
          isEnabled: true,
          aiPowered: false,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        input: text,
        platform: 'whatsapp',
        messageId: msg.key.id ?? undefined,
        groupId: jid.includes('@g.us') ? jid : undefined,
      };

      (context as any).userId = user.id;

      const result = await this.commandExecutor.execute(context);

      // Track response time
      const responseTime = Date.now() - startTime;
      this.analytics?.track({ eventType: 'response_sent', platform: 'whatsapp', userId: platformUserId, value: responseTime }).catch(() => {});

      const replyMessage = result.message;
      await this.sendReply(jid, senderJid, replyMessage, msg);

      this.eventBus?.emit('command.executed', {
        userId: user.id, platform: 'whatsapp', command: commandName, responseTime,
      }).catch(() => {});

    } catch (error) {
      this.logger.error('WhatsApp handler error', error as Error);
      this.analytics?.track({ eventType: 'error', platform: 'whatsapp', userId: platformUserId }).catch(() => {});
      await this.sendReply(jid, senderJid, this.i18n?.t('error_generic') ?? '❌ An error occurred. Please try again.', msg);
    }
  }

  private extractText(msg: proto.IWebMessageInfo): string | null {
    const message = msg.message;
    if (!message) return null;

    return (
      message.conversation ??
      message.extendedTextMessage?.text ??
      message.imageMessage?.caption ??
      message.videoMessage?.caption ??
      null
    );
  }
}
