import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import bcrypt from 'bcrypt';
import { getServerConfig, getRedisConfig } from '@pjtaudirabot/config';
import { createLogger } from '@pjtaudirabot/core';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { adminRoutes } from './routes/admin';
import { clusteringRoutes } from './routes/clustering';
import networkRoutes from './routes/network';
import insightsRoutes from './routes/insights';
import { SelfHealingService, SentimentService } from '@pjtaudirabot/services';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// removed RedisClientType
import type { ILogger } from '@pjtaudirabot/core';

export interface AppContext {
  db: PrismaClient;
  redis: any;
  logger: ILogger;
  sentiment: SentimentService;
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
    socket: { reconnectStrategy: (retries: number) => Math.min(retries * 50, 500) },
  });
  await redis.connect();

  // Initialize Intelligent Services
  const isProduction = serverConfig.env === 'production';
  const selfHealing = new SelfHealingService(db, logger, isProduction);
  const sentiment = new SentimentService(db, logger, process.env.OPENAI_API_KEY);

  // Start Self-Healing loop
  selfHealing.start(isProduction ? 5 * 60 * 1000 : 60 * 1000); // 5m production, 1m dev

  // Create Fastify instance
  const app = Fastify({
    logger: serverConfig.env === 'development',
  });

  // Register plugins
  const enableUpgradeInsecureRequests =
    (process.env.ENABLE_UPGRADE_INSECURE_REQUESTS || '').toLowerCase() === 'true';
  const enableStrictTransportSecurity =
    (process.env.ENABLE_STRICT_TRANSPORT_SECURITY || '').toLowerCase() === 'true';
  const enableSecureIsolationHeaders =
    (process.env.ENABLE_SECURE_ISOLATION_HEADERS || '').toLowerCase() === 'true';
  await app.register(fastifyHelmet, {
    hsts: enableStrictTransportSecurity ? undefined : false,
    crossOriginOpenerPolicy: enableSecureIsolationHeaders ? undefined : false,
    originAgentCluster: enableSecureIsolationHeaders ? undefined : false,
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: enableUpgradeInsecureRequests ? [] : null,
      },
    },
  });
  // CORS — restrict origins in production, allow all in development
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:4000'];
  await app.register(fastifyCors, {
    origin: serverConfig.env === 'development' ? true : allowedOrigins,
    credentials: true,
  });

  // JWT — require a strong secret in production
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && serverConfig.env === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  await app.register(fastifyJwt, {
    secret: jwtSecret || 'dev-secret-key-for-local-only',
    sign: {
      expiresIn: process.env.JWT_EXPIRY || '24h',
    }
  });

  // Rate limiting — used per-route (login brute-force protection)
  await app.register(fastifyRateLimit, {
    global: false,
  });
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  // Context middleware
  app.decorate('db', db);
  app.decorate('redis', redis);
  app.decorate('appLogger', logger);
  app.decorate('sentiment', sentiment);

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
        uptime: process.uptime(),
        intelligence: {
          sentiment: !!process.env.OPENAI_API_KEY,
          selfHealing: true
        }
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

  // ── Auth (public — no JWT required, rate-limited) ──────────
  app.post('/api/admin/auth/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '5 minutes',
      },
    },
  }, async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };
    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' });
    }

    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    if (username !== adminUser) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    // Use bcrypt hash comparison when ADMIN_PASSWORD_HASH is set (recommended)
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (adminPasswordHash) {
      const isValid = await bcrypt.compare(password, adminPasswordHash);
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid username or password' });
      }
    } else {
      // Fallback to plaintext for initial setup / development only
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
      if (password !== adminPass) {
        return reply.status(401).send({ error: 'Invalid username or password' });
      }
      if (serverConfig.env === 'production') {
        logger.warn(
          'SECURITY WARNING: ADMIN_PASSWORD_HASH is not set. '
          + 'Using plaintext password comparison. '
          + 'Generate a hash with: npx bcrypt-cli hash <password>'
        );
      }
    }

    const token = app.jwt.sign({ sub: 'admin', role: 'admin' });
    return reply.send({ token });
  });

  // Admin API routes (prefix: /api/admin)
  await app.register(
    async (instance) => adminRoutes(instance, { db, redis, logger, sentiment }),
    { prefix: '/api/admin' }
  );

  // Clustering routes (prefix: /api/tickets)
  await app.register(
    async (instance) => clusteringRoutes(instance, { db, logger }),
    { prefix: '/api/tickets' }
  );

  // Network & High-end features routes (prefix: /api/network)
  await app.register(
    async (instance) => networkRoutes(instance, { db, redis, logger }),
    { prefix: '/api/network' }
  );

  // AI Insights routes (prefix: /api/insights)
  await app.register(
    async (instance) => insightsRoutes(instance, { db, redis, logger }),
    { prefix: '/api/insights' }
  );

  // Serve dashboard static files in production
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dashboardCandidates = [
    path.resolve(__dirname, '../dashboard/dist'),
    path.resolve(__dirname, '../../dashboard/dist'),
    path.resolve(process.cwd(), 'dashboard/dist'),
  ];

  let dashboardPath = dashboardCandidates[0];
  for (const candidate of dashboardCandidates) {
    try {
      await fs.access(candidate);
      dashboardPath = candidate;
      break;
    } catch {
      // Continue until we find an existing dashboard dist path.
    }
  }

  const uploadsPath = path.resolve(process.cwd(), 'data/uploads');
  await fs.mkdir(uploadsPath, { recursive: true });

  await app.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    wildcard: true,
    decorateReply: false,
  });

  app.get('/uptime', async (_request, reply) => {
    return reply.sendFile('index.html', dashboardPath);
  });

  app.get('/uptime/*', async (_request, reply) => {
    return reply.sendFile('index.html', dashboardPath);
  });

  await app.register(fastifyStatic, {
    root: dashboardPath,
    prefix: '/',
    wildcard: false,
  });

  // Ensure client-side routes (e.g. /uptime) work on direct refresh/open.
  app.get('/*', async (request, reply) => {
    const requestPath = request.url.split('?')[0];
    const isApiPath = requestPath.startsWith('/api/');
    const isUploadPath = requestPath.startsWith('/uploads/');
    const lastPathSegment = requestPath.slice(requestPath.lastIndexOf('/') + 1);
    const hasAssetExtension = /\.[a-z0-9]{2,8}$/i.test(lastPathSegment);
    const isKnownStaticFile = requestPath === '/favicon.ico'
      || requestPath === '/robots.txt'
      || requestPath === '/manifest.webmanifest';
    const acceptsHtml = request.headers.accept?.includes('text/html') ?? false;

    if (isApiPath || isUploadPath || isKnownStaticFile || hasAssetExtension || !acceptsHtml) {
      return reply.status(404).send({ error: 'Not Found' });
    }

    return reply.sendFile('index.html', dashboardPath);
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
