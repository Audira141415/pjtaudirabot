# CLAUDE.md — AudiraBot Project Intelligence

> **AI Behavior Config for:** `PJTAUDIRABOT` — Enterprise-grade WhatsApp & Telegram Bot Management Suite  
> **Skills Source:** `./claude-skills-main/`  
> **Owner:** Audira141415  
> **Version:** 1.0.0

---

## 🧠 Active Skills (Default Behavior)

This file activates specific skill packages from `./claude-skills-main/` as **default intelligent behavior** for all AI-assisted work on this repository. These skills apply automatically — no manual activation needed.

### Primary Stack Skills (Always Active)

| Skill | Path | Applies To |
|-------|------|------------|
| **senior-fullstack** | `./claude-skills-main/engineering-team/senior-fullstack/` | All TypeScript, React, Node.js, Prisma work |
| **senior-devops** | `./claude-skills-main/engineering-team/senior-devops/` | Docker, CI/CD, server deployment, scripts |
| **senior-backend** | `./claude-skills-main/engineering-team/senior-backend/` | API routes, Fastify, services, database layers |
| **senior-frontend** | `./claude-skills-main/engineering-team/senior-frontend/` | React components, Dashboard, LiveTerminal UI |
| **code-reviewer** | `./claude-skills-main/engineering-team/code-reviewer/` | All code edits and new file creation |
| **senior-secops** | `./claude-skills-main/engineering-team/senior-secops/` | .env handling, API keys, Docker secrets |
| **tdd-guide** | `./claude-skills-main/engineering-team/tdd-guide/` | TypeScript service and command unit tests |
| **incident-commander** | `./claude-skills-main/engineering-team/incident-commander/` | Server errors, bot downtime, outage response |

---

## 📦 Project Architecture

### Monorepo Structure (pnpm workspaces)

```
PJTAUDIRABOT/
├── packages/
│   ├── api/            # Fastify API server (port 4000)
│   │   └── src/
│   │       ├── app.ts           # Main entry, registers SentimentService & SelfHealingService
│   │       └── routes/admin.ts  # Admin REST endpoints (AppContext-injected)
│   │
│   ├── bots/
│   │   ├── telegram/   # Telegram bot (grammy)
│   │   └── whatsapp/   # WhatsApp bot (baileys)
│   │
│   ├── dashboard/      # Vite + React dashboard (port 4000 via proxy)
│   │   └── src/pages/
│   │       ├── Dashboard.tsx    # Neural Insights + system metrics
│   │       └── LiveTerminal.tsx # Multi-bot real-time terminal + Whisper/Takeover
│   │
│   ├── services/       # Core business logic (shared across bots)
│   │   └── src/
│   │       ├── SentimentService.ts    # AI emotional analysis (OpenAI GPT-4o-mini)
│   │       ├── SelfHealingService.ts  # Autonomous Docker container recovery
│   │       ├── bootstrap.ts           # Unified bot service initializer
│   │       ├── flow/index.ts          # No-code conversational flow engine
│   │       ├── live-chat/index.ts     # WebSocket bridge (agent takeover, whisper)
│   │       ├── user/index.ts          # Unified identity (WA+TG linking)
│   │       └── pipeline/index.ts      # Chat processing pipeline (with sentiment)
│   │
│   ├── config/         # Environment configuration
│   ├── core/           # Shared types, logger, utilities
│   └── database/       # Prisma schema (schema.prisma)
│
├── claude-skills-main/ # AI Skill Library (235 production skills)
├── docker/             # Docker compose files
├── scripts/            # Deployment & control scripts
├── SAVE.bat            # Git commit & push utility
├── AUDIRA_START.bat    # Start all services locally
└── AUDIRA_STOP.bat     # Stop all services
```

---

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20 LTS, TypeScript 5.x |
| **Package Manager** | pnpm (workspaces monorepo) |
| **API Framework** | Fastify 4.x |
| **Frontend** | React 18 + Vite 5 + Framer Motion |
| **Bot (Telegram)** | grammY |
| **Bot (WhatsApp)** | Baileys (multi-device) |
| **Database** | PostgreSQL 15 + Prisma ORM |
| **Cache/Queue** | Redis 7 |
| **Real-time** | Socket.IO |
| **AI** | OpenAI GPT-4o-mini (Sentiment), Rule-based fallback |
| **Containerization** | Docker + Docker Compose |
| **Deployment** | Server at `192.168.100.157` (LAN) |

---

## 🤖 Audira Intelligent Core (AIC)

The system includes an autonomous intelligence layer:

### Active Intelligence Modules

