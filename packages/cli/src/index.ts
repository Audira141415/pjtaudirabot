#!/usr/bin/env node

import { spawn, ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ─── Colors (no dependency) ──────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const LOGO = `
${c.cyan}╔═══════════════════════════════════════╗
║   ${c.bold}🤖 AudiraBot CLI${c.reset}${c.cyan}                     ║
║   Multi-Platform Bot Manager          ║
╚═══════════════════════════════════════╝${c.reset}
`;

const ROOT = findProjectRoot();

function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

// ─── Process Management ──────────────────────────────────────
const children: Map<string, ChildProcess> = new Map();

function startService(name: string, cmd: string, args: string[], cwd: string): void {
  if (children.has(name)) {
    console.log(`${c.yellow}⚠ ${name} is already running${c.reset}`);
    return;
  }

  console.log(`${c.green}▶ Starting ${c.bold}${name}${c.reset}${c.green}...${c.reset}`);

  const child = spawn(cmd, args, {
    cwd,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      console.log(`${c.dim}[${name}]${c.reset} ${line}`);
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      console.log(`${c.red}[${name}]${c.reset} ${line}`);
    }
  });

  child.on('exit', (code) => {
    children.delete(name);
    if (code !== 0 && code !== null) {
      console.log(`${c.red}✗ ${name} exited with code ${code}${c.reset}`);
    } else {
      console.log(`${c.dim}■ ${name} stopped${c.reset}`);
    }
  });

  children.set(name, child);
}

function stopService(name: string): boolean {
  const child = children.get(name);
  if (!child) {
    console.log(`${c.yellow}⚠ ${name} is not running${c.reset}`);
    return false;
  }

  console.log(`${c.yellow}■ Stopping ${name}...${c.reset}`);
  child.kill('SIGTERM');
  children.delete(name);
  return true;
}

function stopAll(): void {
  if (children.size === 0) {
    console.log(`${c.dim}No running services${c.reset}`);
    return;
  }
  for (const name of children.keys()) {
    stopService(name);
  }
}

// ─── Commands ────────────────────────────────────────────────

function cmdStart(service?: string): void {
  const tsNode = 'npx ts-node';

  const services: Record<string, { cmd: string; args: string[]; cwd: string }> = {
    api: {
      cmd: tsNode,
      args: ['src/index.ts'],
      cwd: path.join(ROOT, 'packages/api'),
    },
    whatsapp: {
      cmd: tsNode,
      args: ['src/index.ts'],
      cwd: path.join(ROOT, 'packages/bots/whatsapp'),
    },
    telegram: {
      cmd: tsNode,
      args: ['src/index.ts'],
      cwd: path.join(ROOT, 'packages/bots/telegram'),
    },
  };

  if (service) {
    const svc = services[service];
    if (!svc) {
      console.log(`${c.red}✗ Unknown service: ${service}${c.reset}`);
      console.log(`  Available: ${Object.keys(services).join(', ')}`);
      return;
    }
    startService(service, svc.cmd, svc.args, svc.cwd);
  } else {
    // Start all
    for (const [name, svc] of Object.entries(services)) {
      startService(name, svc.cmd, svc.args, svc.cwd);
    }
  }
}

function cmdStop(service?: string): void {
  if (service) {
    stopService(service);
  } else {
    stopAll();
  }
}

function cmdStatus(): void {
  console.log(`\n${c.bold}Service Status:${c.reset}\n`);

  // Read port config from env (defaults match config schema)
  const portMap: Record<string, number> = {
    api: parseInt(process.env.API_PORT || '4000', 10),
    whatsapp: parseInt(process.env.WHATSAPP_PORT || '4020', 10),
    telegram: parseInt(process.env.TELEGRAM_PORT || '4010', 10),
  };

  const allServices = ['api', 'whatsapp', 'telegram'];
  for (const name of allServices) {
    const running = children.has(name);
    const icon = running ? `${c.green}●` : `${c.red}○`;
    const status = running ? `${c.green}running` : `${c.dim}stopped`;
    const pid = running ? ` (PID: ${children.get(name)?.pid})` : '';
    const port = `${c.cyan}:${portMap[name]}${c.reset}`;
    console.log(`  ${icon} ${c.bold}${name.padEnd(12)}${c.reset} ${status}${c.dim}${pid}${c.reset}  ${port}`);
  }

  console.log(`\n${c.bold}Port Allocations:${c.reset}`);
  console.log(`  API Server      → ${c.cyan}:${portMap.api}${c.reset}`);
  console.log(`  Telegram Bot    → ${c.cyan}:${portMap.telegram}${c.reset}`);
  console.log(`  WhatsApp Bot    → ${c.cyan}:${portMap.whatsapp}${c.reset}`);
  console.log(`  Dashboard Dev   → ${c.cyan}:${parseInt(process.env.DASHBOARD_PORT || '3000', 10)}${c.reset}`);
  console.log(`  Dynamic Range   → ${c.cyan}:${process.env.BOT_PORT_RANGE_START || '4100'}-${process.env.BOT_PORT_RANGE_END || '4199'}${c.reset}`);
  console.log();
}

