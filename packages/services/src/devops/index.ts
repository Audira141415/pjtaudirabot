import { ILogger } from '@pjtaudirabot/core';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import { GoogleSheetsService } from '../sheets';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

const EXEC_TIMEOUT_MS = 10_000;

export interface ServerStatus {
  hostname: string;
  uptime: string;
  loadAvg: number[];
  memory: { total: string; used: string; free: string; usedPercent: number };
  disk: Array<{ mount: string; size: string; used: string; avail: string; usedPercent: string }>;
  cpuCount: number;
  platform: string;
}

export interface RecoveryAttemptResult {
  service: string;
  attempted: boolean;
  success: boolean;
  message: string;
}

export class DevOpsService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private sheets: GoogleSheetsService | null,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'devops' });
  }

  /**
   * Get system status (works cross-platform).
   */
  async getServerStatus(): Promise<ServerStatus> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const status: ServerStatus = {
      hostname: os.hostname(),
      uptime: this.formatUptime(os.uptime()),
      loadAvg: os.loadavg(),
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        usedPercent: Math.round((usedMem / totalMem) * 100),
      },
      disk: [],
      cpuCount: os.cpus().length,
      platform: `${os.platform()} ${os.release()}`,
    };

    // Try to get disk info
    try {
      if (os.platform() === 'win32') {
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption', { timeout: EXEC_TIMEOUT_MS });
        const lines = stdout.trim().split('\n').slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const caption = parts[0];
            const free = parseInt(parts[1], 10);
            const size = parseInt(parts[2], 10);
            if (!isNaN(size) && size > 0) {
              status.disk.push({
                mount: caption,
                size: this.formatBytes(size),
                used: this.formatBytes(size - free),
                avail: this.formatBytes(free),
                usedPercent: `${Math.round(((size - free) / size) * 100)}%`,
              });
            }
          }
        }
      } else {
        const { stdout } = await execAsync('df -h --output=target,size,used,avail,pcent 2>/dev/null || df -h', { timeout: EXEC_TIMEOUT_MS });
        const lines = stdout.trim().split('\n').slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            status.disk.push({
              mount: parts[0],
              size: parts[1],
              used: parts[2],
              avail: parts[3],
              usedPercent: parts[4],
            });
          }
        }
      }
    } catch {
      // Disk info is best-effort
    }

    return status;
  }

  /**
   * List running Docker containers.
   */
  async dockerPs(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
        { timeout: EXEC_TIMEOUT_MS }
      );
      return stdout.trim() || 'No running containers.';
    } catch (error) {
      return 'Docker is not available or not running.';
    }
  }

  /**
   * Get Docker container stats.
   */
  async dockerStats(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        'docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"',
        { timeout: EXEC_TIMEOUT_MS }
      );
      return stdout.trim() || 'No containers running.';
    } catch {
      return 'Docker is not available.';
    }
  }

  /**
   * Get last N lines of a service log.
   */
  async getServiceLogs(service: string, lines: number = 50): Promise<string> {
    // Sanitize service name to prevent command injection
    const safeName = service.replace(/[^a-zA-Z0-9_.-]/g, '');
    if (safeName !== service) {
      return 'Invalid service name.';
    }

    try {
      // Try Docker logs first
      const { stdout } = await execAsync(
        `docker logs --tail ${lines} ${safeName} 2>&1`,
        { timeout: EXEC_TIMEOUT_MS }
      );
      return stdout.trim() || `No logs for ${safeName}.`;
    } catch {
      try {
        // Try journalctl as fallback
        const { stdout } = await execAsync(
          `journalctl -u ${safeName} -n ${lines} --no-pager 2>&1`,
          { timeout: EXEC_TIMEOUT_MS }
        );
        return stdout.trim() || `No logs for ${safeName}.`;
      } catch {
        return `Could not fetch logs for '${safeName}'. Service not found.`;
      }
    }
  }

  /**
   * Check if key services are running.
   */
  async healthCheck(): Promise<Array<{ service: string; status: 'up' | 'down'; details?: string }>> {
    const checks: Array<{ service: string; status: 'up' | 'down'; details?: string }> = [];

    // Check Docker
    try {
      await execAsync('docker info', { timeout: EXEC_TIMEOUT_MS });
      checks.push({ service: 'docker', status: 'up' });
    } catch {
      checks.push({ service: 'docker', status: 'down' });
    }

    // Check Nginx
    try {
      let nginxUp = false;

      try {
        const { stdout } = await execAsync('systemctl is-active nginx 2>/dev/null', { timeout: EXEC_TIMEOUT_MS });
        nginxUp = stdout.trim().toLowerCase() === 'active';
      } catch {
        // best-effort fallback checks below
      }

      if (!nginxUp) {
        try {
          const { stdout } = await execAsync('docker inspect -f "{{.State.Running}}" nginx 2>/dev/null', { timeout: EXEC_TIMEOUT_MS });
          nginxUp = stdout.trim().toLowerCase() === 'true';
        } catch {
          // keep false
        }
      }

      checks.push({ service: 'nginx', status: nginxUp ? 'up' : 'down' });
    } catch {
      checks.push({ service: 'nginx', status: 'down' });
    }

    // Check PostgreSQL
    try {
      await execAsync('pg_isready 2>/dev/null || docker exec postgres pg_isready 2>/dev/null', { timeout: EXEC_TIMEOUT_MS });
      checks.push({ service: 'postgresql', status: 'up' });
    } catch {
      checks.push({ service: 'postgresql', status: 'down' });
    }

    // Check Redis
    try {
      await execAsync('redis-cli ping 2>/dev/null || docker exec redis redis-cli ping 2>/dev/null', { timeout: EXEC_TIMEOUT_MS });
      checks.push({ service: 'redis', status: 'up' });
    } catch {
      checks.push({ service: 'redis', status: 'down' });
    }

    return checks;
  }

  /**
   * Try lightweight auto-recovery for known services when health check reports down.
   * Commands are hardcoded and never take user input.
   */
  async attemptAutoRecovery(downServices: string[]): Promise<RecoveryAttemptResult[]> {
    const plans: Record<string, string[]> = {
      docker: [
        'docker version',
      ],
      redis: [
        'docker restart redis',
        'redis-cli ping',
        'systemctl restart redis || systemctl restart redis-server',
      ],
      postgresql: [
        'docker restart postgres',
        'pg_isready',
        'systemctl restart postgresql || systemctl restart postgres',
      ],
      nginx: [
        'docker restart nginx',
        'nginx -s reload',
        'systemctl restart nginx',
      ],
    };

    const results: RecoveryAttemptResult[] = [];

    for (const service of downServices) {
      const commands = plans[service];
      if (!commands || commands.length === 0) {
        results.push({
          service,
          attempted: false,
          success: false,
          message: 'No recovery plan',
        });
        continue;
      }

      let recovered = false;
      let lastError = 'Unknown error';

      for (const command of commands) {
        try {
          await execAsync(command, { timeout: EXEC_TIMEOUT_MS });

          if (command.includes('restart') || command.includes('reload')) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          const verifyChecks = await this.healthCheck();
          const verified = verifyChecks.find((item) => item.service === service)?.status === 'up';

          if (verified) {
            recovered = true;
            results.push({
              service,
              attempted: true,
              success: true,
              message: `Recovered using: ${command}`,
            });
            break;
          }

          lastError = `Command ran but service still down: ${command}`;
        } catch (error) {
          lastError = (error as Error)?.message || String(error);
        }
      }

      if (!recovered) {
        results.push({
          service,
          attempted: true,
          success: false,
          message: `Recovery failed: ${lastError}`,
        });
      }
    }

    return results;
  }

  /**
   * Format server status for chat.
   */
  formatStatus(status: ServerStatus): string {
    let msg = `🖥️ *Server Status*\n\n`;
    msg += `📛 Host: ${status.hostname}\n`;
    msg += `⏱️ Uptime: ${status.uptime}\n`;
    msg += `🔧 Platform: ${status.platform}\n`;
    msg += `💻 CPUs: ${status.cpuCount}\n`;
    msg += `📊 Load: ${status.loadAvg.map((l) => l.toFixed(2)).join(', ')}\n\n`;

    msg += `💾 *Memory*\n`;
    msg += `Total: ${status.memory.total}\n`;
    msg += `Used: ${status.memory.used} (${status.memory.usedPercent}%)\n`;
    msg += `Free: ${status.memory.free}\n`;

    if (status.disk.length > 0) {
      msg += `\n💿 *Disk*\n`;
      for (const d of status.disk) {
        msg += `${d.mount}: ${d.used}/${d.size} (${d.usedPercent})\n`;
      }
    }

    return msg;
  }

  /**
   * Format health check for chat.
   */
  formatHealthCheck(checks: Array<{ service: string; status: 'up' | 'down' }>): string {
    let msg = `🏥 *Health Check*\n\n`;
    for (const c of checks) {
      const icon = c.status === 'up' ? '🟢' : '🔴';
      msg += `${icon} ${c.service}: ${c.status.toUpperCase()}\n`;
    }
    return msg;
  }

  /**
   * Log a server event to DB and Sheets.
   */
  async logServerEvent(
    service: string,
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const log = await this.db.serverLog.create({
      data: {
        hostname: os.hostname(),
        service,
        logLevel: level,
        message,
        metadata: (metadata ?? {}) as any,
      },
    });

    if (this.sheets?.isAvailable()) {
      this.sheets.appendToSheet('incidents', {
        ID: log.id,
        User: '',
        Title: `[ServerLog] ${log.service}: ${log.message}`,
        Issue: `hostname=${log.hostname} level=${log.logLevel}`,
        'Root Cause': '',
        Solution: '',
        'Created At': log.createdAt.toISOString(),
      }).catch((err) => this.logger.error('Sheet sync failed', err));
    }
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(1)} ${units[i]}`;
  }
}
