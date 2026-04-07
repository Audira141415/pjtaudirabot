import { PrismaClient, HealthStatus } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

const DEFAULT_BRANCHES = [
  { branchId: 'JKT-HQ', name: 'Jakarta HQ', region: 'Java', city: 'Jakarta' },
  { branchId: 'SBY-BRANCH', name: 'Surabaya Branch', region: 'Java', city: 'Surabaya' },
  { branchId: 'BDG-BRANCH', name: 'Bandung Branch', region: 'Java', city: 'Bandung' },
  { branchId: 'MDN-BRANCH', name: 'Medan Branch', region: 'Sumatra', city: 'Medan' },
  { branchId: 'MKS-BRANCH', name: 'Makassar Branch', region: 'Eastern', city: 'Makassar' },
];

export interface BranchStatusUpdate {
  totalDevices?: number;
  activeDevices?: number;
  uptimePercent?: number;
  latencyMs?: number;
  jitterMs?: number;
  bandwidthIn?: number;
  bandwidthOut?: number;
  utilization?: number;
  criticalIncidents?: number;
  warningIncidents?: number;
}

export interface AuditResult {
  overallScore: number;
  categories: Record<string, { score: number; issues: string[]; metrics: Record<string, any> }>;
  criticalIssues: string[];
  actionItems: string[];
}

