import { PrismaClient, TicketPriority, TicketCategory } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

/**
 * neuCentrIX SLA Configuration (migrated from bot old slaConfig.js)
 * L0: 2 hours (Critical/DOWN)
 * L1: 4 hours (Normal)
 * Response: 15 minutes all categories
 * Helpdesk: 15 min response
 * Smarthand: 30 min delivery
 * Fulfillment: 1 day / Network provisioning: 4 hours
 */
const SLA_TARGETS: Record<string, { responseMin: number; resolutionMin: number }> = {
  // Priority-based
  CRITICAL: { responseMin: 5, resolutionMin: 120 },   // 5 min / 2 hr
  HIGH:     { responseMin: 15, resolutionMin: 240 },   // 15 min / 4 hr
  MEDIUM:   { responseMin: 30, resolutionMin: 480 },   // 30 min / 8 hr
  LOW:      { responseMin: 60, resolutionMin: 2880 },  // 1 hr / 48 hr
  // Category overrides
  INCIDENT_CRITICAL: { responseMin: 5, resolutionMin: 120 },
  MAINTENANCE:       { responseMin: 60, resolutionMin: 1440 },
  REQUEST:           { responseMin: 60, resolutionMin: 2880 },
  // neuCentrIX-specific categories (from old slaConfig.js)
  HELPDESK:          { responseMin: 15, resolutionMin: 240 },   // 15 min response / 4 hr
  SMARTHAND:         { responseMin: 15, resolutionMin: 30 },    // 30 min delivery
  FULFILLMENT:       { responseMin: 60, resolutionMin: 1440 },  // 1 day delivery
  NETWORK_PROVISIONING: { responseMin: 60, resolutionMin: 240 }, // 4 hr provisioning
  VAM_SURVEILLANCE:  { responseMin: 60, resolutionMin: 60 },    // 1 hr visit response
};

const CRITICAL_KEYWORDS = [
  'down', 'outage', 'offline', 'crash', 'unreachable', 'mati total',
  'tidak bisa diakses', 'failure', 'emergency', 'putus', 'loss',
  // From old bot slaConfig.js L0 keywords
  'total failure', 'service down', 'network down', 'complete outage',
  'major incident', 'production down', 'server down', 'system down',
  'critical failure',
];

