import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { getServerConfig, getRedisConfig } from '@pjtaudirabot/config';
import { createLogger } from '@pjtaudirabot/core';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { adminRoutes } from './routes/admin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AppContext {
  db: PrismaClient;
  redis: any;
  logger: any;
}

export async function createApp() {
  const serverConfig = getServerConfig();
  const redisConfig = getRedisConfig();

  const logger = createLogger('api', serverConfig.env === 'production' ? 'info' : 'debug');

  // Initialize database
  const db = new PrismaClient({
    log: serverConfig.env === 'development' ? ['query', 'info', 'warn', 'error'] : [],
  });

  // Ensure default BotConfig rows exist for all platforms
  async function seedBotConfigs() {
    const platforms = ['WHATSAPP', 'TELEGRAM'] as const;
    const defaults: Record<string, object> = {
      WHATSAPP: { phoneNumber: '', webhookUrl: '', sessionPath: './sessions', maxRetries: 3 },
      TELEGRAM: { botToken: '', webhookUrl: '', parseMode: 'HTML', commandPrefix: '/' },
    };
    for (const platform of platforms) {
      await db.botConfig.upsert({
        where: { platform },
        create: { platform, isActive: false, configuration: defaults[platform] },
        update: {},
      });
    }
  }
  await seedBotConfigs();

  // Initialize Redis
  const redis = createClient({
    url: redisConfig.url,
    password: redisConfig.password,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
    }
  });

  await redis.connect();

  // Create Fastify instance
  const app = Fastify({
    logger: serverConfig.env === 'development',
  });

  // Register plugins
  await app.register(fastifyHelmet);
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    sign: {
      expiresIn: process.env.JWT_EXPIRY || '24h',
    }
  });

  // Context middleware
  app.decorate('db', db);
  app.decorate('redis', redis);
  app.decorate('appLogger', logger);

  // Health check route
  app.get('/health', async (_request, reply) => {
    try {
      await db.$queryRaw`SELECT 1`;
      await redis.ping();

      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: serverConfig.appVersion,
        environment: serverConfig.env,
        uptime: process.uptime()
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        error: (error as Error).message
      });
    }
  });

  // Ready state
  app.get('/ready', async (_request, reply) => {
    return reply.send({ ready: true });
  });

  // ── Auth (public — no JWT required) ───────────────────────
  app.post('/api/admin/auth/login', async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== adminUser || password !== adminPass) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    const token = app.jwt.sign({ sub: 'admin', role: 'admin' });
    return reply.send({ token });
  });

  // Admin API routes (prefix: /api/admin)
  await app.register(
    async (instance) => adminRoutes(instance, { db, redis, logger }),
    { prefix: '/api/admin' }
  );

  // Serve dashboard static files in production
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dashboardPath = path.resolve(__dirname, '../../dashboard/dist');

  await app.register(fastifyStatic, {
    root: dashboardPath,
    prefix: '/',
    wildcard: false,
    decorateReply: false,
  });

  // SPA fallback: serve index.html for non-API routes
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    return reply.sendFile('index.html', dashboardPath);
  });

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    logger.error('API Error', error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  });

  return {
    app,
    ctx: { db, redis, logger } as AppContext,
  };
}
