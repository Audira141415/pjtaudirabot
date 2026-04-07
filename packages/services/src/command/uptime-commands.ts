import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { UptimeMonitorService } from '../uptime-monitor';
import { UptimeCheckType } from '@prisma/client';

// ── !monitor-add ──

export class MonitorAddCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private uptimeService: UptimeMonitorService) {
    super(logger);
  }

  getName(): string { return 'monitor-add'; }
  getDescription(): string { return 'Add a monitoring target: !monitor-add <name> <host> [ping|tcp|http|https] [port] [interval-sec]'; }
  getCategory(): string { return 'monitoring'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const parts = (context.input ?? '').trim().split(/\s+/);
      if (parts.length < 2) {
        return this.createResult(false, '❌ Format: !monitor-add <name> <host> [ping|tcp|http|https] [port] [interval-sec]');
      }

      const [name, host, typeStr, portStr, intervalStr] = parts;
      const validTypes: Record<string, UptimeCheckType> = {
        ping: 'PING', tcp: 'TCP', http: 'HTTP', https: 'HTTPS',
      };
      const checkType = validTypes[(typeStr ?? 'ping').toLowerCase()] ?? 'PING';
      const port = portStr ? parseInt(portStr, 10) : undefined;
      const intervalSec = intervalStr ? parseInt(intervalStr, 10) : 60;

      const target = await this.uptimeService.addTarget({
        name,
        host,
        checkType,
        port: (port && !isNaN(port)) ? port : undefined,
        intervalSec: isNaN(intervalSec) ? 60 : intervalSec,
        createdById: context.user?.id,
      });

      return this.createResult(true, [
        `✅ *Monitor target ditambahkan*`,
        `• Name: ${target.name}`,
        `• Host: ${target.host}`,
        `• Type: ${target.checkType}`,
        `• Port: ${target.port ?? '-'}`,
        `• Interval: ${target.intervalSec}s`,
        `• Auto-ticket: ${target.autoTicket ? 'Ya' : 'Tidak'}`,
      ].join('\n'));
    } catch (error: any) {
      if (error.code === 'P2002') {
        return this.createResult(false, '❌ Target dengan nama tersebut sudah ada');
      }
      this.logger.error('monitor-add failed', error);
      return this.createErrorResult('Gagal menambahkan target');
    }
  }
}

// ── !monitor-list ──

export class MonitorListCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private uptimeService: UptimeMonitorService) {
    super(logger);
  }

  getName(): string { return 'monitor-list'; }
  getDescription(): string { return 'List all monitoring targets and status'; }
  getCategory(): string { return 'monitoring'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const summary = await this.uptimeService.getSummary();

      if (summary.total === 0) {
        return this.createResult(true, '📡 Belum ada target monitoring. Gunakan !monitor-add untuk menambahkan.');
      }

      const statusIcon = (s: string) =>
        s === 'UP' ? '🟢' : s === 'DOWN' ? '🔴' : s === 'DEGRADED' ? '🟡' : '⚪';

      const lines = [
        `📡 *MONITORING STATUS* (${summary.total} target)`,
        `🟢 Up: ${summary.up}  🔴 Down: ${summary.down}  🟡 Degraded: ${summary.degraded}  ⚪ Unknown: ${summary.unknown}`,
        `📊 Avg Uptime (24h): ${summary.avgUptime}%`,
        ``,
      ];

      for (const t of summary.targets) {
        const lastCheck = t.lastCheckAt
          ? t.lastCheckAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-';
        lines.push(`${statusIcon(t.status)} *${t.name}* (${t.host})`);
        lines.push(`   ${t.checkType} | uptime: ${t.uptimePercent}% | last: ${lastCheck}`);
      }

      return this.createResult(true, lines.join('\n'));
    } catch (error) {
      this.logger.error('monitor-list failed', error as Error);
      return this.createErrorResult('Gagal mengambil daftar monitor');
    }
  }
}

// ── !monitor-remove ──

