# Architecture Guide

## System Overview

PJTAudiBot is a production-grade bot system with the following architectural principles:

```
┌─────────────────────────────────────────────────────────────┐
│                    External Platforms                        │
│              WhatsApp (Baileys) | Telegram (Telegraf)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       │                               │
   ┌───▼──────────┐          ┌────────▼────┐
   │ WhatsApp Bot │          │ Telegram Bot │
   └───┬──────────┘          └────────┬────┘
       │          Message             │
       │         Processing           │
       └───────────────┬───────────────┘
                       │
       ┌───────────────▼───────────────┐
       │    REST API Server (Fastify)  │
       │  - Authentication (JWT)       │
       │  - Rate Limiting              │
       │  - Command Execution          │
       └───┬───────────────────────────┘
           │          Orchestration
       ┌───┴─────────────────────┐
       │                         │
  ┌────▼─────────────┐   ┌──────▼────────────┐
  │  Command Executor│   │  Rate Limiter     │
  │  - Registry      │   │  (Redis-backed)   │
  │  - Handler Exec  │   │  - Sliding Window │
  │  - Permissions   │   │  - Per-User/Cmd   │
  └────┬─────────────┘   └──────┬────────────┘
       │                        │
  ┌────▴────────────────────────▴──┐
  │                                  │
  │  Command Handlers              │
  │  - Built-in (help, ping)       │
  │  - AI-Powered                  │
  │  - User Extensions             │
  └────┬─────────────────────────────┘
       │          Execution
  ┌────▴────────────┐
  │  AI Service     │
  │  - OpenAI       │
  │  - Anthropic    │
  │  - Ollama       │
  └────┬────────────┘
       │
  ┌────▴──────────────────────┐
  │   Data Layer               │
  │  ┌────────────────────┐   │
  │  │   PostgreSQL (DB)  │   │
  │  └────────────────────┘   │
  │  ┌────────────────────┐   │
  │  │  Redis (Cache)     │   │
  │  └────────────────────┘   │
  └────────────────────────────┘
```

## Component Architecture

### 1. **Bots Layer** (`packages/bots/`)
- **WhatsApp Bot** - Baileys wrapper for WhatsApp Business API
- **Telegram Bot** - Telegraf wrapper for Telegram Bot API
- Both normalize messages into `CommandContext`
- Handle platform-specific features (groups, media, etc.)

### 2. **API Server** (`packages/api/`)
- Fastify-based REST server
- Health checks and readiness probes
- User management and authentication
- Command listing and execution
- Audit log retrieval

### 3. **Command System** (`packages/services/command/`)

```
CommandRegistry (Singleton)
  ├─ register(handler)
  ├─ get(name)
  ├─ list()
  └─ getCategories()

CommandHandler (Abstract Base)
  ├─ getName()
  ├─ getDescription()
  ├─ execute()
  └─ validate()

Concrete Handlers
  ├─ HelpCommand
  ├─ PingCommand
  ├─ EchoCommand
  ├─ StatusCommand
  └─ [User Extensions]

CommandExecutor (Orchestrator)
  ├─ parse(input)
  ├─ checkRateLimit()
  ├─ checkPermissions()
  ├─ execute()
  └─ logExecution()
```

### 4. **Rate Limiting** (`packages/services/rate-limiter/`)
- Redis-backed distributed rate limiter
- Sliding window algorithm (default)
- Per-user, per-command limits
- Replicated across instances

```
User A - Command X
  key: ratelimit:userId:commandX
  value: counter (incremented per request)
  ttl: windowMs (60000ms default)

If counter > maxRequests within window → THROTTLED
```

### 5. **Configuration** (`packages/config/`)
- Environment variable validation (Zod schema)
- Centralized config management
- Type-safe access to all settings

### 6. **Core Library** (`packages/core/`)
- Shared TypeScript types
- Logger interface and implementation
- Error classes
- Constants

### 7. **Database** (`packages/database/`)
- Prisma ORM
- PostgreSQL backend
- Migrations and seeding
- Type-safe database queries

## Data Flow

### Incoming Message Flow
```
1. Bot Platform (WhatsApp/Telegram) receives message
2. Message Handler normalizes to CommandContext
3. Rate limiter checks user limits
4. CommandExecutor parses command name
5. Permissions validated against user role
6. CommandHandler.execute() called
7. Response formatted for platform
8. Message sent back to user
9. Execution logged to database
```

