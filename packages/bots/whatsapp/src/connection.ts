import { createRequire } from 'module';
import { Boom } from '@hapi/boom';
import { ILogger } from '@pjtaudirabot/core';
import { mkdir } from 'fs/promises';
import path from 'path';
import pino from 'pino';

const require = createRequire(import.meta.url);
const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');

type WASocket = any;

export interface WhatsAppConnectionConfig {
  sessionDir: string;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export class WhatsAppConnection {
  private socket: WASocket | null = null;
  private reconnectCount = 0;
  private onMessageCallback: ((msg: any) => Promise<void>) | null = null;
  public connectionState: 'open' | 'connecting' | 'close' = 'connecting';

  constructor(
    private config: WhatsAppConnectionConfig,
    private logger: ILogger
  ) {}

  onMessage(callback: (msg: any) => Promise<void>): void {
    this.onMessageCallback = callback;
  }

  async connect(): Promise<void> {
    await mkdir(this.config.sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(
      path.resolve(this.config.sessionDir)
    );

    const baileysLogger = pino({ level: 'silent' });

    // Fetch latest WhatsApp Web version to avoid 405 rejections
    let version: [number, number, number] | undefined;
    try {
      const result = await fetchLatestWaWebVersion({});
      version = result.version;
      this.logger.info('Using WA Web version', { version });
    } catch {
      this.logger.warn('Failed to fetch latest WA version, using default');
    }

    this.socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      printQRInTerminal: true,
      logger: baileysLogger,
      browser: ['PJTAudiBot', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: false,
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.info('QR Code received — scan with WhatsApp');
      }

      if (connection === 'close') {
        this.connectionState = 'close';
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.logger.warn('WhatsApp connection closed', {
          statusCode,
          shouldReconnect,
        });

        if (shouldReconnect && this.reconnectCount < this.config.reconnectAttempts) {
          this.reconnectCount++;
          this.logger.info(`Reconnecting (${this.reconnectCount}/${this.config.reconnectAttempts})...`);
          setTimeout(() => {
            this.connect().catch((err) => {
              this.logger.error('Reconnect failed', err as Error);
            });
          }, this.config.reconnectDelay);
        } else if (!shouldReconnect) {
          this.logger.error('Logged out — removing session and stopping');
        }
      }

      if (connection === 'open') {
        this.connectionState = 'open';
        this.reconnectCount = 0;
        this.logger.info('WhatsApp connection established');
      }
    });

    // Suppress Baileys internal errors (signal protocol, WebSocket) to prevent process crash
    (this.socket as any).ws?.on?.('error', (err: Error) => {
      this.logger.warn('WhatsApp WebSocket error (suppressed)', { message: err?.message });
    });

    this.socket.ev.on('messages.upsert', async ({ messages, type }: any) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (!msg.message) continue;

        try {
          await this.onMessageCallback?.(msg);
        } catch (error) {
          this.logger.error('Error processing WhatsApp message', error as Error);
        }
      }
    });
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.socket) {
          throw new Error('WhatsApp not connected');
        }

        await this.socket.sendMessage(jid, { text });
        return;
      } catch (err: any) {
        const isRecoverableError = this.isRecoverableSendError(err);

        if (isRecoverableError && attempt < maxRetries) {
          this.logger.warn(`sendMessage transient error for ${jid} (attempt ${attempt}/${maxRetries}), retrying...`);
          // Keep this lightweight; transient transport/session errors often recover quickly.
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }

        if (isRecoverableError) {
          // Never crash message pipeline for transient WA transport/session failures.
          const sendError = err instanceof Error
            ? err
            : new Error(String(err?.message ?? err?.name ?? 'Unknown sendMessage error'));
          this.logger.error(
            `sendMessage failed after ${maxRetries} attempts for ${jid}`,
            sendError,
          );
          return;
        }

        throw err;
      }
    }
  }

  private isRecoverableSendError(err: unknown): boolean {
    const message = (err as any)?.message;
    const normalizedMessage = typeof message === 'string' ? message.toLowerCase() : '';
    const name = ((err as any)?.name ?? (err as any)?.constructor?.name ?? '') as string;
    const normalizedName = name.toLowerCase();

    return normalizedMessage === 'no sessions'
      || normalizedMessage.includes('connection closed')
      || normalizedMessage.includes('connection terminated')
      || normalizedMessage.includes('timed out')
      || normalizedMessage.includes('socket closed')
      || normalizedName === 'sessionerror';
  }

  async disconnect(): Promise<void> {
    this.socket?.end(undefined);
    this.socket = null;
    this.logger.info('WhatsApp disconnected');
  }

  getSocket(): WASocket | null {
    return this.socket;
  }
}