function cmdBuild(): void {
  console.log(`${c.cyan}🔨 Building all packages...${c.reset}\n`);

  const packages = ['core', 'config', 'database', 'services', 'api', 'cli'];
  const botPackages = ['bots/whatsapp', 'bots/telegram'];

  for (const pkg of [...packages, ...botPackages]) {
    const pkgPath = path.join(ROOT, 'packages', pkg);
    const tsconfigPath = path.join(pkgPath, 'tsconfig.json');

    if (!fs.existsSync(tsconfigPath)) {
      console.log(`${c.dim}  ⏭ ${pkg} (no tsconfig)${c.reset}`);
      continue;
    }

    process.stdout.write(`  ${c.dim}Building ${pkg}...${c.reset} `);
    try {
      execSync(`npx tsc -p ${tsconfigPath}`, { cwd: ROOT, stdio: 'pipe' });
      console.log(`${c.green}✓${c.reset}`);
    } catch (error) {
      console.log(`${c.red}✗${c.reset}`);
      const err = error as { stderr?: Buffer };
      if (err.stderr) {
        console.log(err.stderr.toString());
      }
    }
  }

  console.log(`\n${c.green}Build complete!${c.reset}`);
}

function cmdDbMigrate(): void {
  console.log(`${c.cyan}🗄️ Running database migrations...${c.reset}\n`);
  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.join(ROOT, 'packages/database'),
      stdio: 'inherit',
    });
  } catch {
    console.log(`${c.red}✗ Migration failed${c.reset}`);
  }
}

function cmdDbStudio(): void {
  console.log(`${c.cyan}🗄️ Opening Prisma Studio...${c.reset}\n`);
  startService('prisma-studio', 'npx', ['prisma', 'studio'], path.join(ROOT, 'packages/database'));
}

function cmdLogs(service?: string): void {
  if (service) {
    const child = children.get(service);
    if (!child) {
      console.log(`${c.yellow}⚠ ${service} is not running — start it first${c.reset}`);
      return;
    }
    console.log(`${c.dim}Attaching to ${service} logs (Ctrl+C to detach)...${c.reset}\n`);
  } else {
    console.log(`${c.dim}Watching all logs (Ctrl+C to stop)...${c.reset}\n`);
  }
}

function cmdHelp(): void {
  console.log(`
${c.bold}Usage:${c.reset} audirabot ${c.cyan}<command>${c.reset} [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}start${c.reset} [service]     Start all services or a specific one
  ${c.cyan}stop${c.reset} [service]      Stop all services or a specific one
  ${c.cyan}restart${c.reset} [service]   Restart services
  ${c.cyan}status${c.reset}              Show service status & port allocations
  ${c.cyan}build${c.reset}               Build all TypeScript packages
  ${c.cyan}db:migrate${c.reset}          Run database migrations
  ${c.cyan}db:studio${c.reset}           Open Prisma Studio
  ${c.cyan}logs${c.reset} [service]      Show service logs
  ${c.cyan}dashboard${c.reset}           Start web dashboard dev server
  ${c.cyan}help${c.reset}                Show this help

${c.bold}Services:${c.reset}
  ${c.green}api${c.reset}        Fastify API server       (default :4000)
  ${c.green}whatsapp${c.reset}   WhatsApp bot (Baileys)   (default :4020)
  ${c.green}telegram${c.reset}   Telegram bot (Telegraf)  (default :4010)

${c.bold}Port Configuration (env vars):${c.reset}
  API_PORT              API server port           (default: 4000)
  TELEGRAM_PORT         Telegram health endpoint  (default: 4010)
  WHATSAPP_PORT         WhatsApp health endpoint  (default: 4020)
  DASHBOARD_PORT        Dashboard dev server      (default: 3000)
  BOT_PORT_RANGE_START  Dynamic range start       (default: 4100)
  BOT_PORT_RANGE_END    Dynamic range end         (default: 4199)

${c.bold}Examples:${c.reset}
  audirabot start               ${c.dim}# Start all services${c.reset}
  audirabot start api            ${c.dim}# Start API only${c.reset}
  audirabot start whatsapp       ${c.dim}# Start WhatsApp bot${c.reset}
  audirabot stop telegram        ${c.dim}# Stop Telegram bot${c.reset}
  audirabot status               ${c.dim}# Check status + ports${c.reset}
  audirabot build                ${c.dim}# Build all packages${c.reset}
  audirabot db:migrate           ${c.dim}# Run DB migrations${c.reset}
`);
}

