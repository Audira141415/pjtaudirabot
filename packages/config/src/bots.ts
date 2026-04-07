import { getConfig } from './index';

export interface BotsConfig {
  whatsapp: {
    enabled: boolean;
    silentMode: boolean;
    sessionDir: string;
    reconnectAttempts: number;
    reconnectDelay: number;
  };
  telegram: {
    enabled: boolean;
    botToken?: string;
    webhookUrl?: string;
    /** Group chat ID that receives ticket alerts forwarded from WhatsApp */
    nocChatId?: string;
  };
}

export function getBotsConfig(): BotsConfig {
  const config = getConfig();

  return {
    whatsapp: {
      enabled: config.WHATSAPP_ENABLED === 'true',
      silentMode: config.WHATSAPP_SILENT_MODE === 'true',
      sessionDir: config.WHATSAPP_SESSION_DIR,
      reconnectAttempts: config.WHATSAPP_RECONNECT_ATTEMPTS,
      reconnectDelay: config.WHATSAPP_RECONNECT_DELAY
    },
    telegram: {
      enabled: config.TELEGRAM_ENABLED === 'true',
      botToken: config.TELEGRAM_BOT_TOKEN,
      webhookUrl: config.TELEGRAM_WEBHOOK_URL,
      nocChatId: config.TELEGRAM_NOC_CHAT_ID,
    }
  };
}