export class MonitorRemoveCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private uptimeService: UptimeMonitorService) {
    super(logger);
  }

  getName(): string { return 'monitor-remove'; }
  getDescription(): string { return 'Remove a monitoring target: !monitor-remove <name>'; }
  getCategory(): string { return 'monitoring'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const name = (context.input ?? '').trim();
      if (!name) return this.createResult(false, '❌ Format: !monitor-remove <name>');

      await this.uptimeService.removeTarget(name);
      return this.createResult(true, `✅ Target *${name}* dihapus dari monitoring`);
    } catch {
      return this.createErrorResult('Target tidak ditemukan');
    }
  }
}

// ── !monitor-status ──

export class MonitorStatusCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private uptimeService: UptimeMonitorService) {
    super(logger);
  }

  getName(): string { return 'monitor-status'; }
  getDescription(): string { return 'Detailed status of a target: !monitor-status <name>'; }
  getCategory(): string { return 'monitoring'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const name = (context.input ?? '').trim();
      if (!name) return this.createResult(false, '❌ Format: !monitor-status <name>');

      const target = await this.uptimeService.getTargetStatus(name);
      if (!target) return this.createResult(false, `❌ Target *${name}* tidak ditemukan`);

      const statusIcon = target.status === 'UP' ? '🟢' : target.status === 'DOWN' ? '🔴' : target.status === 'DEGRADED' ? '🟡' : '⚪';

      const lines = [
        `${statusIcon} *${target.name}*`,
        `• Host: ${target.host}`,
        `• Type: ${target.checkType}${target.port ? `:${target.port}` : ''}`,
        `• Status: *${target.status}*`,
        `• Uptime (24h): ${target.uptimePercent}%`,
        `• Consecutive fails: ${target.consecutiveFails}/${target.retries}`,
        `• Last check: ${target.lastCheckAt?.toLocaleString('id-ID') ?? '-'}`,
        `• Last up: ${target.lastUpAt?.toLocaleString('id-ID') ?? '-'}`,
        `• Last down: ${target.lastDownAt?.toLocaleString('id-ID') ?? '-'}`,
        `• Auto-ticket: ${target.autoTicket ? 'Ya' : 'Tidak'}`,
        ``,
        `📋 *Recent Checks (last 10):*`,
      ];

      for (const c of target.checks) {
        const icon = c.status === 'UP' ? '✅' : c.status === 'DOWN' ? '❌' : '⚠️';
        const time = c.checkedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const latency = c.responseMs != null ? `${Math.round(c.responseMs)}ms` : '-';
        lines.push(`  ${icon} [${time}] ${c.status} ${latency}${c.errorMessage ? ` (${c.errorMessage})` : ''}`);
      }

      return this.createResult(true, lines.join('\n'));
    } catch (error) {
      this.logger.error('monitor-status failed', error as Error);
      return this.createErrorResult('Gagal mengambil status target');
    }
  }
}

// ── !monitor-pause / !monitor-resume ──

export class MonitorPauseCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private uptimeService: UptimeMonitorService) {
    super(logger);
  }

  getName(): string { return 'monitor-pause'; }
  getDescription(): string { return 'Pause monitoring: !monitor-pause <name>'; }
  getCategory(): string { return 'monitoring'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const name = (context.input ?? '').trim();
      if (!name) return this.createResult(false, '❌ Format: !monitor-pause <name>');
      await this.uptimeService.pauseTarget(name);
      return this.createResult(true, `⏸️ Monitoring *${name}* di-pause`);
    } catch {
      return this.createErrorResult('Target tidak ditemukan');
    }
  }
}

export class MonitorResumeCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private uptimeService: UptimeMonitorService) {
    super(logger);
  }

  getName(): string { return 'monitor-resume'; }
  getDescription(): string { return 'Resume monitoring: !monitor-resume <name>'; }
  getCategory(): string { return 'monitoring'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const name = (context.input ?? '').trim();
      if (!name) return this.createResult(false, '❌ Format: !monitor-resume <name>');
      await this.uptimeService.resumeTarget(name);
      return this.createResult(true, `▶️ Monitoring *${name}* dilanjutkan`);
    } catch {
      return this.createErrorResult('Target tidak ditemukan');
    }
  }
}
