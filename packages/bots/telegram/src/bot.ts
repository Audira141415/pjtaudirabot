import { Telegraf, Context } from 'telegraf';
import { ILogger } from '@pjtaudirabot/core';
import { Agent } from 'node:https';

export interface TelegramBotConfig {
  token: string;
  webhookUrl?: string;
}

export class TelegramConnection {
  private bot: Telegraf;
  private onMessageCallback: ((ctx: Context) => Promise<void>) | null = null;

  constructor(
    private config: TelegramBotConfig,
    private logger: ILogger
  ) {
    // Force IPv4 for Telegram API requests to avoid issues with IPv6-enabled hosts
    // that don't have a reliable IPv6 route to the internet.
    const agent = new Agent({ family: 4, keepAlive: true });
    this.bot = new Telegraf(config.token, {
      telegram: { agent }
    });
  }

  onMessage(callback: (ctx: Context) => Promise<void>): void {
    this.onMessageCallback = callback;
  }

  async start(): Promise<void> {
    // Handle all message types with text (including slash commands / bot_command entities)
    this.bot.on('message', async (ctx) => {
      if (!('text' in ctx.message)) return; // skip non-text (photos, stickers, etc.)
      try {
        await this.onMessageCallback?.(ctx);
      } catch (error) {
        this.logger.error('Error processing Telegram message', error as Error);
        await ctx.reply('❌ An error occurred. Please try again.');
      }
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      this.logger.error('Telegraf error', err as Error, {
        updateType: ctx.updateType,
      });
    });

    if (this.config.webhookUrl) {
      this.logger.info('Starting Telegram bot with webhook', {
        url: this.config.webhookUrl,
      });
      await this.bot.telegram.setWebhook(this.config.webhookUrl);
    } else {
      this.logger.info('Starting Telegram bot with polling');
      // bot.launch() resolves when the bot STOPS (not when it starts),
      // so we must NOT await it — just fire and forget.
      this.bot.launch().catch((err) => {
        this.logger.error('Telegraf polling error', err as Error);
      });
      // Give Telegraf a moment to connect before returning
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.logger.info('Telegram bot started');
  }

  async stop(): Promise<void> {
    try {
      this.bot.stop('SIGINT');
      this.logger.info('Telegram bot stopped');
    } catch (err) {
      if ((err as Error).message.includes('Bot is not running')) {
        this.logger.warn('Telegram bot was already stopped or not running');
      } else {
        throw err;
      }
    }
  }

  async sendMessage(chatId: string | number, text: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, text);
  }

  getBot(): Telegraf {
    return this.bot;
  }
}