### Execution Pipeline
```typescript
async execute(context: CommandContext): Promise<CommandResult> {
  // 1. Parse command name
  const cmd = parseCommandName(context.input); // "echo"

  // 2. Get handler
  const handler = registry.get(cmd);

  // 3. Check rate limits
  await rateLimiter.check(context.userId, cmd);

  // 4. Validate permissions
  checkPermissions(context.user, handler);

  // 5. Validate input
  await handler.validate(context.input);

  // 6. Execute
  return await handler.execute(context);
}
```

## Database Schema

### Key Tables

**Users**
- Platform-specific user identification
- Role-based access control (user, moderator, admin)
- Settings and preferences
- Activity tracking

**Sessions**
- JWT token management
- Platform-specific session info
- Expiration and lifecycle

**Commands**
- Command definitions and metadata
- Rate limit configuration
- AI integration settings

**CommandExecutions**
- Audit trail of all command runs
- Performance metrics (execution time)
- Error tracking

**AuditLogs**
- Comprehensive action logging
- User activity tracking
- Permission audit trail

**BotConfigs**
- Per-platform bot configuration
- Connection status
- Version tracking

**RateLimitSnapshots**
- Historical rate limit data
- Usage analytics

## Security Architecture

### Authentication
- JWT tokens issued on login
- Refresh token rotation
- Session tracking in Redis
- Automatic token expiration

### Authorization
- Role-based access control (RBAC)
- Role hierarchy: user < moderator < admin
- Permission checking per command
- Resource-level access control

### Input Validation
- Schema-based validation (Zod)
- Command-level input sanitization
- Context validation
- Type checking

### Audit Trail
- All actions logged to database
- User identification
- Action type and resource
- Before/after change tracking
- Success/failure status

## Scaling Considerations

### Horizontal Scaling
- Stateless API servers (multiple instances)
- Redis for distributed session store
- PostgreSQL connection pooling
- Rate limiter replicated via Redis

### Vertical Scaling
- Database query optimization (indexes)
- Caching layer (Redis)
- Connection pooling (Prisma)
- Message queuing (future: Bull/BullMQ for async jobs)

### Performance Optimization
- Prepared statements (Prisma)
- Redis caching for frequently accessed data
- Connection pooling
- Lazy loading of relationships

## Deployment Architecture

### Single Instance
```
┌─────────────────────────────────┐
│     Docker Compose Stack         │
├─────────────────────────────────┤
│ PostgreSQL | Redis | API        │
│           | WhatsApp | Telegram │
└─────────────────────────────────┘
```

### High Availability (HA)
```
┌──────────────────────────────────────┐
│         Load Balancer                 │
└────────────────┬─────────────────────┘
         ┌───────┼───────┐
    ┌────▼──┐  ┌──▼────┐  ┌──▼────┐
    │ API 1 │  │ API 2 │  │ API 3 │
    └─┬──┬──┘  └──┬────┘  └──┬────┘
      │  │       │  │        │  │
      │  └─────┬─┘  │    ┌───┘  │
      │        │     │    │     │
    ┌─┴────────┼─────┼────┼─┐
    │  PostgreSQL (Primary+Replicas)
    └────────────────────────────┘
    ┌─────────────────────────────┐
    │  Redis Cluster (3+ nodes)  │
    └─────────────────────────────┘
```

## Error Handling Strategy

1. **Validation Errors** → 400 Bad Request
2. **Rate Limit Errors** → 429 Too Many Requests
3. **Unauthorized** → 401 Unauthorized
4. **Not Found** → 404 Not Found
5. **Server Errors** → 500 Internal Server Error

All errors logged with:
- Unique error ID
- Stack trace
- Context information
- User identification
- Timestamp

## Monitoring & Observability

### Health Checks
- `/health` - Full system health
- `/ready` - Readiness probe

### Metrics (Optional: Prometheus)
- Request count and latency
- Command execution metrics
- Database query performance
- Redis hit/miss ratio
- Rate limiter statistics

### Logging
- Structured JSON logging (Pino)
- Request correlation IDs
- Error tracking (Sentry integration)
- Performance profiling

## Future Enhancements

1. **Message Queuing** - Bull/BullMQ for async processing
2. **Real-time Updates** - WebSocket support
3. **Advanced Analytics** - Command usage analytics
4. **Plugin System** - Dynamic command loading
5. **Multi-workspace** - Isolated bot instances
6. **Machine Learning** - Intent classification, response generation
7. **Internationalization** - Multi-language support
8. **Advanced Caching** - Distributed caching strategies

---

**Architecture Version**: 1.0.0
**Last Updated**: 2024
