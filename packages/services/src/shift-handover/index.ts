import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

/**
 * neuCentrIX shift schedule:
 *   PAGI   07:00 – 15:00
 *   SIANG  15:00 – 23:00
 *   MALAM  23:00 – 07:00
 */
const SHIFT_SCHEDULE = [
  { label: 'PAGI',  startHour: 7,  endHour: 15, description: 'Shift Pagi (07:00-15:00)' },
  { label: 'SIANG', startHour: 15, endHour: 23, description: 'Shift Siang (15:00-23:00)' },
  { label: 'MALAM', startHour: 23, endHour: 7,  description: 'Shift Malam (23:00-07:00)' },
] as const;

export interface HandoverContent {
  shiftLabel: string;
  shiftDescription: string;
  generatedAt: Date;
  openTickets: Array<{ ticketNumber: string; priority: string; customer: string; description: string; age: string }>;
  slaDueSoon: Array<{ ticketNumber: string; remaining: string; type: string }>;
  slaBreached: Array<{ ticketNumber: string; type: string; breachedSince: string }>;
  recentAlerts: Array<{ severity: string; title: string; time: string }>;
  uptimeIssues: Array<{ name: string; host: string; status: string; downSince: string }>;
  stats: { totalOpen: number; resolvedToday: number; createdToday: number; avgUptime: number };
  formattedText: string;
}

