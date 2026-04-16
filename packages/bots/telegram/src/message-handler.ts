import { Context } from 'telegraf';
import { ILogger, CommandContext } from '@pjtaudirabot/core';
import {
  CommandExecutor, UserService, SessionService,
  ModerationService, AnalyticsService, FlowEngine, EventBus, I18n,
} from '@pjtaudirabot/services';
import { IntentDetector, ChatPipeline } from '@pjtaudirabot/services';

const COMMAND_PREFIX = '!';

export interface TelegramHandlerDeps {
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
}

export class TelegramMessageHandler {
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

  constructor(deps: TelegramHandlerDeps) {
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
  }

  private async emitReply(ctx: Context, text: string, options?: any): Promise<void> {
    const chatId = String(ctx.chat?.id);
    
    await ctx.reply(text, options);
    
    this.eventBus?.emit('message.sent', {
      platform: 'telegram',
      userId: chatId,
      text,
      timestamp: Date.now(),
    }).catch(() => {});
  }

  async handle(ctx: Context): Promise<void> {
    const startTime = Date.now();
    const message = ctx.message;
    if (!message) return;

    const from = message.from;
    if (!from) return;

    const platformUserId = String(from.id);
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Unknown';

    // Extract text from regular message or photo caption
    let text = ('text' in message) ? message.text : (('caption' in message) ? (message as any).caption : '');
    
    // Check for photo and get link for Vision analysis
    let imageUrl: string | undefined;
    if ('photo' in message) {
      const photos = (message as any).photo;
      if (photos && photos.length > 0) {
        const largestPhoto = photos[photos.length - 1];
        const link = await ctx.telegram.getFileLink(largestPhoto.file_id);
        imageUrl = link.href;
      }
    }

    if (!text && !imageUrl) return;
    if (!text) text = ''; // Allow empty text if image is present

    // Normalize Telegram slash commands → ! prefix
    if (text.startsWith('/')) {
      const [cmdAndMention, ...rest] = text.slice(1).split(' ');
      const cmd = cmdAndMention.split('@')[0].replace(/_/g, '-');
      text = COMMAND_PREFIX + cmd + (rest.length ? ' ' + rest.join(' ') : '');
    }

    this.logger.debug('Telegram message received', { platformUserId, text, hasImage: !!imageUrl });

    // Broadcast to Live Chat Bridge (Phase 2)
    this.eventBus?.emit('message.received', {
      platform: 'telegram',
      userId: platformUserId,
      userName: displayName,
      text,
      timestamp: Date.now(),
      imageUrl: imageUrl
    }).catch(() => {});

    // Track message analytics
    this.analytics?.track({ eventType: 'message_received', platform: 'telegram', userId: platformUserId }).catch(() => {});

    try {
      const user = await this.userService.findOrCreate(
        'telegram',
        platformUserId,
        displayName,
        { username: from.username }
      );

      // Moderation check
      if (this.moderation) {
        const modResult = await this.moderation.check(user.id, text, 'telegram');
        if (!modResult.allowed) {
          const msg = modResult.message ?? this.i18n?.t('mod_blocked') ?? '⚠️ Message blocked by moderation.';
          await this.emitReply(ctx, msg);
          this.eventBus?.emit('moderation.action', {
            userId: user.id, platform: 'telegram', action: modResult.action, rule: modResult.ruleName,
          }).catch(() => {});
          return;
        }
      }

      // Check active flow
      if (this.flowEngine && await this.flowEngine.hasActiveFlow(user.id, 'telegram')) {
        if (text === '!cancel') {
          await this.flowEngine.cancel(user.id, 'telegram');
          await ctx.reply(this.i18n?.t('flow_cancelled') ?? '❌ Flow cancelled.');
          return;
        }

        const flowResult = await this.flowEngine.processInput(user.id, 'telegram', text);
        if (flowResult.error) {
          await ctx.reply(`⚠️ ${flowResult.error}`);
          return;
        }
        if (flowResult.completed) {
          await this.emitReply(ctx, this.i18n?.t('flow_completed') ?? '✅ Flow completed!');
          this.eventBus?.emit('flow.completed', {
            userId: user.id, platform: 'telegram', data: flowResult.data,
          }).catch(() => {});
        } else if (flowResult.prompt) {
          await this.emitReply(ctx, flowResult.prompt);
        }
        return;
      }

      // Process non-command messages through the chat-to-data pipeline
      if (!text.startsWith(COMMAND_PREFIX)) {
        if (this.chatPipeline) {
          try {
            const pipelineResult = await this.chatPipeline.process(
              user.id, text, 'telegram', displayName, imageUrl
            );
            await this.emitReply(ctx, pipelineResult.reply, { parse_mode: 'Markdown' });
            this.eventBus?.emit('pipeline.processed', {
              userId: user.id, platform: 'telegram',
              type: pipelineResult.extraction.result.type,
              confidence: pipelineResult.extraction.confidence,
            }).catch(() => {});
          } catch (pipelineErr) {
            this.logger.error('Pipeline processing failed', pipelineErr as Error);
            await ctx.reply('⚠️ Gagal memproses pesan. Coba lagi nanti.');
          }
        } else if (this.intentDetector) {
          // Legacy fallback
          const intentResponse = await this.intentDetector.process(user.id, text, 'telegram');
          if (intentResponse) {
            await this.emitReply(ctx, intentResponse, { parse_mode: 'Markdown' });
            this.eventBus?.emit('intent.detected', {
              userId: user.id, platform: 'telegram', text,
            }).catch(() => {});
          }
        }
        return;
      }

      // Track command analytics
      const commandName = text.split(' ')[0].slice(COMMAND_PREFIX.length);
      this.analytics?.track({ eventType: 'command_executed', platform: 'telegram', userId: platformUserId, metadata: { commandName } }).catch(() => {});

      const session = await this.sessionService.getOrCreate(user.id, 'telegram');

      const context: CommandContext = {
        user,
        session: {
          id: session.id,
          userId: session.userId,
          botPlatform: 'telegram',
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
        platform: 'telegram',
        messageId: String(message.message_id),
        groupId: message.chat.type !== 'private' ? String(message.chat.id) : undefined,
      };

      (context as any).userId = user.id;

      const result = await this.commandExecutor.execute(context);

      // Track response time
      const responseTime = Date.now() - startTime;
      this.analytics?.track({ eventType: 'response_sent', platform: 'telegram', userId: platformUserId, value: responseTime }).catch(() => {});

      try {
        await this.emitReply(ctx, result.message, { parse_mode: 'Markdown' });
      } catch {
        // Markdown parse failed (e.g. special chars in ticket data) — retry as plain text
        const plain = result.message.replace(/[*_`]/g, '');
        await this.emitReply(ctx, plain);
      }

      this.eventBus?.emit('command.executed', {
        userId: user.id, platform: 'telegram', command: commandName, responseTime,
      }).catch(() => {});

    } catch (error) {
      this.logger.error('Telegram handler error', error as Error);
      this.analytics?.track({ eventType: 'error', platform: 'telegram', userId: platformUserId }).catch(() => {});
      await ctx.reply(this.i18n?.t('error_generic') ?? '❌ An error occurred. Please try again.');
    }
  }
}
