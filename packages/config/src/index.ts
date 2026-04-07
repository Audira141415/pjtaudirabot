import { z } from 'zod';

// Helper: treat empty strings as undefined for optional fields
const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url().optional()
);
const optionalStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().optional()
);
const optionalEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().email().optional()
);

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('PJTAudiBot'),
  APP_VERSION: z.string().default('1.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Server
  SERVER_HOST: z.string().default('0.0.0.0'),
  SERVER_PORT: z.coerce.number().default(3000),
  SERVER_URL: optionalUrl,

  // Per-service ports (avoid conflicts)
  API_PORT: z.coerce.number().default(4000),
  TELEGRAM_PORT: z.coerce.number().default(4010),
  WHATSAPP_PORT: z.coerce.number().default(4020),
  DASHBOARD_PORT: z.coerce.number().default(3000),
  BOT_PORT_RANGE_START: z.coerce.number().default(4100),
  BOT_PORT_RANGE_END: z.coerce.number().default(4199),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().default(5),
  DATABASE_POOL_MAX: z.coerce.number().default(20),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_CACHE_TTL: z.coerce.number().default(3600),

  // WhatsApp
  WHATSAPP_ENABLED: z.enum(['true', 'false']).default('true'),
  WHATSAPP_SILENT_MODE: z.enum(['true', 'false']).default('false'),
  WHATSAPP_SESSION_DIR: z.string().default('./data/whatsapp-sessions'),
  WHATSAPP_RECONNECT_ATTEMPTS: z.coerce.number().default(5),
  WHATSAPP_RECONNECT_DELAY: z.coerce.number().default(5000),

  // Telegram
  TELEGRAM_ENABLED: z.enum(['true', 'false']).default('true'),
  TELEGRAM_BOT_TOKEN: optionalStr,
  TELEGRAM_WEBHOOK_URL: optionalUrl,

  // AI Service
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'ollama', 'mock']).default('openai'),
  OPENAI_API_KEY: optionalStr,
  OPENAI_MODEL: z.string().default('gpt-3.5-turbo'),
  OPENAI_TEMPERATURE: z.coerce.number().default(0.7),
  ANTHROPIC_API_KEY: optionalStr,
  OLLAMA_ENDPOINT: optionalUrl,

  // Memory System
  MEMORY_ENABLED: z.enum(['true', 'false']).default('true'),
  MEMORY_SHORT_TERM_MAX: z.coerce.number().default(20),
  MEMORY_SHORT_TERM_TTL: z.coerce.number().default(86400),
  MEMORY_EXTRACTOR_MODE: z.enum(['ai', 'rules', 'off']).default('rules'),
  MEMORY_SEMANTIC_ENABLED: z.enum(['true', 'false']).default('false'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(30),
  RATE_LIMIT_STRATEGY: z.enum(['sliding', 'fixed']).default('sliding'),

  // Security
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),
  SESSION_EXPIRY: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().default(10),

  // Admin
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD_HASH: optionalStr,
  ADMIN_EMAIL: optionalEmail,

  // Google Sheets
  GOOGLE_SHEETS_ENABLED: z.enum(['true', 'false']).default('false'),
  GOOGLE_SHEETS_CREDENTIALS: optionalStr, // JSON string or file path
  GOOGLE_SHEETS_SPREADSHEET_ID: optionalStr,

  // Admin WhatsApp Groups (comma-separated JIDs for alert notifications)
  ADMIN_GROUP_JIDS: optionalStr,

  // Telegram NOC group chat ID — new ticket alerts forwarded here from WhatsApp
  TELEGRAM_NOC_CHAT_ID: optionalStr,

  // Logging
  LOG_DIR: z.string().default('./logs'),
  LOG_FILE_MAX_SIZE: z.string().default('10m'),
  LOG_FILES_MAX: z.coerce.number().default(14),
  SENTRY_DSN: optionalUrl,
});

export type Config = z.infer<typeof envSchema>;

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      const missingEnvs = Object.keys(result.error.flatten().fieldErrors);
      throw new Error(
        `Invalid environment variables: ${missingEnvs.join(', ')}`
      );
    }

    config = result.data;
  }

  return config;
}

export function validateConfig(): void {
  getConfig();
}

export * from './database';
export * from './redis';
export * from './bots';
export * from './server';
export * from './logging';
export * from './ports';
