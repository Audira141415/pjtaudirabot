import { ILogger } from '@pjtaudirabot/core';
import { AlertNotification } from '../alert';
import type { UptimeAlert } from '../uptime-monitor';

/**
 * Sends alert notifications to WhatsApp admin groups.
 * Uses a sendMessage callback provided by the bot at wiring time.
 */
export class WhatsAppNotifier {
  private logger: ILogger;

  constructor(
    private adminGroupJids: string[],
    private sendMessage: (jid: string, text: string) => Promise<void>,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'wa-notifier' });
  }

  /** Broadcast a text message to all admin groups */
  async broadcast(text: string): Promise<void> {
    for (const jid of this.adminGroupJids) {
      try {
        await this.sendMessage(jid, text);
      } catch (err) {
        this.logger.error(`Failed to send to admin group ${jid}`, err as Error);
      }
    }
  }

  /** Send alert notifications to admin groups */
  async sendAlerts(alerts: AlertNotification[]): Promise<void> {
    if (alerts.length === 0) return;

    const severityIcon: Record<string, string> = {
      CRITICAL: '🚨', ERROR: '❗', WARNING: '⚠️', INFO: 'ℹ️',
    };

    for (const alert of alerts) {
      const icon = severityIcon[alert.severity] ?? '🔔';
      const text = [
        `${icon} *ALERT — ${alert.severity}*`,
        ``,
        `*${alert.title}*`,
        alert.message,
        ``,
        `_ID: ${alert.alertId.slice(0, 8)}_`,
      ].join('\n');

      await this.broadcast(text);
    }
  }

  /** Send escalation notifications */
  async sendEscalations(escalations: Array<{ message: string }>): Promise<void> {
    for (const esc of escalations) {
      await this.broadcast(`🔺 *ESCALATION*\n\n${esc.message}`);
    }
  }

  /** Send SLA warnings */
  async sendSLAWarnings(warnings: string[], breaches: string[]): Promise<void> {
    if (warnings.length === 0 && breaches.length === 0) return;

    const parts: string[] = [];

    if (breaches.length > 0) {
      parts.push(`🚨 *SLA BREACHES* (${breaches.length})`);
      for (const b of breaches.slice(0, 5)) {
        parts.push(`• ${b}`);
      }
      if (breaches.length > 5) parts.push(`  _...and ${breaches.length - 5} more_`);
      parts.push('');
    }

    if (warnings.length > 0) {
      parts.push(`⚠️ *SLA Warnings* (${warnings.length})`);
      for (const w of warnings.slice(0, 5)) {
        parts.push(`• ${w}`);
      }
      if (warnings.length > 5) parts.push(`  _...and ${warnings.length - 5} more_`);
    }

    await this.broadcast(parts.join('\n'));
  }

  /** Send uptime alert notifications (DOWN/recovery) */
  async sendUptimeAlerts(alerts: UptimeAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    for (const alert of alerts) {
      const isDown = alert.status === 'DOWN';
      const icon = isDown ? '🔴' : '🟢';
      const action = isDown ? 'DOWN' : 'RECOVERED';

      const parts = [
        `${icon} *UPTIME ${action}*`,
        ``,
        `Device: *${alert.targetName}*`,
        `Host: ${alert.host}`,
        `Status: ${alert.previousStatus} → *${alert.status}*`,
      ];

      if (isDown) {
        parts.push(`Consecutive failures: ${alert.consecutiveFails}`);
        if (alert.errorMessage) parts.push(`Error: ${alert.errorMessage}`);
        if (alert.autoTicketId) parts.push(`🎫 Auto-ticket created`);
      } else {
        if (alert.responseMs != null) parts.push(`Latency: ${Math.round(alert.responseMs)}ms`);
        parts.push(`✅ Service kembali normal`);
      }

      await this.broadcast(parts.join('\n'));
    }
  }

  /** Send shift handover report to admin groups */
  async sendShiftHandover(formattedText: string): Promise<void> {
    await this.broadcast(formattedText);
  }

  /** Send SLA countdown warnings */
  async sendSLACountdowns(countdowns: string[]): Promise<void> {
    if (countdowns.length === 0) return;

    // Send each countdown as a separate message for urgency visibility
    for (const countdown of countdowns) {
      await this.broadcast(countdown);
    }
  }

  /** Broadcast a new ticket alert so on-duty engineers can pick it up */
  async sendNewTicket(params: {
    id: string;
    ticketNumber: string;
    title: string;
    priority: string;
    category: string;
    problem: string;
    createdByName: string;
    groupId?: string | null;
  }): Promise<void> {
    const priorityIcon: Record<string, string> = {
      CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢',
    };
    const icon = priorityIcon[params.priority] ?? '📋';

    const text = [
      `${icon} *TIKET BARU — ${params.priority}*`,
      ``,
      `📋 *${params.ticketNumber}*`,
      `📝 ${params.title}`,
      `📂 ${params.category}`,
      `👤 Dilaporkan oleh: ${params.createdByName}`,
      ``,
      `_Problem:_`,
      params.problem.length > 200 ? `${params.problem.slice(0, 200)}…` : params.problem,
      ``,
      `👉 Ketik *!take ${params.ticketNumber}* untuk mengambil tiket ini`,
    ].join('\n');

    await this.broadcast(text);
  }

  /** Broadcast unassigned ticket reminders */
  async sendUnassignedReminders(tickets: Array<{
    ticketNumber: string;
    title: string;
    priority: string;
    minutesOpen: number;
  }>): Promise<void> {
    if (tickets.length === 0) return;

    const priorityIcon: Record<string, string> = {
      CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢',
    };

    const lines = [
      `⏰ *TIKET BELUM DIAMBIL* (${tickets.length})`,
      ``,
    ];

    for (const t of tickets) {
      const icon = priorityIcon[t.priority] ?? '📋';
      lines.push(`${icon} *${t.ticketNumber}* [${t.priority}] — open ${t.minutesOpen}m`);
      lines.push(`   ${t.title}`);
      lines.push(`   👉 !take ${t.ticketNumber}`);
    }

    await this.broadcast(lines.join('\n'));
  }

  /** Check if notifier has targets configured */
  isConfigured(): boolean {
    return this.adminGroupJids.length > 0;
  }
}
