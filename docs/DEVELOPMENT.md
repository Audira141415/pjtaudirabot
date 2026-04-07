# Development Guide

## Local Development Setup

### Prerequisites

- Node.js 20.0.0+ ([download](https://nodejs.org))
- PostgreSQL 15+ ([download](https://www.postgresql.org))
- Redis 7+ ([download](https://redis.io))
- pnpm 8.0.0+ ([install](https://pnpm.io/installation))
- Docker & Docker Compose (for containerized services)
- Code editor (VS Code recommended)

### Quick Start

1. **Install Node.js and pnpm**
   ```bash
   # Install pnpm globally
   npm install -g pnpm
   ```

2. **Clone repository**
   ```bash
   git clone <repo>
   cd pjtaudirabot
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

5. **Start services with Docker**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

6. **Run database migrations**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

7. **Start development servers**
   ```bash
   pnpm dev
   ```

## Development Workflow

### Manual Service Setup (without Docker)

If you prefer to run PostgreSQL and Redis locally:

**PostgreSQL**:
```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Create database and user
createdb pjtaudi
psql -d pjtaudi -c "CREATE USER pjtaudi WITH PASSWORD 'dev_password';"
psql -d pjtaudi -c "GRANT ALL PRIVILEGES ON DATABASE pjtaudi TO pjtaudi;"
```

**Redis**:
```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# Verify connection
redis-cli ping
# Output: PONG
```

### Environment Configuration

**Development .env**:
```bash
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://pjtaudi:dev_password@localhost:5432/pjtaudi
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-min-32-characters-required
TELEGRAM_BOT_TOKEN=your_test_token_here
OPENAI_API_KEY=sk-your-key-here (optional for testing)
```

### Running Services

#### All Services
```bash
pnpm dev
```
Starts API, WhatsApp, and Telegram bots with hot reload.

#### API Only
```bash
pnpm dev:api
```
Runs on `http://localhost:3000`

#### WhatsApp Bot Only
```bash
pnpm dev:whatsapp
```
Will generate QR code for scanning.

#### Telegram Bot Only
```bash
pnpm dev:telegram
```
Connects using TELEGRAM_BOT_TOKEN.

### Database Operations

```bash
# Create and run migration
pnpm db:migrate

# Reset database (WARNING: deletes all data)
pnpm db:reset

# Seed database with initial data
pnpm db:seed

# Open Prisma Studio UI (visual DB browser)
pnpm db:studio
```

## Code Quality

### Linting
```bash
# Check for issues
pnpm lint

# Automatically fix issues
pnpm lint:fix

# Format code (Prettier)
pnpm format

# Type checking
pnpm type-check
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode (re-run on changes)
pnpm test:watch

# Coverage report
pnpm test:coverage
```

**Test Structure**:
```
packages/
├── core/src/__tests__
│   └── logger.test.ts
├── services/src/command/__tests__
│   ├── executor.test.ts
│   └── registry.test.ts
└── api/src/__tests__
    ├── app.test.ts
    └── routes/
        └── health.test.ts
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm -C packages/api build

# Output: dist/ directories in each package
```

## Adding New Commands

### 1. Create Handler Class

**File**: `packages/services/src/command/handlers/myCommand.ts`

```typescript
import { CommandContext, CommandResult } from '@pjtaudirabot/core';
import { BaseCommandHandler } from '../handler';

export class MyCommand extends BaseCommandHandler {
  getName(): string {
    return 'mycommand';
  }

  getDescription(): string {
    return 'My custom command description';
  }

  getCategory(): string {
    return 'utility';
  }

  isAIPowered(): boolean {
    return false; // true if uses AI
  }

  getRequiredRole(): string {
    return 'user'; // 'user', 'moderator', 'admin'
  }

  async validate(input: string): Promise<void> {
    const parts = input.split(/\s+/);
    if (parts.length < 2) {
      throw new Error('Usage: !mycommand <arg1> <arg2>');
    }
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const message = context.input.replace(/^!mycommand\s+/, '').trim();

    // TODO: Implement command logic

    return this.createResult(true, 'Command executed successfully', {
      input: message,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 2. Register Command

**File**: `packages/api/src/app.ts` or initialization code

```typescript
import { MyCommand } from '@pjtaudirabot/services';

// In app initialization
const registry = new CommandRegistry(logger);
registry.register(new MyCommand(logger));
```

### 3. Add Tests

**File**: `packages/services/src/command/handlers/__tests__/myCommand.test.ts`

```typescript
import { MyCommand } from '../myCommand';
import { createLogger } from '@pjtaudirabot/core';

describe('MyCommand', () => {
  let command: MyCommand;
  let logger = createLogger('test');

  beforeEach(() => {
    command = new MyCommand(logger);
  });

  it('should execute successfully', async () => {
    const context = {
      input: '!mycommand arg1 arg2',
      user: { role: 'user' },
      // ... other required fields
    };

    const result = await command.execute(context);
    expect(result.success).toBe(true);
  });
});
```

## API Development

### Adding Routes

**File**: `packages/api/src/routes/myEndpoint.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function myRoutes(app: FastifyInstance) {
  app.get('/api/myresource', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'My endpoint' });
  });

  app.post('/api/myresource', async (request: FastifyRequest, reply: FastifyReply) => {
    // Handle POST
  });
}
```

**Register in app.ts**:
```typescript
app.register(myRoutes);
```

### Database Queries

```typescript
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Create
const user = await db.user.create({
  data: {
    displayName: 'John',
    platform: 'telegram',
    platformUserId: '12345'
  }
});

// Read
const user = await db.user.findUnique({
  where: { id: 'user-id' }
});

// Update (immutable pattern)
const updated = await db.user.update({
  where: { id: 'user-id' },
  data: {
    displayName: 'Jane',
    settings: {
      ...user.settings,
      language: 'es'
    }
  }
});

// Delete
await db.user.delete({ where: { id: 'user-id' } });
```

## Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch API",
      "program": "${workspaceFolder}/node_modules/.bin/tsx",
      "args": ["packages/api/src/server.ts"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development",
        "DB_USER": "pjtaudi",
        "DB_PASSWORD": "dev_password"
      }
    }
  ]
}
```

### Console Logging

```typescript
logger.debug('Debug message', { context: data });
logger.info('Info message', { userId });
logger.warn('Warning message', { attemps: 3 });
logger.error('Error message', error, { metadata });
```

### Database Inspection

```bash
# Open Prisma Studio
pnpm db:studio

# Direct SQL access
psql -d pjtaudi -U pjtaudi
```

## Git Workflow

### Branch Naming
- Feature: `feature/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`

### Commit Messages (Conventional Commits)
```
feat: add new command handler
fix: resolve rate limiter edge case
docs: update architecture guide
refactor: simplify command executor
test: add test for rate limiter
chore: update dependencies
```

### Pre-commit Hooks

Configured via `.husky/`:
- Lint check
- Type check
- Format check
- Run tests

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
docker ps | grep postgres

# Verify connection string
echo $DATABASE_URL

# Test connection directly
psql $DATABASE_URL -c "SELECT 1"
```

### Redis Connection Issues
```bash
# Check Redis status
docker ps | grep redis

# Test connection
redis-cli ping
# Expected: PONG
```

### Hot Reload Not Working
- Check file was saved
- Verify watch is enabled: `pnpm dev:api --watch`
- Clear Node cache: `pkill -f tsx`
- Restart service

### Type Errors
```bash
# Update generated types
pnpm db:generate

# Type check entire project
pnpm type-check
```

## Performance Profiling

### Enable Debug Logging
```bash
# Set debug level
LOG_LEVEL=debug pnpm dev:api

# Or add to .env
LOG_LEVEL=debug
```

### Database Query Profiling
```typescript
// Prisma logs queries in development
DATABASE_LOG=query,error pnpm dev:api
```

### Memory Profiling
```bash
# Using Node inspector
node --inspect packages/api/dist/server.js

# Open chrome://inspect in Chrome to debug
```

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start all services |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format` | Format code |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Open DB UI |
| `pnpm docker:up` | Start containers |
| `pnpm type-check` | Check types |

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Fastify Documentation](https://www.fastify.io/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated**: 2024
**Version**: 1.0.0
