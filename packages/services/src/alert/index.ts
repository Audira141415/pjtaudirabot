import { PrismaClient, AlertType, AlertSeverity } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

export interface AlertNotification {
  alertId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
}

export class AlertService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    _redis: RedisClientType,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'alert' });
  }

  /** Create a new alert rule */
  async createRule(input: {
    name: string;
    description?: string;
    alertType: AlertType;
    conditions: Record<string, any>;
    actions: Array<{ type: string; target: string }>;
    cooldownMin?: number;
  }) {
    return this.db.alertRule.create({
      data: {
        name: input.name,
        description: input.description,
        alertType: input.alertType,
        conditions: input.conditions,
        actions: input.actions,
        cooldownMin: input.cooldownMin ?? 5,
      },
    });
  }

  /** Fire an alert based on a rule */
  async fire(ruleId: string, title: string, message: string, severity: AlertSeverity, metadata?: Record<string, any>): Promise<AlertNotification | null> {
    const rule = await this.db.alertRule.findUnique({ where: { id: ruleId } });
    if (!rule || !rule.isActive) return null;

    // Check cooldown
    if (rule.lastTriggeredAt) {
      const elapsed = (Date.now() - rule.lastTriggeredAt.getTime()) / 60_000;
      if (elapsed < rule.cooldownMin) {
        this.logger.debug('Alert cooldown active', { ruleId, elapsed, cooldown: rule.cooldownMin });
        return null;
      }
    }

    const alert = await this.db.alert.create({
      data: { ruleId, title, message, severity, metadata: metadata ?? {} },
    });

    await this.db.alertRule.update({
      where: { id: ruleId },
      data: { lastTriggeredAt: new Date(), triggerCount: { increment: 1 } },
    });

    this.logger.warn('Alert fired', { alertId: alert.id, title, severity });
    return { alertId: alert.id, title, message, severity };
  }

  /** Fire alert without needing a pre-existing rule (ad-hoc) */
  async fireAdHoc(title: string, message: string, severity: AlertSeverity, metadata?: Record<string, any>) {
    // Find or create a generic rule
    const ruleName = `adhoc-${severity.toLowerCase()}`;
    let rule = await this.db.alertRule.findUnique({ where: { name: ruleName } });
    if (!rule) {
      rule = await this.db.alertRule.create({
        data: {
          name: ruleName,
          alertType: 'CUSTOM',
          conditions: {},
          actions: [{ type: 'log', target: 'system' }],
          cooldownMin: 0,
        },
      });
    }
    return this.fire(rule.id, title, message, severity, metadata);
  }

  /** Evaluate SLA breaches and fire alerts */
  async evaluateSLAAlerts(breaches: string[]) {
    const notifications: AlertNotification[] = [];
    for (const breach of breaches) {
      const n = await this.fireAdHoc('SLA Breach', breach, 'CRITICAL');
      if (n) notifications.push(n);
    }
    return notifications;
  }

  /** Acknowledge an alert */
  async acknowledge(alertId: string, userId: string) {
    return this.db.alert.update({
      where: { id: alertId },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), acknowledgedById: userId },
    });
  }

  /** Get recent alerts */
  async getRecent(limit = 20) {
    return this.db.alert.findMany({
      include: { rule: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Get alert stats */
  async getStats() {
    const [total, active, critical, rules] = await Promise.all([
      this.db.alert.count(),
      this.db.alert.count({ where: { status: 'ACTIVE' } }),
      this.db.alert.count({ where: { severity: 'CRITICAL', status: 'ACTIVE' } }),
      this.db.alertRule.count({ where: { isActive: true } }),
    ]);
    return { total, active, critical, activeRules: rules };
  }
}