export class SLAService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    _redis: RedisClientType,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'sla' });
  }

  /** Determine SLA targets from priority + category + description */
  getSLATargets(priority: TicketPriority, category: TicketCategory, description?: string) {
    // Check critical keywords in description → override to CRITICAL timing
    if (description) {
      const lower = description.toLowerCase();
      const hasCritical = CRITICAL_KEYWORDS.some((kw) => lower.includes(kw));
      if (hasCritical) {
        return { ...SLA_TARGETS.CRITICAL, slaLevel: 'L0' };
      }
    }

    // Category override
    const catKey = `${category}_${priority}`;
    if (SLA_TARGETS[catKey]) {
      return { ...SLA_TARGETS[catKey], slaLevel: priority === 'CRITICAL' ? 'L0' : 'L1' };
    }
    if (SLA_TARGETS[category]) {
      return { ...SLA_TARGETS[category], slaLevel: 'L1' };
    }

    // Priority-based default
    const target = SLA_TARGETS[priority] ?? SLA_TARGETS.MEDIUM;
    return { ...target, slaLevel: priority === 'CRITICAL' ? 'L0' : 'L1' };
  }

  /** Start SLA tracking for a ticket */
  async startTracking(ticketId: string, priority: TicketPriority, category: TicketCategory, description?: string) {
    const targets = this.getSLATargets(priority, category, description);
    const now = new Date();

    const tracking = await this.db.sLATracking.create({
      data: {
        ticketId,
        responseTargetMin: targets.responseMin,
        resolutionTargetMin: targets.resolutionMin,
        responseDeadline: new Date(now.getTime() + targets.responseMin * 60_000),
        resolutionDeadline: new Date(now.getTime() + targets.resolutionMin * 60_000),
        slaLevel: targets.slaLevel,
      },
    });

    this.logger.info('SLA tracking started', {
      ticketId,
      responseMin: targets.responseMin,
      resolutionMin: targets.resolutionMin,
      slaLevel: targets.slaLevel,
    });
    return tracking;
  }

  /** Mark ticket as responded (picked up) */
  async markResponded(ticketId: string) {
    const tracking = await this.db.sLATracking.findUnique({ where: { ticketId } });
    if (!tracking || tracking.respondedAt) return tracking;

    const now = new Date();
    const responseTimeMin = (now.getTime() - tracking.createdAt.getTime()) / 60_000;
    const breached = now > tracking.responseDeadline;

    const updated = await this.db.sLATracking.update({
      where: { ticketId },
      data: { respondedAt: now, responseTimeMin, responseBreached: breached },
    });

    if (breached) {
      this.logger.warn('SLA response breached', { ticketId, responseTimeMin });
    } else {
      this.logger.info('SLA response met', { ticketId, responseTimeMin });
    }
    return updated;
  }

  /** Mark ticket as resolved */
  async markResolved(ticketId: string) {
    const tracking = await this.db.sLATracking.findUnique({ where: { ticketId } });
    if (!tracking || tracking.resolvedAt) return tracking;

    const now = new Date();
    const pauseOffset = (tracking.pausedDurationMin ?? 0) * 60_000;
    const effectiveStart = tracking.createdAt.getTime() + pauseOffset;
    const resolutionTimeMin = (now.getTime() - effectiveStart) / 60_000;
    const breached = now > tracking.resolutionDeadline;

    const updated = await this.db.sLATracking.update({
      where: { ticketId },
      data: { resolvedAt: now, resolutionTimeMin, resolutionBreached: breached },
    });

    if (breached) {
      this.logger.warn('SLA resolution breached', { ticketId, resolutionTimeMin });
    }
    return updated;
  }

  /** Check all active SLA trackings for warnings & breaches (cron job) */
  async checkAll(): Promise<{ warnings: string[]; breaches: string[] }> {
    const warnings: string[] = [];
    const breaches: string[] = [];
    const now = new Date();

    // Find un-responded tickets
    const unresponded = await this.db.sLATracking.findMany({
      where: { respondedAt: null, responseBreached: false, isPaused: false },
      include: { ticket: true },
    });

    for (const t of unresponded) {
      const remaining = t.responseDeadline.getTime() - now.getTime();
      const total = t.responseTargetMin * 60_000;

      if (remaining <= 0) {
        // Breach
        await this.db.sLATracking.update({
          where: { id: t.id },
          data: { responseBreached: true },
        });
        breaches.push(`🚨 Response SLA BREACHED: ${t.ticket.ticketNumber} (${t.ticket.customer ?? 'N/A'}) — tiket belum diambil! !take ${t.ticket.ticketNumber}`);
      } else if (remaining < total * 0.2 && !t.responseWarned) {
        // 80% threshold warning
        await this.db.sLATracking.update({
          where: { id: t.id },
          data: { responseWarned: true },
        });
        const minLeft = Math.ceil(remaining / 60_000);
        warnings.push(`⚠️ Response SLA warning: ${t.ticket.ticketNumber} — ${minLeft}m remaining`);
      }
    }

    // Find un-resolved tickets
    const unresolved = await this.db.sLATracking.findMany({
      where: { resolvedAt: null, resolutionBreached: false, isPaused: false },
      include: { ticket: true },
    });

    for (const t of unresolved) {
      const remaining = t.resolutionDeadline.getTime() - now.getTime();
      const total = t.resolutionTargetMin * 60_000;

      if (remaining <= 0) {
        await this.db.sLATracking.update({
          where: { id: t.id },
          data: { resolutionBreached: true },
        });
        breaches.push(`🚨 Resolution SLA BREACHED: ${t.ticket.ticketNumber} (${t.ticket.customer ?? 'N/A'}) [${t.ticket.status}] — selesaikan segera! !ticket-resolve ${t.ticket.ticketNumber} | <cause> | <solution>`);
      } else if (remaining < total * 0.2 && !t.resolutionWarned) {
        await this.db.sLATracking.update({
          where: { id: t.id },
          data: { resolutionWarned: true },
        });
        const minLeft = Math.ceil(remaining / 60_000);
        warnings.push(`⚠️ Resolution SLA warning: ${t.ticket.ticketNumber} — ${minLeft}m remaining`);
      }
    }

    if (breaches.length > 0 || warnings.length > 0) {
      this.logger.warn('SLA check results', { breaches: breaches.length, warnings: warnings.length });
    }
    return { warnings, breaches };
  }

  // ── Granular SLA Countdown ──
  // Thresholds for proactive warnings (minutes before deadline)
  private static readonly COUNTDOWN_THRESHOLDS = [60, 30, 15, 5, 1] as const;

  /**
   * Proactive SLA countdown — fires granular warnings at 60m, 30m, 15m, 5m, 1m
   * before breaching. Uses Redis to de-dup so each tier fires only once per ticket.
   * Call this frequently (every 1-2 minutes) for near-real-time warnings.
   */
  async checkCountdown(redis: RedisClientType): Promise<string[]> {
    const countdowns: string[] = [];
    const now = new Date();

    // All active SLA trackings (un-resolved, un-breached, not paused)
    const active = await this.db.sLATracking.findMany({
      where: { resolvedAt: null, isPaused: false },
      include: { ticket: true },
    });

    for (const t of active) {
      // Check response deadline
      if (!t.respondedAt && !t.responseBreached) {
        const respRemaining = t.responseDeadline.getTime() - now.getTime();
        const respMinLeft = Math.ceil(respRemaining / 60_000);

        if (respRemaining > 0) {
          for (const threshold of SLAService.COUNTDOWN_THRESHOLDS) {
            if (respMinLeft <= threshold) {
              const dedupeKey = `sla:countdown:resp:${t.id}:${threshold}`;
              const isNew = await redis.set(dedupeKey, '1', { NX: true, EX: 7200 });
              if (isNew) {
                const urgency = threshold <= 5 ? '🔴' : threshold <= 15 ? '🟠' : '🟡';
                countdowns.push(
                  `${urgency} *SLA COUNTDOWN* — Response\n` +
                  `Tiket: *${t.ticket.ticketNumber}*\n` +
                  `Customer: ${t.ticket.customer ?? '-'}\n` +
                  `⏱️ Sisa waktu: *${this.formatCountdown(respRemaining)}*\n` +
                  `Deadline: ${t.responseDeadline.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}\n` +
                  `_Aksi: !ticket-assign ${t.ticket.ticketNumber} atau !ticket-status ${t.ticket.ticketNumber}_`
                );
              }
              break; // Only fire the lowest applicable threshold
            }
          }
        }
      }

      // Check resolution deadline
      if (!t.resolutionBreached) {
        const resRemaining = t.resolutionDeadline.getTime() - now.getTime();
        const resMinLeft = Math.ceil(resRemaining / 60_000);

        if (resRemaining > 0) {
          for (const threshold of SLAService.COUNTDOWN_THRESHOLDS) {
            if (resMinLeft <= threshold) {
              const dedupeKey = `sla:countdown:res:${t.id}:${threshold}`;
              const isNew = await redis.set(dedupeKey, '1', { NX: true, EX: 7200 });
              if (isNew) {
                const urgency = threshold <= 5 ? '🔴' : threshold <= 15 ? '🟠' : '🟡';
                countdowns.push(
                  `${urgency} *SLA COUNTDOWN* — Resolution\n` +
                  `Tiket: *${t.ticket.ticketNumber}*\n` +
                  `Customer: ${t.ticket.customer ?? '-'}\n` +
                  `⏱️ Sisa waktu: *${this.formatCountdown(resRemaining)}*\n` +
                  `Deadline: ${t.resolutionDeadline.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}\n` +
                  `_Aksi: !ticket-resolve ${t.ticket.ticketNumber} | <root-cause> | <solution>_`
                );
              }
              break;
            }
          }
        }
      }
    }

    if (countdowns.length > 0) {
      this.logger.warn('SLA countdown warnings fired', { count: countdowns.length });
    }
    return countdowns;
  }

  /** Format remaining time as human-readable string */
  private formatCountdown(remainingMs: number): string {
    const totalMin = Math.ceil(remainingMs / 60_000);
    if (totalMin < 1) return '< 1 menit';
    if (totalMin < 60) return `${totalMin} menit`;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return mins > 0 ? `${hours}j ${mins}m` : `${hours} jam`;
  }

  /** Get SLA compliance stats */
  async getComplianceStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const all = await this.db.sLATracking.findMany({ where });
    const total = all.length;
    if (total === 0) return { total: 0, responseMetPct: 100, resolutionMetPct: 100, avgResponseMin: 0, avgResolutionMin: 0 };

    const responseMet = all.filter((t) => !t.responseBreached).length;
    const resolutionMet = all.filter((t) => !t.resolutionBreached).length;
    const responded = all.filter((t) => t.responseTimeMin != null);
    const resolved = all.filter((t) => t.resolutionTimeMin != null);

    const avgResponse = responded.length > 0
      ? responded.reduce((sum, t) => sum + (t.responseTimeMin ?? 0), 0) / responded.length
      : 0;
    const avgResolution = resolved.length > 0
      ? resolved.reduce((sum, t) => sum + (t.resolutionTimeMin ?? 0), 0) / resolved.length
      : 0;

    return {
      total,
      responseMetPct: Math.round((responseMet / total) * 100),
      resolutionMetPct: Math.round((resolutionMet / total) * 100),
      avgResponseMin: Math.round(avgResponse * 10) / 10,
      avgResolutionMin: Math.round(avgResolution * 10) / 10,
    };
  }
}