export class ShiftHandoverService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'shift-handover' });
  }

  /** Determine which shift label matches a given hour (0-23) */
  getCurrentShift(hour?: number): typeof SHIFT_SCHEDULE[number] {
    const h = hour ?? new Date().getHours();
    if (h >= 7 && h < 15) return SHIFT_SCHEDULE[0];  // PAGI
    if (h >= 15 && h < 23) return SHIFT_SCHEDULE[1]; // SIANG
    return SHIFT_SCHEDULE[2]; // MALAM
  }

  /** Get the NEXT shift (the one that will take over) */
  getNextShift(hour?: number): typeof SHIFT_SCHEDULE[number] {
    const current = this.getCurrentShift(hour);
    const idx = SHIFT_SCHEDULE.findIndex((s) => s.label === current.label);
    return SHIFT_SCHEDULE[(idx + 1) % SHIFT_SCHEDULE.length];
  }

  /** Check if we are within the handover window (last 15 min of a shift) */
  isHandoverTime(now?: Date): boolean {
    const d = now ?? new Date();
    const h = d.getHours();
    const m = d.getMinutes();

    // Handover windows: 14:45-15:00, 22:45-23:00, 06:45-07:00
    return (
      (h === 14 && m >= 45) ||
      (h === 22 && m >= 45) ||
      (h === 6 && m >= 45)
    );
  }

  /** Generate handover report for the current (ending) shift */
  async generateHandover(forceShift?: string): Promise<HandoverContent> {
    const now = new Date();
    const currentShift = forceShift
      ? SHIFT_SCHEDULE.find((s) => s.label === forceShift) ?? this.getCurrentShift()
      : this.getCurrentShift();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 1. Open tickets
    const openTicketsRaw = await this.db.ticket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    });

    const openTickets = openTicketsRaw.map((t) => {
      const ageMs = now.getTime() - t.createdAt.getTime();
      const ageHours = Math.floor(ageMs / 3_600_000);
      const ageMins = Math.floor((ageMs % 3_600_000) / 60_000);
      return {
        ticketNumber: t.ticketNumber,
        priority: t.priority,
        customer: t.customer ?? '-',
        description: (t.description ?? '').substring(0, 60),
        age: ageHours > 0 ? `${ageHours}h ${ageMins}m` : `${ageMins}m`,
      };
    });

    // 2. SLA tracking
    const activeSlaTracks = await this.db.sLATracking.findMany({
      where: { resolvedAt: null, isPaused: false },
      include: { ticket: true },
    });

    const slaDueSoon: HandoverContent['slaDueSoon'] = [];
    const slaBreached: HandoverContent['slaBreached'] = [];

    for (const t of activeSlaTracks) {
      const respRemaining = t.respondedAt ? null : t.responseDeadline.getTime() - now.getTime();
      const resRemaining = t.resolutionDeadline.getTime() - now.getTime();

      if (respRemaining !== null && respRemaining <= 0) {
        slaBreached.push({
          ticketNumber: t.ticket.ticketNumber,
          type: 'Response',
          breachedSince: `${Math.abs(Math.ceil(respRemaining / 60_000))}m ago`,
        });
      } else if (respRemaining !== null && respRemaining < 30 * 60_000) {
        slaDueSoon.push({
          ticketNumber: t.ticket.ticketNumber,
          remaining: `${Math.ceil(respRemaining / 60_000)}m`,
          type: 'Response',
        });
      }

      if (resRemaining <= 0) {
        slaBreached.push({
          ticketNumber: t.ticket.ticketNumber,
          type: 'Resolution',
          breachedSince: `${Math.abs(Math.ceil(resRemaining / 60_000))}m ago`,
        });
      } else if (resRemaining < 60 * 60_000) {
        slaDueSoon.push({
          ticketNumber: t.ticket.ticketNumber,
          remaining: `${Math.ceil(resRemaining / 60_000)}m`,
          type: 'Resolution',
        });
      }
    }

    // 3. Recent alerts (last 8 hours)
    const alertsSince = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    const recentAlertsRaw = await this.db.alert.findMany({
      where: { createdAt: { gte: alertsSince } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const recentAlerts = recentAlertsRaw.map((a) => ({
      severity: a.severity,
      title: a.title,
      time: a.createdAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }));

    // 4. Uptime issues
    let uptimeIssues: HandoverContent['uptimeIssues'] = [];
    try {
      const downTargets = await this.db.uptimeTarget.findMany({
        where: { isActive: true, status: { in: ['DOWN', 'DEGRADED'] } },
      });
      uptimeIssues = downTargets.map((t) => ({
        name: t.name,
        host: t.host,
        status: t.status,
        downSince: t.lastDownAt
          ? t.lastDownAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-',
      }));
    } catch {
      // UptimeTarget table may not exist yet
    }

    // 5. Stats
    const totalOpen = openTicketsRaw.length;
    const resolvedToday = await this.db.ticket.count({
      where: { resolvedAt: { gte: todayStart }, status: { in: ['RESOLVED', 'CLOSED'] } },
    });
    const createdToday = await this.db.ticket.count({
      where: { createdAt: { gte: todayStart } },
    });

    let avgUptime = 100;
    try {
      const targets = await this.db.uptimeTarget.findMany({ where: { isActive: true } });
      if (targets.length > 0) {
        avgUptime = Math.round(targets.reduce((s, t) => s + t.uptimePercent, 0) / targets.length * 100) / 100;
      }
    } catch { /* table may not exist */ }

    // Format the handover text
    const nextShift = this.getNextShift();
    const lines: string[] = [
      `📋 *SHIFT HANDOVER REPORT*`,
      `━━━━━━━━━━━━━━━━━`,
      `🔄 Dari: *${currentShift.description}*`,
      `➡️ Ke: *${nextShift.description}*`,
      `📅 ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      `🕐 Generated: ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      ``,
      `📊 *RINGKASAN*`,
      `• Tiket Open: ${totalOpen}`,
      `• Dibuat hari ini: ${createdToday}`,
      `• Diselesaikan hari ini: ${resolvedToday}`,
      `• Avg Uptime (24h): ${avgUptime}%`,
      ``,
    ];

    // SLA Breaches
    if (slaBreached.length > 0) {
      lines.push(`🚨 *SLA BREACH* (${slaBreached.length})`);
      for (const b of slaBreached.slice(0, 5)) {
        lines.push(`  • ${b.ticketNumber} — ${b.type} breach ${b.breachedSince}`);
      }
      lines.push('');
    }

    // SLA Due Soon
    if (slaDueSoon.length > 0) {
      lines.push(`⏳ *SLA DUE SOON* (${slaDueSoon.length})`);
      for (const d of slaDueSoon.slice(0, 5)) {
        lines.push(`  • ${d.ticketNumber} — ${d.type} in ${d.remaining}`);
      }
      lines.push('');
    }

    // Uptime Issues
    if (uptimeIssues.length > 0) {
      lines.push(`🔴 *UPTIME ISSUES* (${uptimeIssues.length})`);
      for (const u of uptimeIssues) {
        const icon = u.status === 'DOWN' ? '🔴' : '🟡';
        lines.push(`  ${icon} ${u.name} (${u.host}) — ${u.status} since ${u.downSince}`);
      }
      lines.push('');
    }

    // Open Tickets (top priority)
    if (openTickets.length > 0) {
      lines.push(`📝 *TIKET OPEN* (top ${Math.min(openTickets.length, 10)}/${totalOpen})`);
      for (const t of openTickets.slice(0, 10)) {
        const pIcon = t.priority === 'CRITICAL' ? '🔴' : t.priority === 'HIGH' ? '🟠' : t.priority === 'MEDIUM' ? '🟡' : '🟢';
        lines.push(`  ${pIcon} ${t.ticketNumber} [${t.priority}] ${t.customer}`);
        lines.push(`     ${t.description} (${t.age})`);
      }
      lines.push('');
    }

    // Recent Alerts
    if (recentAlerts.length > 0) {
      lines.push(`🔔 *ALERT TERBARU* (8 jam terakhir)`);
      for (const a of recentAlerts.slice(0, 5)) {
        const sIcon = a.severity === 'CRITICAL' ? '🚨' : a.severity === 'ERROR' ? '❗' : '⚠️';
        lines.push(`  ${sIcon} [${a.time}] ${a.title}`);
      }
      lines.push('');
    }

    // Action items
    const actionItems: string[] = [];
    if (slaBreached.length > 0) actionItems.push(`Segera handle ${slaBreached.length} tiket SLA breach`);
    if (slaDueSoon.length > 0) actionItems.push(`Prioritaskan ${slaDueSoon.length} tiket SLA hampir deadline`);
    if (uptimeIssues.length > 0) actionItems.push(`Cek ${uptimeIssues.length} device/service yang DOWN/DEGRADED`);
    if (openTickets.some((t) => t.priority === 'CRITICAL')) actionItems.push('Ada tiket CRITICAL yang menunggu');

    if (actionItems.length > 0) {
      lines.push(`⚡ *ACTION ITEMS*`);
      for (const a of actionItems) {
        lines.push(`  • ${a}`);
      }
      lines.push('');
    }

    lines.push('_Ketik !handover-ack untuk konfirmasi terima handover_');

    const formattedText = lines.join('\n');

    // Persist handover record
    const shiftDate = new Date(now);
    shiftDate.setHours(0, 0, 0, 0);

    try {
      await this.db.shiftHandover.upsert({
        where: {
          shiftLabel_shiftDate: { shiftLabel: currentShift.label, shiftDate },
        },
        update: {
          openTickets: totalOpen,
          slaDueSoon: slaDueSoon.length,
          slaBreached: slaBreached.length,
          activeIncidents: openTicketsRaw.filter((t) => t.category === 'INCIDENT').length,
          criticalAlerts: recentAlertsRaw.filter((a) => a.severity === 'CRITICAL').length,
          content: formattedText,
          highlights: actionItems,
          actionItems,
          generatedAt: now,
        },
        create: {
          shiftLabel: currentShift.label,
          shiftDate,
          openTickets: totalOpen,
          slaDueSoon: slaDueSoon.length,
          slaBreached: slaBreached.length,
          activeIncidents: openTicketsRaw.filter((t) => t.category === 'INCIDENT').length,
          criticalAlerts: recentAlertsRaw.filter((a) => a.severity === 'CRITICAL').length,
          content: formattedText,
          highlights: actionItems,
          actionItems,
        },
      });
    } catch (err) {
      this.logger.error('Failed to persist handover record', err as Error);
    }

    this.logger.info('Handover report generated', { shift: currentShift.label });

    return {
      shiftLabel: currentShift.label,
      shiftDescription: currentShift.description,
      generatedAt: now,
      openTickets,
      slaDueSoon,
      slaBreached,
      recentAlerts,
      uptimeIssues,
      stats: { totalOpen, resolvedToday, createdToday, avgUptime },
      formattedText,
    };
  }

  /** Record that the incoming shift acknowledged the handover */
  async acknowledgeHandover(userId: string) {
    const now = new Date();
    const shiftDate = new Date(now);
    shiftDate.setHours(0, 0, 0, 0);
    const currentShift = this.getCurrentShift();

    const record = await this.db.shiftHandover.findUnique({
      where: { shiftLabel_shiftDate: { shiftLabel: currentShift.label, shiftDate } },
    });

    if (!record) {
      // Try previous shift
      const prevShifts = ['MALAM', 'SIANG', 'PAGI'];
      for (const label of prevShifts) {
        const prev = await this.db.shiftHandover.findFirst({
          where: { shiftLabel: label },
          orderBy: { generatedAt: 'desc' },
        });
        if (prev) {
          const deliveredTo = (prev.deliveredTo as any[]) ?? [];
          deliveredTo.push({ userId, acknowledgedAt: now.toISOString() });
          await this.db.shiftHandover.update({
            where: { id: prev.id },
            data: { deliveredTo },
          });
          return prev;
        }
      }
      return null;
    }

    const deliveredTo = (record.deliveredTo as any[]) ?? [];
    deliveredTo.push({ userId, acknowledgedAt: now.toISOString() });
    await this.db.shiftHandover.update({
      where: { id: record.id },
      data: { deliveredTo },
    });

    return record;
  }

  /** Check if it's handover time and generate + broadcast if not yet done in this window */
  async checkAndBroadcast(): Promise<HandoverContent | null> {
    const now = new Date();
    if (!this.isHandoverTime(now)) return null;

    // De-dup: only broadcast once per handover window
    const windowKey = `handover:sent:${this.getCurrentShift().label}:${now.toISOString().split('T')[0]}`;
    const alreadySent = await this.redis.set(windowKey, '1', { NX: true, EX: 3600 });
    if (!alreadySent) return null;

    return this.generateHandover();
  }
}
