import { PrismaClient, ReportType } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';

export class ReportService {
  constructor(
    private db: PrismaClient,
    _logger: ILogger,
  ) {}

  /** Generate daily summary report using neucentrix format */
  async generateDailyReport(): Promise<{ text: string; reportId: string; healthScore: number; }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const where = { createdAt: { gte: today, lt: tomorrow } };

    // 1. Fetch data in parallel for complete summary
    const [tickets, slaData, uptimeTargets] = await Promise.all([
      this.db.ticket.findMany({ 
        where, 
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        include: { createdBy: true, slaTracking: true }
      }),
      this.db.sLATracking.findMany({ where }),
      this.db.uptimeTarget.findMany({ where: { isActive: true } }).catch(() => []) as Promise<any[]>,
    ]);

    const stats = {
      total: tickets.length,
      resolved: tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
      open: tickets.filter(t => ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'WAITING'].includes(t.status)).length,
    };

    const responseSlaPct = slaData.length > 0 
      ? Math.round((slaData.filter(s => !s.responseBreached).length / slaData.length) * 100) 
      : 100;
    const resolutionSlaPct = slaData.length > 0 
      ? Math.round((slaData.filter(s => !s.resolutionBreached).length / slaData.length) * 100) 
      : 100;

    const avgUptime = uptimeTargets.length > 0
      ? Math.round(uptimeTargets.reduce((s, t) => s + (t.uptimePercent || 0), 0) / uptimeTargets.length)
      : 100;

    const healthScore = Math.max(0, Math.min(100, 100 - (slaData.filter(s => s.resolutionBreached).length * 10) - (stats.open * 2)));

    const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Professional Categorization
    const fulfillment = tickets.filter(t => t.category === 'FULFILLMENT' || t.problem.toLowerCase().includes('ao :'));
    
    const infraKeywords = ['ups', 'pac', 'ac ', 'power', 'cooling', 'genset', 'pln', 'baterai', 'battery', 'trafo'];
    const infraAlerts = tickets.filter(t => 
      !fulfillment.includes(t) && 
      infraKeywords.some(kw => t.problem.toLowerCase().includes(kw))
    );
    
    const networkAlerts = tickets.filter(t => 
      !fulfillment.includes(t) && !infraAlerts.includes(t) && 
      (t.category === 'CONFIGURATION' || t.service?.toLowerCase().includes('metro') || t.service?.toLowerCase().includes('vlan'))
    );

    const supportAlerts = tickets.filter(t => 
      !fulfillment.includes(t) && !infraAlerts.includes(t) && !networkAlerts.includes(t) && 
      ['HELPDESK', 'SMARTHAND', 'MAINTENANCE'].includes(t.category)
    );

    const assurance = tickets.filter(t => 
      !fulfillment.includes(t) && !infraAlerts.includes(t) && !networkAlerts.includes(t) && !supportAlerts.includes(t) && 
      t.category !== 'VAM'
    );

    const vam = tickets.filter(t => t.category === 'VAM');

    const reportId = Math.random().toString(36).substring(7).toUpperCase();
    const reportText = [
      `🌐 *PJ-TAUDIRABOT | MANAGEMENT SUMMARY*`,
      `📅 ${dateStr.toUpperCase()}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🚀 *EXECUTIVE OVERVIEW*`,
      `• Infrastructure Health : ${healthScore}% ${healthScore > 90 ? '🟢' : healthScore > 75 ? '🟡' : '🔴'}`,
      `• Ticket Load           : ${stats.total} Total (${stats.resolved} Resolved, ${stats.open} Open)`,
      `• SLA Response         : ${responseSlaPct}% Meta-Compliance`,
      `• SLA Resolution       : ${resolutionSlaPct}% Meta-Compliance`,
      `• Network Uptime Avg   : ${avgUptime}% (Core Targets)`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🏗️ *I. SERVICE FULFILLMENT*`,
      fulfillment.length > 0 
        ? fulfillment.map(t => `  ◻️ [${t.location || 'DC'}] ${t.customer || 'Customer'} — ${t.service || 'Link'} (${t.ao || 'No AO'})`).join('\n')
        : `  _No active fulfillment tasks recorded today._`,
      ``,
      `🚨 *II. CRITICAL INFRASTRUCTURE ALERTS*`,
      infraAlerts.length > 0
        ? infraAlerts.map(t => {
            const pIcon = t.priority === 'CRITICAL' ? '🔴' : '🟠';
            return `  ${pIcon} [${t.ticketNumber}] ${t.service || 'Infra'} @ ${t.location || 'DC'}: ${t.problem.substring(0, 50)}...`;
          }).join('\n')
        : `  ✅ _All power and cooling systems report optimal status._`,
      ``,
      `🌐 *III. NETWORK PERFORMANCE & ASSURANCE*`,
      networkAlerts.length > 0
        ? networkAlerts.map(t => `  🔹 [${t.ticketNumber}] ${t.customer || 'Core'} — ${t.problem.substring(0, 50)}`).join('\n')
        : `  _No significant network anomalies detected._`,
      ``,
      `🛠️ *IV. SECONDARY SUPPORT & MAINTENANCE*`,
      supportAlerts.length > 0
        ? supportAlerts.map(t => `  ⚙️ [${t.ticketNumber}] ${t.service || 'Support'} @ ${t.location}: ${t.problem.substring(0, 40)}`).join('\n')
        : `  _Facility monitoring reports stable._`,
      ``,
      `🤝 *V. GENERAL CUSTOMER SERVICES*`,
      assurance.length > 0
        ? assurance.map(t => `  🔹 ${t.customer || 'N/A'}: ${t.problem.substring(0, 50)} (${t.status})`).join('\n')
        : `  _Standard customer services operational._`,
      ``,
      `🛂 *VI. VISITOR ACCESS MANAGEMENT (VAM)*`,
      vam.length > 0
        ? vam.map(t => `  ID: ${t.ao || 'N/A'} | ${t.location} | Task: ${t.problem} (${t.status})`).join('\n')
        : `  _No visitor requests recorded today._`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_Automated Analysis Ref: ${reportId}_`,
    ].join('\n');

    return {
      text: reportText,
      reportId,
      healthScore,
    };
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
