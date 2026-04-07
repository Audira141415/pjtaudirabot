import { PrismaClient, ReportType } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';

export class ReportService {
  constructor(
    private db: PrismaClient,
    _logger: ILogger,
  ) {}

  /** Generate daily summary report */
  async generateDailyReport(): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const where = { createdAt: { gte: today, lt: tomorrow } };

    const [openTickets, resolvedToday, newToday, slaData, escalations, criticalAlerts] = await Promise.all([
      this.db.ticket.count({ where: { ...where, status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
      this.db.ticket.count({ where: { ...where, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      this.db.ticket.count({ where }),
      this.db.sLATracking.findMany({ where }),
      this.db.escalation.count({ where }),
      this.db.alert.count({ where: { ...where, severity: 'CRITICAL' } }),
    ]);

    const responseBreaches = slaData.filter((s) => s.responseBreached).length;
    const resolutionBreaches = slaData.filter((s) => s.resolutionBreached).length;
    const avgResponse = slaData.filter((s) => s.responseTimeMin).length > 0
      ? Math.round(slaData.filter((s) => s.responseTimeMin).reduce((sum, s) => sum + (s.responseTimeMin ?? 0), 0) / slaData.filter((s) => s.responseTimeMin).length)
      : 0;

    const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const report = [
      `📊 *DAILY REPORT — ${dateStr}*`,
      ``,
      `📋 *Ticket Summary*`,
      `• New today: ${newToday}`,
      `• Resolved today: ${resolvedToday}`,
      `• Still open: ${openTickets}`,
      ``,
      `⏱️ *SLA Performance*`,
      `• Avg response: ${avgResponse} min`,
      `• Response breaches: ${responseBreaches}`,
      `• Resolution breaches: ${resolutionBreaches}`,
      ``,
      `🔺 *Escalations*: ${escalations}`,
      `🚨 *Critical Alerts*: ${criticalAlerts}`,
      ``,
      `_Generated at ${new Date().toLocaleTimeString('id-ID')}_`,
    ].join('\n');

    return report;
  }

  /** Generate weekly summary report */
  async generateWeeklyReport(): Promise<string> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const where = { createdAt: { gte: weekAgo } };

    const [totalNew, totalResolved, totalOpen, slaData, escalations, topCustomers] = await Promise.all([
      this.db.ticket.count({ where }),
      this.db.ticket.count({ where: { ...where, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      this.db.ticket.count({ where: { ...where, status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
      this.db.sLATracking.findMany({ where }),
      this.db.escalation.count({ where }),
      this.db.ticket.groupBy({ by: ['customer'], _count: { id: true }, where, orderBy: { _count: { id: 'desc' } }, take: 5 }),
    ]);

    const responseMetPct = slaData.length > 0
      ? Math.round((slaData.filter((s) => !s.responseBreached).length / slaData.length) * 100)
      : 100;
    const resolutionMetPct = slaData.length > 0
      ? Math.round((slaData.filter((s) => !s.resolutionBreached).length / slaData.length) * 100)
      : 100;

    const topCustList = topCustomers.map((c, i) =>
      `  ${i + 1}. ${c.customer ?? 'Unknown'}: ${c._count.id} tickets`
    ).join('\n');

    const report = [
      `📊 *WEEKLY REPORT*`,
      `📅 ${weekAgo.toLocaleDateString('id-ID')} — ${now.toLocaleDateString('id-ID')}`,
      ``,
      `📋 *Ticket Volume*`,
      `• New: ${totalNew}`,
      `• Resolved: ${totalResolved}`,
      `• Still open: ${totalOpen}`,
      ``,
      `⏱️ *SLA Compliance*`,
      `• Response SLA met: ${responseMetPct}%`,
      `• Resolution SLA met: ${resolutionMetPct}%`,
      ``,
      `🔺 *Escalations*: ${escalations}`,
      ``,
      `👥 *Top Customers*`,
      topCustList || '  No data',
      ``,
      `_Generated at ${new Date().toLocaleString('id-ID')}_`,
    ].join('\n');

    return report;
  }

  /** Generate monthly summary report (month-to-date) */
  async generateMonthlyReport(referenceDate = new Date()): Promise<string> {
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const nextMonthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
    const where = { createdAt: { gte: monthStart, lt: nextMonthStart } };

    const [totalNew, totalResolved, totalOpen, slaData, escalations, topCustomers] = await Promise.all([
      this.db.ticket.count({ where }),
      this.db.ticket.count({ where: { ...where, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      this.db.ticket.count({ where: { ...where, status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
      this.db.sLATracking.findMany({ where }),
      this.db.escalation.count({ where }),
      this.db.ticket.groupBy({ by: ['customer'], _count: { id: true }, where, orderBy: { _count: { id: 'desc' } }, take: 5 }),
    ]);

    const responseMetPct = slaData.length > 0
      ? Math.round((slaData.filter((s) => !s.responseBreached).length / slaData.length) * 100)
      : 100;
    const resolutionMetPct = slaData.length > 0
      ? Math.round((slaData.filter((s) => !s.resolutionBreached).length / slaData.length) * 100)
      : 100;

    const topCustList = topCustomers.map((c, i) =>
      `  ${i + 1}. ${c.customer ?? 'Unknown'}: ${c._count.id} tickets`
    ).join('\n');

    const monthLabel = monthStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return [
      `📈 *MONTHLY REPORT*`,
      `🗓️ ${monthLabel}`,
      '',
      `📋 *Ticket Volume*`,
      `• New: ${totalNew}`,
      `• Resolved: ${totalResolved}`,
      `• Still open: ${totalOpen}`,
      '',
      `⏱️ *SLA Compliance*`,
      `• Response SLA met: ${responseMetPct}%`,
      `• Resolution SLA met: ${resolutionMetPct}%`,
      '',
      `🔺 *Escalations*: ${escalations}`,
      '',
      `👥 *Top Customers*`,
      topCustList || '  No data',
      '',
      `_Generated at ${new Date().toLocaleString('id-ID')}_`,
    ].join('\n');
  }

  /** Generate audit report (comprehensive) */
  async generateAuditReport(dateFrom?: Date, dateTo?: Date): Promise<string> {
    const from = dateFrom ?? new Date(Date.now() - 30 * 86_400_000);
    const to = dateTo ?? new Date();
    const where = { createdAt: { gte: from, lte: to } };

    const [tickets, sla, escalations, extractions, branches] = await Promise.all([
      this.db.ticket.findMany({ where, include: { slaTracking: true } }),
      this.db.sLATracking.findMany({ where }),
      this.db.escalation.findMany({ where }),
      this.db.dataExtraction.findMany({ where }),
      this.db.networkBranch.findMany(),
    ]);

    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const t of tickets) {
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    }

    const priorityLines = Object.entries(byPriority).map(([k, v]) => `  • ${k}: ${v}`).join('\n');
    const categoryLines = Object.entries(byCategory).map(([k, v]) => `  • ${k}: ${v}`).join('\n');

    const responseBreached = sla.filter((s) => s.responseBreached).length;
    const resolutionBreached = sla.filter((s) => s.resolutionBreached).length;

    const escalationsByLevel: Record<string, number> = {};
    for (const e of escalations) {
      escalationsByLevel[e.toLevel] = (escalationsByLevel[e.toLevel] ?? 0) + 1;
    }
    const escLines = Object.entries(escalationsByLevel).map(([k, v]) => `  • ${k}: ${v}`).join('\n');

    const avgHealth = branches.length > 0
      ? Math.round(branches.reduce((s, b) => s + b.healthScore, 0) / branches.length)
      : 0;

    const report = [
      `📋 *AUDIT REPORT*`,
      `📅 ${from.toLocaleDateString('id-ID')} — ${to.toLocaleDateString('id-ID')}`,
      ``,
      `📊 *Summary*`,
      `• Total tickets: ${tickets.length}`,
      `• Data extractions: ${extractions.length}`,
      `• Escalations: ${escalations.length}`,
      ``,
      `🎯 *By Priority*`,
      priorityLines || '  No data',
      ``,
      `📂 *By Category*`,
      categoryLines || '  No data',
      ``,
      `⏱️ *SLA Breaches*`,
      `• Response: ${responseBreached}`,
      `• Resolution: ${resolutionBreached}`,
      ``,
      `🔺 *Escalations by Level*`,
      escLines || '  No data',
      ``,
      `🌐 *Network Health*`,
      `• Branches monitored: ${branches.length}`,
      `• Avg health score: ${avgHealth}/100`,
      ``,
      `_Report generated at ${new Date().toLocaleString('id-ID')}_`,
    ].join('\n');

    return report;
  }

  /** Get recent reports */
  async getRecentReports(type?: ReportType, limit = 10) {
    const where: any = {};
    if (type) where.reportType = type;
    return this.db.scheduledReport.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
  }
}
