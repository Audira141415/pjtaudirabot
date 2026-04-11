# PJTAudiBot - Production-Ready Multi-Platform Bot System

A scalable, modular bot system supporting WhatsApp (Baileys) and Telegram (Telegraf) with unified command handling, AI integration, rate limiting, and comprehensive logging.

## 🚀 Features

- **Multi-Platform Support**: WhatsApp and Telegram with unified command handler
- **AI Integration**: OpenAI, Anthropic, Ollama, or local LLM support
- **Distributed Rate Limiting**: Redis-backed rate limiter for multi-instance deployments
- **User Session Tracking**: Redis-based session management with TTL
- **Audit Logging**: Complete audit trail for all operations
- **REST API**: Fastify-based API server for bot management and operations
- **Modular Architecture**: Clean separation of concerns with workspace packages
- **Production-Ready**: Docker support, health checks, error handling
- **Database**: PostgreSQL with Prisma ORM for data persistence

## 📋 Prerequisites

- Node.js 20.0.0+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (for containerized deployment)
- pnpm package manager

## 🏗️ Project Structure

```
packages/
├── core/              # Shared types, interfaces, logger
├── config/            # Configuration management
├── services/          # Business logic (commands, rate limiter, AI)
├── database/          # Prisma ORM and migrations
├── api/               # REST API server (Fastify)
└── bots/
    ├── whatsapp/      # WhatsApp bot (Baileys)
    └── telegram/      # Telegram bot (Telegraf)

docker/               # Docker and docker-compose files
docs/                 # Documentation
scripts/              # Utility scripts
```

## 🚀 Quick Start

### Local Development

1. **Clone and install dependencies**
   ```bash
   pnpm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services with Docker**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

4. **Setup database**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Start development servers**
   ```bash
   # Start all services
   pnpm dev

   # Or start individual services
   pnpm dev:api
   pnpm dev:whatsapp
   pnpm dev:telegram
   ```

### Docker Deployment

```bash
# Local source-based deployment (builds on the machine running compose)
pnpm docker:up

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

For production deployments, prefer the registry-based flow:

```bash
# Build, push, and upload release image refs from Windows
scripts/build-and-push-release.cmd <registry-prefix> [tag] [push] [server-host]

# On the server, start from pulled images only
/home/audira/pjtaudirabot/scripts/server-control.sh release-start
```

## 📡 API Documentation

### Health Check
```bash
GET /health
```

### Authentication
```bash
POST /auth/login
POST /auth/logout
POST /auth/refresh
```

### Commands
```bash
GET /commands
GET /commands/:id
POST /commands/:id/execute
GET /commands/:id/executions
```

### Users
```bash
GET /users/:id
PATCH /users/:id
GET /users/:id/sessions
```

### Sessions
```bash
GET /sessions/:id
POST /sessions
DELETE /sessions/:id
```

### Rate Limits
```bash
GET /rate-limit/status
GET /rate-limit/user/:userId
POST /rate-limit/user/:userId/reset
```

See [docs/API.md](./docs/API.md) for complete API documentation.

## 🤖 Built-in Commands

| Command | Description | Alias |
|---------|-------------|-------|
| `!help` | List available commands | `!h` |
| `!ping` | Check bot responsiveness | - |
| `!status` | Get system status (admin) | - |
| `!echo <message>` | Echo back message | - |

## ⚙️ Configuration

All configuration is managed via environment variables. See `.env.example` for complete list.

**Key Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `AI_PROVIDER` - AI service (openai, anthropic, ollama)
- `OPENAI_API_KEY` - OpenAI API key
- `WHATSAPP_SESSION_DIR` - WhatsApp session storage
- `JWT_SECRET` - JWT signing secret

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## 📦 Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm -C packages/api build
```

## 🔍 Linting & Formatting

```bash
# Check code quality
pnpm lint

# Fix issues automatically
pnpm lint:fix

# Format code
pnpm format

# Type checking
pnpm type-check
```

## 📚 Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md) - System design and component overview
- [Database Schema](./docs/DATABASE.md) - Data model and relationships
- [Development Guide](./docs/DEVELOPMENT.md) - Local development setup
- [API Reference](./docs/API.md) - Complete API documentation
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment strategies

## 🔒 Security

- JWT-based authentication
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention (Prisma parameterized queries)
- XSS protection (output encoding)
- CORS configuration
- Helmet security headers
- Audit logging of all operations

## 📊 Monitoring

- Health check endpoints (`/health`, `/ready`)
- Structured JSON logging with Pino
- Sentry integration (optional)
- Request correlation IDs
- Performance metrics

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Write tests first (TDD)
3. Implement feature
4. Run linting and tests: `pnpm lint && pnpm test`
5. Commit with conventional commit: `git commit -m "feat: add my feature"`
6. Push and create pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running: `docker ps | grep postgres`
- Check DATABASE_URL in .env
- Reset database: `pnpm db:reset`

### Redis Connection Error
- Verify Redis is running: `docker ps | grep redis`
- Check REDIS_URL in .env

### WhatsApp QR Code Not Appearing
- Check WhatsApp session directory exists
- Clear sessions: `rm -rf data/whatsapp-sessions`
- Restart bot

### Telegram Bot Not Responding
- Verify TELEGRAM_BOT_TOKEN is set correctly
- Check bot token in BotFather
- Restart telegram service

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the development team.

---

**Last Updated**: 2024
**Version**: 1.0.0