function cmdDashboard(): void {
  console.log(`${c.cyan}🌐 Starting Web Dashboard...${c.reset}\n`);
  const dashboardPath = path.join(ROOT, 'packages/dashboard');

  if (!fs.existsSync(dashboardPath)) {
    console.log(`${c.red}✗ Dashboard package not found at ${dashboardPath}${c.reset}`);
    return;
  }

  startService('dashboard', 'npx', ['vite', '--host'], dashboardPath);
}

// ─── Interactive Mode ────────────────────────────────────────

async function interactiveMode(): Promise<void> {
  console.log(LOGO);
  console.log(`${c.dim}Type "help" for commands, "exit" to quit${c.reset}\n`);

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${c.cyan}audirabot${c.reset} ${c.dim}>${c.reset} `,
  });

  rl.prompt();

  rl.on('line', (line: string) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const arg = parts[1];

    switch (cmd) {
      case 'start':
        cmdStart(arg);
        break;
      case 'stop':
        cmdStop(arg);
        break;
      case 'restart':
        cmdStop(arg);
        setTimeout(() => cmdStart(arg), 1000);
        break;
      case 'status':
        cmdStatus();
        break;
      case 'build':
        cmdBuild();
        break;
      case 'db:migrate':
        cmdDbMigrate();
        break;
      case 'db:studio':
        cmdDbStudio();
        break;
      case 'logs':
        cmdLogs(arg);
        break;
      case 'dashboard':
        cmdDashboard();
        break;
      case 'help':
      case '?':
        cmdHelp();
        break;
      case 'exit':
      case 'quit':
      case 'q':
        stopAll();
        console.log(`\n${c.dim}Goodbye! 👋${c.reset}\n`);
        process.exit(0);
        break;
      case '':
      case undefined:
        break;
      default:
        console.log(`${c.red}Unknown command: ${cmd}${c.reset}. Type "help" for available commands.`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    stopAll();
    process.exit(0);
  });
}

// ─── Entry Point ─────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  // Interactive mode
  interactiveMode();
} else {
  // Single command mode
  const cmd = args[0];
  const arg = args[1];

  switch (cmd) {
    case 'start':
      cmdStart(arg);
      // Keep alive
      process.on('SIGINT', () => { stopAll(); process.exit(0); });
      process.on('SIGTERM', () => { stopAll(); process.exit(0); });
      break;
    case 'stop':
      cmdStop(arg);
      break;
    case 'restart':
      cmdStop(arg);
      setTimeout(() => cmdStart(arg), 1000);
      process.on('SIGINT', () => { stopAll(); process.exit(0); });
      break;
    case 'status':
      cmdStatus();
      break;
    case 'build':
      cmdBuild();
      break;
    case 'db:migrate':
      cmdDbMigrate();
      break;
    case 'db:studio':
      cmdDbStudio();
      break;
    case 'logs':
      cmdLogs(arg);
      break;
    case 'dashboard':
      cmdDashboard();
      process.on('SIGINT', () => { stopAll(); process.exit(0); });
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(LOGO);
      cmdHelp();
      break;
    default:
      console.log(`${c.red}Unknown command: ${cmd}${c.reset}`);
      cmdHelp();
      process.exit(1);
  }
}