export class NetworkService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'network' });
  }

  /** Seed default branches */
  async seedBranches() {
    for (const b of DEFAULT_BRANCHES) {
      await this.db.networkBranch.upsert({
        where: { branchId: b.branchId },
        create: b,
        update: { name: b.name },
      });
    }
    this.logger.info('Default branches seeded');
  }

  /** Update branch status */
  async updateBranchStatus(branchId: string, update: BranchStatusUpdate) {
    const healthScore = this.calculateHealthScore(update);
    const healthStatus = this.getHealthStatus(healthScore);

    const branch = await this.db.networkBranch.upsert({
      where: { branchId },
      create: {
        branchId,
        name: branchId,
        region: 'Unknown',
        ...update,
        healthScore,
        healthStatus,
        lastUpdatedAt: new Date(),
      },
      update: {
        ...update,
        healthScore,
        healthStatus,
        lastUpdatedAt: new Date(),
      },
    });

    // Cache in Redis (5min TTL)
    await this.redis.setEx(`branch:${branchId}:status`, 300, JSON.stringify(branch));
    return branch;
  }

  /** Calculate health score (0-100) based on weighted metrics */
  private calculateHealthScore(data: BranchStatusUpdate): number {
    let score = 100;

    // Uptime (40% weight) — any drop from 100% penalizes
    if (data.uptimePercent != null) {
      score -= (100 - data.uptimePercent) * 0.4 * 10;
    }

    // Device availability (20% weight)
    if (data.totalDevices && data.activeDevices != null) {
      const availability = data.totalDevices > 0 ? (data.activeDevices / data.totalDevices) * 100 : 100;
      score -= (100 - availability) * 0.2 * 5;
    }

    // Latency (15% weight) — >50ms penalized
    if (data.latencyMs != null && data.latencyMs > 50) {
      score -= Math.min(15, (data.latencyMs - 50) * 0.15);
    }

    // Utilization (15% weight) — >80% risky
    if (data.utilization != null && data.utilization > 80) {
      score -= Math.min(15, (data.utilization - 80) * 0.75);
    }

    // Incidents (10% weight)
    if (data.criticalIncidents) score -= data.criticalIncidents * 5;
    if (data.warningIncidents) score -= data.warningIncidents * 2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getHealthStatus(score: number): HealthStatus {
    if (score >= 90) return 'HEALTHY';
    if (score >= 70) return 'DEGRADED';
    if (score >= 50) return 'WARNING';
    if (score > 0) return 'CRITICAL';
    return 'OFFLINE';
  }

  /** Get all branches sorted by health */
  async getAllBranches() {
    return this.db.networkBranch.findMany({ orderBy: { healthScore: 'asc' } });
  }

  /** Get regional summary */
  async getRegionalSummary() {
    const branches = await this.getAllBranches();
    const regions: Record<string, { branches: typeof branches; avgHealth: number }> = {};

    for (const b of branches) {
      if (!regions[b.region]) regions[b.region] = { branches: [], avgHealth: 0 };
      regions[b.region].branches.push(b);
    }

    for (const region of Object.values(regions)) {
      region.avgHealth = region.branches.length > 0
        ? Math.round(region.branches.reduce((s, b) => s + b.healthScore, 0) / region.branches.length)
        : 0;
    }

    return regions;
  }

  /** Perform a comprehensive network audit based on ticket data */
  async performAudit(dateFrom?: Date, dateTo?: Date): Promise<AuditResult> {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const extractions = await this.db.dataExtraction.findMany({ where });
    const tickets = await this.db.ticket.findMany({ where, include: { slaTracking: true } });

    const result: AuditResult = {
      overallScore: 0,
      categories: {},
      criticalIssues: [],
      actionItems: [],
    };

    // 1. Data Quality (25%)
    const dataQuality = this.auditDataQuality(extractions);
    result.categories['Data Quality'] = dataQuality;

    // 2. Compliance (25%)
    const compliance = this.auditCompliance(tickets);
    result.categories['Compliance'] = compliance;

    // 3. Performance (20%)
    const performance = this.auditPerformance(tickets);
    result.categories['Performance'] = performance;

    // 4. Security (15%)
    const security = this.auditSecurity(extractions);
    result.categories['Security'] = security;

    // 5. Process (15%)
    const process = this.auditProcess(tickets);
    result.categories['Process'] = process;

    // Weighted overall
    result.overallScore = Math.round(
      dataQuality.score * 0.25 +
      compliance.score * 0.25 +
      performance.score * 0.20 +
      security.score * 0.15 +
      process.score * 0.15
    );

    // Collect critical issues
    for (const cat of Object.values(result.categories)) {
      result.criticalIssues.push(...cat.issues.filter((i) => i.startsWith('🚨')));
    }

    // Generate action items
    if (dataQuality.score < 70) result.actionItems.push('📋 Improve data completeness — enforce mandatory fields');
    if (compliance.score < 70) result.actionItems.push('⏰ Reduce SLA breaches — review escalation rules');
    if (performance.score < 70) result.actionItems.push('🔧 Improve resolution speed — add more resources');
    if (result.overallScore < 50) result.actionItems.push('🚨 CRITICAL: Overall audit score below 50% — immediate action required');

    return result;
  }

  private auditDataQuality(extractions: any[]) {
    const issues: string[] = [];
    const total = extractions.length;
    if (total === 0) return { score: 100, issues: ['No data to audit'], metrics: {} };

    const mandatory = ['customer', 'location', 'problem', 'hostnameSwitch'];
    let completeCount = 0;
    const duplicateCount = extractions.filter((e) => e.isDuplicate).length;

    for (const ext of extractions) {
      const filled = mandatory.filter((f) => (ext as any)[f]).length;
      if (filled === mandatory.length) completeCount++;
    }

    const completeness = (completeCount / total) * 100;
    const dupRate = (duplicateCount / total) * 100;

    if (completeness < 80) issues.push(`🚨 Data completeness only ${Math.round(completeness)}% (target: 80%)`);
    if (dupRate > 10) issues.push(`⚠️ Duplicate rate ${Math.round(dupRate)}% (target: <10%)`);

    const score = Math.round(completeness * 0.7 + (100 - dupRate) * 0.3);
    return { score: Math.max(0, Math.min(100, score)), issues, metrics: { total, completeCount, duplicateCount, completeness, dupRate } };
  }

  private auditCompliance(tickets: any[]) {
    const issues: string[] = [];
    const total = tickets.length;
    if (total === 0) return { score: 100, issues: ['No tickets to audit'], metrics: {} };

    const withSLA = tickets.filter((t) => t.slaTracking);
    const responseBreached = withSLA.filter((t) => t.slaTracking?.responseBreached).length;
    const resolutionBreached = withSLA.filter((t) => t.slaTracking?.resolutionBreached).length;

    const responseCompliancePct = withSLA.length > 0 ? ((withSLA.length - responseBreached) / withSLA.length) * 100 : 100;
    const resolutionCompliancePct = withSLA.length > 0 ? ((withSLA.length - resolutionBreached) / withSLA.length) * 100 : 100;

    if (responseCompliancePct < 90) issues.push(`🚨 Response SLA compliance: ${Math.round(responseCompliancePct)}% (target: 90%)`);
    if (resolutionCompliancePct < 85) issues.push(`⚠️ Resolution SLA compliance: ${Math.round(resolutionCompliancePct)}% (target: 85%)`);

    const score = Math.round((responseCompliancePct + resolutionCompliancePct) / 2);
    return { score, issues, metrics: { total, responseBreached, resolutionBreached, responseCompliancePct, resolutionCompliancePct } };
  }

  private auditPerformance(tickets: any[]) {
    const issues: string[] = [];
    const resolved = tickets.filter((t) => t.slaTracking?.resolutionTimeMin != null);
    if (resolved.length === 0) return { score: 100, issues: ['No resolved tickets'], metrics: {} };

    const avgResMin = resolved.reduce((s, t) => s + (t.slaTracking?.resolutionTimeMin ?? 0), 0) / resolved.length;
    if (avgResMin > 480) issues.push(`⚠️ Avg resolution ${Math.round(avgResMin)}min exceeds 8hr target`);

    const score = Math.max(0, Math.min(100, Math.round(100 - (avgResMin / 480) * 50)));
    return { score, issues, metrics: { resolvedCount: resolved.length, avgResolutionMin: Math.round(avgResMin) } };
  }

  private auditSecurity(_extractions: any[]) {
    // Basic: check if any IP addresses are public/sensitive
    const issues: string[] = [];
    const score = 90; // Placeholder — in production, scan for leaked IPs etc.
    return { score, issues, metrics: {} };
  }

  private auditProcess(tickets: any[]) {
    const issues: string[] = [];
    const total = tickets.length;
    if (total === 0) return { score: 100, issues: [], metrics: {} };

    const unassigned = tickets.filter((t) => !t.assignedToId && ['OPEN', 'IN_PROGRESS'].includes(t.status)).length;
    const unassignedPct = (unassigned / total) * 100;
    if (unassignedPct > 20) issues.push(`⚠️ ${Math.round(unassignedPct)}% tickets unassigned`);

    const score = Math.max(0, Math.min(100, Math.round(100 - unassignedPct)));
    return { score, issues, metrics: { total, unassigned, unassignedPct } };
  }
}