```typescript
// SentimentService — analyzes user messages
const { sentiment, score } = await sentimentService.analyze(message);
// Returns: POSITIVE | NEUTRAL | NEGATIVE | URGENT

// SelfHealingService — monitors and restarts failed bots
// Checks every 5 min (prod) / 1 min (dev)
// Triggers: docker restart <container> on prolonged downtime

// Unified Identity — links WA + TG accounts via phone number
const profile = await userService.getUnifiedProfile(userId);
// Returns: { primary, linked[], identityScore }

// Shadow Override — admin can whisper through bot
socket.emit('agent:whisper', { platform, userId, text });

// FlowEngine — smart conversation flows with variable injection
// Supports: {{variable}} interpolation, IF/ELSE branching, auto-actions
```

---

## 📋 Coding Standards & Rules

### MANDATORY for ALL Code Changes

1. **File Headers**: Every new file MUST include:
   ```typescript
   /**
    * @module ServiceName
    * @description Brief description of what this module does.
    * @author Audira Engineering
    */
   ```

2. **Never Hardcode Secrets**: All credentials go in `.env`. Never commit `.env`. Use `config.OPENAI_API_KEY` pattern.

3. **Logger Pattern**: Always use injected `ILogger`, never `console.log`:
   ```typescript
   this.logger = logger.child({ service: 'my-service' });
   this.logger.info('Action performed', { context });
   ```

4. **Error Boundaries**: All async operations must have try/catch. Critical paths must log via logger.error.

5. **TypeScript Strict**: No `any` without explicit justification comment. Prefer proper interfaces.

6. **Database Access**: 
   - Use Prisma via injected `PrismaClient` only
   - Batch queries where possible (avoid N+1)
   - Index all foreign keys and frequently queried fields

7. **Service Pattern**: All new services follow constructor injection:
   ```typescript
   constructor(private db: PrismaClient, private logger: ILogger) {
     this.logger = logger.child({ service: 'ServiceName' });
   }
   ```

8. **Socket Events**: New socket events in `live-chat/index.ts` must be handled in both `telegram/src/index.ts` AND `whatsapp/src/index.ts`.

---

## 🚀 Common Operations

### Local Development

```bash
# Install dependencies
pnpm install

# Start all services (dev mode)
./AUDIRA_START.bat

# TypeScript build check only
pnpm build --filter=@pjtaudirabot/services

# Run specific package
pnpm --filter @pjtaudirabot/api dev
```

### Git Workflow

```bash
# Standard save & push (use this, not raw git commands)
./SAVE.bat

# Check what's changed
git status --short

# Log last 5 commits
git log --oneline -5
```

### Server Control (via SSH: 192.168.100.157)

```bash
# Check running containers
docker ps

# Restart specific bot
docker restart audira-telegram
docker restart audira-whatsapp

# View logs
docker logs audira-api --tail 100

# Full rebuild & redeploy
./scripts/server-control.ps1 -Action restart
```

---

## 🔐 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram bot token |
| `OPENAI_API_KEY` | ⚡ | GPT-4o-mini for sentiment AI (optional, has fallback) |
| `GOOGLE_SHEETS_ENABLED` | ⚙️ | Enable Google Sheets sync |
| `NODE_ENV` | ⚙️ | `development` or `production` (affects self-healing) |
| `ADMIN_GROUP_JIDS` | ⚙️ | WhatsApp admin group JIDs (comma-separated) |
| `TERMINAL_PORT_TELEGRAM` | ⚙️ | Override terminal port for Telegram bot |
| `TERMINAL_PORT_WHATSAPP` | ⚙️ | Override terminal port for WhatsApp bot |

---

## 🎯 Skill Activation Guide

### When to Use Specific Skills

| Situation | Activate Skill |
|-----------|---------------|
| Adding new API endpoint | `senior-backend` + `code-reviewer` |
| Building new dashboard page/component | `senior-frontend` + `code-reviewer` |
| Docker/deployment/CI issues | `senior-devops` + `incident-commander` |
| New bot command or service | `senior-fullstack` + `tdd-guide` |
| Security concern / secret management | `senior-secops` |
| Server outage / bot downtime | `incident-commander` |
| Code quality audit | `code-reviewer` |

### Manual Skill Reference

To read a skill directly:
```
./claude-skills-main/engineering-team/<skill-name>/SKILL.md
```

---

## ⚠️ Anti-Patterns (Never Do This)

- ❌ Direct `console.log` anywhere — use `this.logger`
- ❌ New schema models without `@@index` on foreign keys
- ❌ Hardcoded ports — always use `getPortRegistry()` or env vars
- ❌ Modifying `.env` directly — update `.env.example` only
- ❌ Direct `docker` commands in code — use `SelfHealingService` or `DevOpsService`
- ❌ New socket events without handlers in BOTH bots
- ❌ Importing `AutomationService` directly in `bootstrap.ts` — it has been replaced with pattern using `index.ts` re-exports

---

**Last Updated:** April 19, 2026  
**AIC Version:** v2.0 (Cognitive + Self-Healing + Unified Identity + Shadow Mode)  
**Skills Version:** claude-skills-main v2.3.0
