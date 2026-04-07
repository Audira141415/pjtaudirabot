import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { DevOpsService } from '../devops';

/**
 * !server - Show server status
 */
export class ServerStatusCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private devops: DevOpsService) {
    super(logger);
  }

  getName(): string { return 'server'; }
  getDescription(): string { return 'Show server status (CPU, memory, disk)'; }
  getCategory(): string { return 'devops'; }

  getRequiredRole(): string { return 'moderator'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    const status = await this.devops.getServerStatus();
    return this.createResult(true, this.devops.formatStatus(status));
  }
}

/**
 * !docker - List Docker containers
 */
export class DockerCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private devops: DevOpsService) {
    super(logger);
  }

  getName(): string { return 'docker'; }
  getDescription(): string { return 'Show Docker containers (ps/stats)'; }
  getCategory(): string { return 'devops'; }

  getRequiredRole(): string { return 'moderator'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!docker\s*/i, '').trim().toLowerCase();

    if (args === 'stats') {
      const stats = await this.devops.dockerStats();
      return this.createResult(true, `🐳 *Docker Stats*\n\n\`\`\`\n${stats}\n\`\`\``);
    }

    // Default: docker ps
    const ps = await this.devops.dockerPs();
    return this.createResult(true, `🐳 *Docker Containers*\n\n\`\`\`\n${ps}\n\`\`\``);
  }
}

/**
 * !logs <service> - Get service logs
 */
export class LogsCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private devops: DevOpsService) {
    super(logger);
  }

  getName(): string { return 'logs'; }
  getDescription(): string { return 'Get service logs (e.g. !logs nginx)'; }
  getCategory(): string { return 'devops'; }

  getRequiredRole(): string { return 'moderator'; }

  async validate(input: string): Promise<void> {
    const service = input.replace(/^!logs\s*/i, '').trim();
    if (!service) throw new Error('Usage: !logs <service_name> [lines]\nExample: !logs nginx 100');
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!logs\s+/i, '').trim().split(/\s+/);
    const service = args[0];
    const lines = parseInt(args[1], 10) || 50;

    const logs = await this.devops.getServiceLogs(service, Math.min(lines, 200));

    // Truncate if too long for chat
    const truncated = logs.length > 2000 ? logs.substring(0, 2000) + '\n...(truncated)' : logs;

    return this.createResult(true, `📋 *Logs: ${service}* (last ${lines} lines)\n\n\`\`\`\n${truncated}\n\`\`\``);
  }
}

/**
 * !health - Health check of key services
 */
export class HealthCheckCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private devops: DevOpsService) {
    super(logger);
  }

  getName(): string { return 'health'; }
  getDescription(): string { return 'Health check all services'; }
  getCategory(): string { return 'devops'; }
  getRequiredRole(): string { return 'moderator'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    const checks = await this.devops.healthCheck();
    return this.createResult(true, this.devops.formatHealthCheck(checks));
  }
}

/**
 * !solo-health - One-screen reliability snapshot for solo operator
 */
export class SoloHealthCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private devops: DevOpsService) {
    super(logger);
  }

  getName(): string { return 'solo-health'; }
  getDescription(): string { return 'Solo operator reliability snapshot (health + server load)'; }
  getCategory(): string { return 'devops'; }
  getRequiredRole(): string { return 'moderator'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const [checks, status] = await Promise.all([
        this.devops.healthCheck(),
        this.devops.getServerStatus(),
      ]);

      const downServices = checks.filter((c) => c.status === 'down').map((c) => c.service);
      const memHigh = status.memory.usedPercent >= 85;
      const loadHigh = status.loadAvg[0] > status.cpuCount;
      const diskHigh = status.disk.some((d) => {
        const pct = Number.parseInt((d.usedPercent ?? '').replace('%', ''), 10);
        return Number.isFinite(pct) && pct >= 90;
      });

      const critical = downServices.length > 0 || diskHigh;
      const warning = !critical && (memHigh || loadHigh);
      const headline = critical ? '🚨 *SOLO OPS: CRITICAL*' : warning ? '⚠️ *SOLO OPS: WARNING*' : '✅ *SOLO OPS: STABLE*';

      const lines = [
        headline,
        '',
        `🖥️ Host: ${status.hostname}`,
        `⏱️ Uptime: ${status.uptime}`,
        `💾 Memory: ${status.memory.usedPercent}% used`,
        `📊 Load(1m): ${status.loadAvg[0].toFixed(2)} / CPU ${status.cpuCount}`,
        `🏥 Services up: ${checks.filter((c) => c.status === 'up').length}/${checks.length}`,
        downServices.length > 0 ? `🔴 Down: ${downServices.join(', ')}` : '🟢 No critical service down',
        '',
        'Quick actions:',
        '• !health',
        '• !server',
        '• !logs <service>',
      ];

      return this.createResult(true, lines.join('\n'));
    } catch (error) {
      this.logger.error('Solo health check failed', error as Error);
      return this.createErrorResult('Failed to get solo reliability snapshot');
    }
  }
}
