import { PrismaClient, UptimeStatus, UptimeCheckType } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import net from 'node:net';

const execAsync = promisify(exec);

/** Latency thresholds (ms) — above this counts as DEGRADED */
const DEGRADED_THRESHOLD_MS = 500;

export interface UptimeCheckResult {
  status: UptimeStatus;
  responseMs: number | null;
  errorMessage: string | null;
}

export interface UptimeAlert {
  targetName: string;
  host: string;
  status: UptimeStatus;
  previousStatus: UptimeStatus;
  consecutiveFails: number;
  errorMessage: string | null;
  responseMs: number | null;
  autoTicketId: string | null;
}

export class UptimeMonitorService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'uptime-monitor' });
  }

  // ── Target management ──

  async addTarget(input: {
    name: string;
    host: string;
    port?: number;
    checkType?: UptimeCheckType;
    intervalSec?: number;
    timeoutMs?: number;
    retries?: number;
    autoTicket?: boolean;
    tags?: string[];
    createdById?: string;
  }) {
    return this.db.uptimeTarget.create({
      data: {
        name: input.name,
        host: input.host,
        port: input.port ?? null,
        checkType: input.checkType ?? 'PING',
        intervalSec: input.intervalSec ?? 60,
        timeoutMs: input.timeoutMs ?? 5000,
        retries: input.retries ?? 3,
        autoTicket: input.autoTicket ?? true,
        tags: input.tags ?? [],
        createdById: input.createdById,
      },
    });
  }

  async removeTarget(name: string) {
    return this.db.uptimeTarget.delete({ where: { name } });
  }

  async listTargets(activeOnly = true) {
    return this.db.uptimeTarget.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async pauseTarget(name: string) {
    return this.db.uptimeTarget.update({ where: { name }, data: { isActive: false } });
  }

  async resumeTarget(name: string) {
    return this.db.uptimeTarget.update({ where: { name }, data: { isActive: true } });
  }

  async getTargetStatus(name: string) {
    return this.db.uptimeTarget.findUnique({
      where: { name },
      include: { checks: { orderBy: { checkedAt: 'desc' }, take: 10 } },
    });
  }

  // ── Probing functions ──

  private async probePing(host: string, timeoutMs: number): Promise<UptimeCheckResult> {
    const start = Date.now();
    const isWindows = process.platform === 'win32';
    const cmd = isWindows
      ? `ping -n 1 -w ${timeoutMs} ${host}`
      : `ping -c 1 -W ${Math.ceil(timeoutMs / 1000)} ${host}`;

    try {
      const { stdout } = await execAsync(cmd, { timeout: timeoutMs + 2000 });
      const elapsed = Date.now() - start;

      // Extract RTT from ping output
      const rttMatch = isWindows
        ? stdout.match(/Average\s*=\s*(\d+)ms/i) ?? stdout.match(/time[=<](\d+)ms/i)
        : stdout.match(/time=([\d.]+)\s*ms/i);

      const responseMs = rttMatch ? parseFloat(rttMatch[1]) : elapsed;
      const status: UptimeStatus = responseMs > DEGRADED_THRESHOLD_MS ? 'DEGRADED' : 'UP';
      return { status, responseMs, errorMessage: null };
    } catch {
      return { status: 'DOWN', responseMs: null, errorMessage: 'Ping failed / timeout' };
    }
  }

  private async probeTcp(host: string, port: number, timeoutMs: number): Promise<UptimeCheckResult> {
    const start = Date.now();
    return new Promise<UptimeCheckResult>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        const responseMs = Date.now() - start;
        socket.destroy();
        resolve({
          status: responseMs > DEGRADED_THRESHOLD_MS ? 'DEGRADED' : 'UP',
          responseMs,
          errorMessage: null,
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ status: 'DOWN', responseMs: null, errorMessage: `TCP timeout after ${timeoutMs}ms` });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ status: 'DOWN', responseMs: null, errorMessage: `TCP error: ${err.message}` });
      });

      socket.connect(port, host);
    });
  }

  private async probeHttp(host: string, port: number | null, timeoutMs: number, https = false): Promise<UptimeCheckResult> {
    const protocol = https ? 'https' : 'http';
    const portPart = port ? `:${port}` : '';
    const url = `${protocol}://${host}${portPart}/`;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timer);
      const responseMs = Date.now() - start;

      if (response.ok || response.status < 500) {
        return {
          status: responseMs > DEGRADED_THRESHOLD_MS ? 'DEGRADED' : 'UP',
          responseMs,
          errorMessage: null,
        };
      }
      return { status: 'DOWN', responseMs, errorMessage: `HTTP ${response.status}` };
    } catch (err: any) {
      return { status: 'DOWN', responseMs: null, errorMessage: `HTTP error: ${err.message}` };
    }
  }

  /** Run a single check against a target */
  async checkTarget(targetId: string): Promise<UptimeAlert | null> {
    const target = await this.db.uptimeTarget.findUnique({ where: { id: targetId } });
    if (!target || !target.isActive) return null;

    // De-dup: skip if we checked recently (within half interval)
    const dedupeKey = `uptime:dedup:${targetId}`;
    const deduped = await this.redis.set(dedupeKey, '1', {
      NX: true,
      PX: Math.max(target.intervalSec * 500, 5000),
    });
    if (!deduped) return null;

    let result: UptimeCheckResult;
    switch (target.checkType) {
      case 'PING':
        result = await this.probePing(target.host, target.timeoutMs);
        break;
      case 'TCP':
        result = await this.probeTcp(target.host, target.port ?? 80, target.timeoutMs);
        break;
      case 'HTTP':
        result = await this.probeHttp(target.host, target.port, target.timeoutMs, false);
        break;
      case 'HTTPS':
        result = await this.probeHttp(target.host, target.port, target.timeoutMs, true);
        break;
      default:
        result = await this.probePing(target.host, target.timeoutMs);
    }

    // Persist check record
    await this.db.uptimeCheck.create({
      data: {
        targetId: target.id,
        status: result.status,
        responseMs: result.responseMs,
        errorMessage: result.errorMessage,
      },
    });

    // Update consecutive fail counter & status
    const previousStatus = target.status;
    const isDown = result.status === 'DOWN';
    const newFails = isDown ? target.consecutiveFails + 1 : 0;
    const effectiveStatus = isDown && newFails < target.retries ? previousStatus : result.status;

    const updateData: any = {
      consecutiveFails: newFails,
      lastCheckAt: new Date(),
      status: effectiveStatus,
    };

    if (result.status === 'UP' || result.status === 'DEGRADED') {
      updateData.lastUpAt = new Date();
    }
    if (result.status === 'DOWN' && previousStatus !== 'DOWN') {
      updateData.lastDownAt = new Date();
    }

    // Recalculate uptime percentage (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentChecks = await this.db.uptimeCheck.count({ where: { targetId: target.id, checkedAt: { gte: since } } });
    const upChecks = await this.db.uptimeCheck.count({ where: { targetId: target.id, checkedAt: { gte: since }, status: { in: ['UP', 'DEGRADED'] } } });
    updateData.uptimePercent = recentChecks > 0 ? Math.round((upChecks / recentChecks) * 10000) / 100 : 100;

    await this.db.uptimeTarget.update({ where: { id: target.id }, data: updateData });

    // Determine if we should alert
    const statusChanged = previousStatus !== effectiveStatus;
    const justWentDown = statusChanged && effectiveStatus === 'DOWN' && newFails >= target.retries;
    const justRecovered = statusChanged && effectiveStatus !== 'DOWN' && previousStatus === 'DOWN';

    if (!justWentDown && !justRecovered) return null;

    let autoTicketId: string | null = null;

    // Auto-create ticket on DOWN
    if (justWentDown && target.autoTicket) {
      try {
        // Find or use the creator's userId for ticket attribution
        const creatorId = target.createdById;
        if (!creatorId) {
          this.logger.warn('No createdById for auto-ticket, skipping ticket creation', { target: target.name });
        } else {
          const ticket = await this.db.ticket.create({
            data: {
              ticketNumber: `MON-${Date.now().toString(36).toUpperCase()}`,
              title: `[AUTO] ${target.name} DOWN`,
              customer: 'SYSTEM-MONITOR',
              description: `[AUTO] ${target.name} (${target.host}) is DOWN - ${result.errorMessage ?? 'unreachable'}`,
              problem: `${target.name} (${target.host}) unreachable - ${result.errorMessage ?? 'no response'}`,
              priority: 'CRITICAL',
              category: 'INCIDENT',
              status: 'OPEN',
              createdById: creatorId,
            },
          });
          autoTicketId = ticket.id;
          await this.db.uptimeTarget.update({ where: { id: target.id }, data: { lastTicketId: ticket.id } });
          this.logger.info('Auto-ticket created for DOWN target', { target: target.name, ticketId: ticket.id });
        }
      } catch (err) {
        this.logger.error('Failed to auto-create ticket', err as Error);
      }
    }

    // Auto-close ticket on recovery
    if (justRecovered && target.lastTicketId) {
      try {
        await this.db.ticket.update({
          where: { id: target.lastTicketId },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        await this.db.uptimeTarget.update({ where: { id: target.id }, data: { lastTicketId: null } });
        this.logger.info('Auto-resolved ticket for recovered target', { target: target.name });
      } catch {
        // ticket may already be resolved
      }
    }

    return {
      targetName: target.name,
      host: target.host,
      status: effectiveStatus,
      previousStatus,
      consecutiveFails: newFails,
      errorMessage: result.errorMessage,
      responseMs: result.responseMs,
      autoTicketId,
    };
  }

  /** Check all active targets and collect alerts */
  async checkAll(): Promise<UptimeAlert[]> {
    const targets = await this.db.uptimeTarget.findMany({ where: { isActive: true } });
    const alerts: UptimeAlert[] = [];

    for (const target of targets) {
      try {
        const alert = await this.checkTarget(target.id);
        if (alert) alerts.push(alert);
      } catch (err) {
        this.logger.error(`Check failed for ${target.name}`, err as Error);
      }
    }
    return alerts;
  }

  /** Get uptime summary across all targets */
  async getSummary() {
    const targets = await this.db.uptimeTarget.findMany({ where: { isActive: true } });
    const up = targets.filter((t) => t.status === 'UP' || t.status === 'DEGRADED').length;
    const down = targets.filter((t) => t.status === 'DOWN').length;
    const degraded = targets.filter((t) => t.status === 'DEGRADED').length;
    const unknown = targets.filter((t) => t.status === 'UNKNOWN').length;
    const avgUptime = targets.length > 0
      ? Math.round(targets.reduce((sum, t) => sum + t.uptimePercent, 0) / targets.length * 100) / 100
      : 100;

    return { total: targets.length, up, down, degraded, unknown, avgUptime, targets };
  }

  /** Purge old check records (retention) */
  async purgeOldChecks(retainDays = 30) {
    const cutoff = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);
    const result = await this.db.uptimeCheck.deleteMany({ where: { checkedAt: { lt: cutoff } } });
    this.logger.info('Purged old uptime checks', { deleted: result.count, retainDays });
    return result.count;
  }
}
