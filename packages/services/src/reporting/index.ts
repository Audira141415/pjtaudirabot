import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { GoogleSheetsService } from '../sheets';

export interface DailyReport {
  date: Date;
  tasksCompleted: number;
  tasksPending: number;
  tasksCreated: number;
  incidentsOpen: number;
  incidentsResolved: number;
  checklistProgress: { total: number; completed: number };
  serverStatus: string;
  topIssues: string[];
  summary: string;
}

export class ReportingService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private sheets: GoogleSheetsService | null,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'reporting' });
  }

  /**
   * Generate a daily report for a user.
   */
  async generateDailyReport(userId: string): Promise<DailyReport> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      tasksCompleted,
      tasksPending,
      tasksCreated,
      incidentsOpen,
      incidentsResolved,
      checklistItems,
      recentIncidents,
    ] = await Promise.all([
      this.db.task.count({
        where: { userId, status: 'COMPLETED', completedAt: { gte: today, lt: tomorrow } },
      }),
      this.db.task.count({
        where: { userId, status: 'PENDING' },
      }),
      this.db.task.count({
        where: { userId, createdAt: { gte: today, lt: tomorrow } },
      }),
      this.db.incident.count({
        where: { userId, status: { in: ['OPEN', 'INVESTIGATING'] } },
      }),
      this.db.incident.count({
        where: { userId, status: 'RESOLVED', resolvedAt: { gte: today, lt: tomorrow } },
      }),
      this.db.checklistItem.findMany({
        where: { userId, scheduledDate: today },
      }),
      this.db.incident.findMany({
        where: { userId, createdAt: { gte: today, lt: tomorrow } },
        orderBy: { severity: 'desc' },
        take: 5,
      }),
    ]);

    const checklistTotal = checklistItems.length;
    const checklistDone = checklistItems.filter((i: any) => i.isCompleted).length;
    const topIssues = recentIncidents.map((i: any) => `[${i.severity}] ${i.title}`);

    const summary = this.buildSummary({
      tasksCompleted,
      tasksPending,
      tasksCreated,
      incidentsOpen,
      incidentsResolved,
      checklistTotal,
      checklistDone,
    });

    const report: DailyReport = {
      date: today,
      tasksCompleted,
      tasksPending,
      tasksCreated,
      incidentsOpen,
      incidentsResolved,
      checklistProgress: { total: checklistTotal, completed: checklistDone },
      serverStatus: incidentsOpen > 0 ? 'Issues detected' : 'All clear',
      topIssues,
      summary,
    };

    // Sync to sheets
    if (this.sheets?.isAvailable()) {
      this.sheets.appendToSheet('logs', {
        Timestamp: new Date().toISOString(),
        User: userId,
        Message: summary,
        'Extracted Type': 'note',
      }).catch((err) => this.logger.error('Sheet sync failed', err));
    }

    return report;
  }

  /**
   * Generate a weekly summary.
   */
  async generateWeeklyReport(userId: string): Promise<string> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [tasksCompleted, tasksCreated, incidentsTotal, incidentsResolved] = await Promise.all([
      this.db.task.count({
        where: { userId, status: 'COMPLETED', completedAt: { gte: weekAgo } },
      }),
      this.db.task.count({
        where: { userId, createdAt: { gte: weekAgo } },
      }),
      this.db.incident.count({
        where: { userId, createdAt: { gte: weekAgo } },
      }),
      this.db.incident.count({
        where: { userId, status: 'RESOLVED', resolvedAt: { gte: weekAgo } },
      }),
    ]);

    return [
      `📊 *Weekly Report* (${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()})`,
      '',
      `📝 *Tasks*`,
      `   Created: ${tasksCreated}`,
      `   Completed: ${tasksCompleted}`,
      `   Completion rate: ${tasksCreated > 0 ? Math.round((tasksCompleted / tasksCreated) * 100) : 0}%`,
      '',
      `🔧 *Incidents*`,
      `   Total: ${incidentsTotal}`,
      `   Resolved: ${incidentsResolved}`,
      `   Resolution rate: ${incidentsTotal > 0 ? Math.round((incidentsResolved / incidentsTotal) * 100) : 0}%`,
    ].join('\n');
  }

  /**
   * Format daily report for chat message.
   */
  formatDailyReport(report: DailyReport): string {
    const lines: string[] = [
      `📊 *Daily Report* (${report.date.toLocaleDateString()})`,
      '',
      `📝 *Tasks*`,
      `   Created today: ${report.tasksCreated}`,
      `   Completed: ${report.tasksCompleted}`,
      `   Pending: ${report.tasksPending}`,
      '',
      `📋 *Checklist*`,
      `   Progress: ${report.checklistProgress.completed}/${report.checklistProgress.total}`,
      '',
      `🔧 *Incidents*`,
      `   Open: ${report.incidentsOpen}`,
      `   Resolved today: ${report.incidentsResolved}`,
      '',
      `🖥️ Server: ${report.serverStatus}`,
    ];

    if (report.topIssues.length > 0) {
      lines.push('', `⚠️ *Top Issues*`);
      report.topIssues.forEach((issue) => lines.push(`   • ${issue}`));
    }

    lines.push('', `💡 ${report.summary}`);
    return lines.join('\n');
  }

  private buildSummary(stats: {
    tasksCompleted: number;
    tasksPending: number;
    tasksCreated: number;
    incidentsOpen: number;
    incidentsResolved: number;
    checklistTotal: number;
    checklistDone: number;
  }): string {
    const parts: string[] = [];

    if (stats.tasksCompleted > 0) {
      parts.push(`${stats.tasksCompleted} tasks completed`);
    }
    if (stats.tasksPending > 3) {
      parts.push(`${stats.tasksPending} tasks pending attention`);
    }
    if (stats.incidentsOpen > 0) {
      parts.push(`${stats.incidentsOpen} open incidents need resolution`);
    }
    if (stats.checklistTotal > 0 && stats.checklistDone < stats.checklistTotal) {
      parts.push(`checklist ${Math.round((stats.checklistDone / stats.checklistTotal) * 100)}% done`);
    }

    return parts.length > 0 ? parts.join('; ') + '.' : 'All clear for today.';
  }

  /**
   * Generates a monthly weighted SLA summary (Phase 5).
   */
  async generateWeightedSLASummary(slaService: any, month?: number, year?: number): Promise<string> {
    const now = new Date();
    const m = month ?? now.getMonth();
    const y = year ?? now.getFullYear();

    const report = await slaService.calculateWeightedMonthlyPerformance(m, y);
    
    const lines = [
      `📈 *neuCentrIX Monthly SLA Report*`,
      `Period: ${report.period}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ...report.breakdown.map((b: any) => 
        `${b.compliance >= 100 ? '✅' : '⚠️'} *${b.category}*: ${b.compliance}% (Weight: ${b.weight}%) → *${b.weightedScore}%*`
      ),
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏆 *TOTAL SCORE: ${report.totalScore}%*`,
      '',
      `Target: 100% | Status: ${report.totalScore >= 99 ? 'PERFECT' : report.totalScore >= 95 ? 'GOOD' : 'CRITICAL'}`,
    ];

    return lines.join('\n');
  }
}
