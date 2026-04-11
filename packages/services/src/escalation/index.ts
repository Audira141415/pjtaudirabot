import { PrismaClient, EscalationLevel, EscalationTrigger } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

const LEVEL_TIMEOUT_MIN: Record<string, number> = {
  L1: 15,
  L2: 30,
  L3: 60,
  MANAGER: 120,
};

const LEVEL_ORDER: EscalationLevel[] = ['L1', 'L2', 'L3', 'MANAGER'];

const CRITICAL_KEYWORDS = [
  'down', 'outage', 'offline', 'crash', 'unreachable', 'mati total',
  'tidak bisa diakses', 'failure', 'emergency', 'putus', 'total loss',
];

const VIP_KEYWORDS = ['bank', 'telkom', 'xl', 'indosat', 'government', 'pemerintah', 'bumn'];

export interface EscalationNotification {
  ticketId: string;
  ticketNumber: string;
  level: EscalationLevel;
  reason: string;
  customer?: string;
  message: string;
}

export class EscalationService {
  private logger: ILogger;
  private notifications: EscalationNotification[] = [];

  constructor(
    private db: PrismaClient,
    _redis: RedisClientType,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'escalation' });
  }

  /** Setup default escalation rules */
  async seedDefaultRules() {
    const defaults = [
      { name: 'sla-breach', triggerType: 'SLA_BREACH' as EscalationTrigger, targetLevel: 'L2' as EscalationLevel, condition: { type: 'sla_breach' }, description: 'Auto-escalate on SLA violation' },
      { name: 'critical-keyword', triggerType: 'KEYWORD' as EscalationTrigger, targetLevel: 'L2' as EscalationLevel, condition: { keywords: CRITICAL_KEYWORDS }, description: 'Escalate when critical keywords detected' },
      { name: 'l1-timeout', triggerType: 'TIMEOUT' as EscalationTrigger, targetLevel: 'L2' as EscalationLevel, condition: { level: 'L1', timeoutMin: 15 }, description: 'L1 no response after 15 min' },
      { name: 'l2-timeout', triggerType: 'TIMEOUT' as EscalationTrigger, targetLevel: 'L3' as EscalationLevel, condition: { level: 'L2', timeoutMin: 30 }, description: 'L2 no response after 30 min' },
      { name: 'l3-timeout', triggerType: 'TIMEOUT' as EscalationTrigger, targetLevel: 'MANAGER' as EscalationLevel, condition: { level: 'L3', timeoutMin: 60 }, description: 'L3 no response after 60 min' },
      { name: 'vip-customer', triggerType: 'VIP' as EscalationTrigger, targetLevel: 'L2' as EscalationLevel, condition: { keywords: VIP_KEYWORDS }, description: 'Auto-escalate VIP customers' },
    ];

    for (const rule of defaults) {
      await this.db.escalationRule.upsert({
        where: { name: rule.name },
        create: rule,
        update: { condition: rule.condition, description: rule.description },
      });
    }
    this.logger.info('Default escalation rules seeded');
  }

  /** Detect severity from description text */
  detectSeverity(description: string): 'critical' | 'high' | 'medium' {
    const lower = description.toLowerCase();
    if (CRITICAL_KEYWORDS.some((kw) => lower.includes(kw))) return 'critical';
    if (['slow', 'lambat', 'intermittent', 'flapping'].some((kw) => lower.includes(kw))) return 'high';
    return 'medium';
  }

  /** Check if customer is VIP */
  isVIP(customer?: string): boolean {
    if (!customer) return false;
    const lower = customer.toLowerCase();
    return VIP_KEYWORDS.some((kw) => lower.includes(kw));
  }

  /** Get next escalation level */
  private getNextLevel(current: EscalationLevel): EscalationLevel | null {
    const idx = LEVEL_ORDER.indexOf(current);
    return idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null;
  }

  /** Escalate a ticket to a specific level */
  async escalate(
    ticketId: string,
    toLevel: EscalationLevel,
    reason: string,
    triggerType: EscalationTrigger,
    escalatedById?: string,
  ) {
    const ticket = await this.db.ticket.findUnique({
      where: { id: ticketId },
      include: { escalations: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!ticket) return null;

    const fromLevel = ticket.escalations[0]?.toLevel ?? 'L1';

    const escalation = await this.db.escalation.create({
      data: { ticketId, fromLevel, toLevel, reason, triggerType, escalatedById },
    });

    // Update ticket status
    await this.db.ticket.update({
      where: { id: ticketId },
      data: { status: 'ESCALATED' },
    });

    // Queue notification
    this.notifications.push({
      ticketId,
      ticketNumber: ticket.ticketNumber,
      level: toLevel,
      reason,
      customer: ticket.customer ?? undefined,
      message: `🔺 *ESCALATION ${toLevel}*\n📋 ${ticket.ticketNumber}\n👤 ${ticket.customer ?? 'N/A'}\n📍 ${ticket.location ?? 'N/A'}\n📝 ${reason}`,
    });

    this.logger.warn('Ticket escalated', { ticketId, fromLevel, toLevel, reason });
    return escalation;
  }

  /** Check all open tickets for auto-escalation triggers */
  async checkForEscalations(): Promise<EscalationNotification[]> {
    this.notifications = [];
    const rules = await this.db.escalationRule.findMany({ where: { isActive: true } });
    if (rules.length === 0) return [];

    const openTickets = await this.db.ticket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } },
      include: {
        slaTracking: true,
        escalations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    for (const ticket of openTickets) {
      const currentLevel = ticket.escalations[0]?.toLevel ?? 'L1';
      const nextLevel = this.getNextLevel(currentLevel);
      if (!nextLevel) continue; // Already at MANAGER

      for (const rule of rules) {
        const cond = rule.condition as any;

        // SLA Breach rule
        if (rule.triggerType === 'SLA_BREACH' && ticket.slaTracking) {
          if (ticket.slaTracking.responseBreached || ticket.slaTracking.resolutionBreached) {
            // Avoid re-escalating to the same/lower level on every scheduler tick.
            if (LEVEL_ORDER.indexOf(currentLevel) < LEVEL_ORDER.indexOf(rule.targetLevel)) {
              await this.escalate(ticket.id, rule.targetLevel, 'SLA breached', 'SLA_BREACH');
              break;
            }
          }
        }

        // Keyword rule
        if (rule.triggerType === 'KEYWORD' && cond.keywords) {
          const text = `${ticket.problem} ${ticket.description}`.toLowerCase();
          if ((cond.keywords as string[]).some((kw: string) => text.includes(kw))) {
            // Only escalate if not already at or above target
            if (LEVEL_ORDER.indexOf(currentLevel) < LEVEL_ORDER.indexOf(rule.targetLevel)) {
              await this.escalate(ticket.id, rule.targetLevel, 'Critical keyword detected', 'KEYWORD');
              break;
            }
          }
        }

        // Timeout rule
        if (rule.triggerType === 'TIMEOUT' && cond.level === currentLevel) {
          const lastEscalation = ticket.escalations[0];
          const since = lastEscalation?.createdAt ?? ticket.createdAt;
          const elapsed = (Date.now() - since.getTime()) / 60_000;
          if (elapsed >= (cond.timeoutMin ?? LEVEL_TIMEOUT_MIN[currentLevel] ?? 30)) {
            await this.escalate(ticket.id, nextLevel, `${currentLevel} timeout (${Math.round(elapsed)}min)`, 'TIMEOUT');
            break;
          }
        }

        // VIP rule
        if (rule.triggerType === 'VIP' && this.isVIP(ticket.customer ?? undefined)) {
          if (LEVEL_ORDER.indexOf(currentLevel) < LEVEL_ORDER.indexOf(rule.targetLevel)) {
            await this.escalate(ticket.id, rule.targetLevel, 'VIP customer', 'VIP');
            break;
          }
        }
      }
    }

    return this.notifications;
  }

  /** Get escalation history for a ticket */
  async getHistory(ticketId: string) {
    return this.db.escalation.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get escalation stats */
  async getStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const all = await this.db.escalation.findMany({ where });
    const byLevel: Record<string, number> = { L1: 0, L2: 0, L3: 0, MANAGER: 0 };
    const byTrigger: Record<string, number> = {};

    for (const e of all) {
      byLevel[e.toLevel] = (byLevel[e.toLevel] ?? 0) + 1;
      byTrigger[e.triggerType] = (byTrigger[e.triggerType] ?? 0) + 1;
    }

    return { total: all.length, byLevel, byTrigger };
  }
}
