import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { GoogleSheetsService } from '../sheets';

export interface ExtractedIncident {
  title: string;
  description: string;
  rootCause?: string;
  solution?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  service?: string;
  tags: string[];
}

export class DocumentationService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private sheets: GoogleSheetsService | null,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'documentation' });
  }

  /**
   * Detect if a message describes a technical incident/fix.
   */
  detectIncident(message: string): boolean {
    const patterns = [
      /\b(error|bug|crash|down|issue|problem|masalah)\b/i,
      /\b(fix|fixed|solved|resolved|perbaiki|diperbaiki|selesai)\b/i,
      /\b(karena|because|caused by|root cause)\b/i,
      /\b(restart|reboot|rollback|hotfix|patch)\b/i,
      /\b(502|503|500|404|timeout|outage)\b/i,
      /\b(port bentrok|conflict|gagal|failed)\b/i,
    ];
    return patterns.some((p) => p.test(message));
  }

  /**
   * Extract incident information from a message.
   */
  extractIncident(message: string): ExtractedIncident {
    return {
      title: this.extractIncidentTitle(message),
      description: message,
      rootCause: this.extractRootCause(message) ?? undefined,
      solution: this.extractSolution(message) ?? undefined,
      severity: this.extractSeverity(message),
      service: this.extractService(message) ?? undefined,
      tags: this.extractIncidentTags(message),
    };
  }

  /**
   * Save an incident to DB and Sheets.
   */
  async createIncident(
    userId: string,
    incident: ExtractedIncident,
    sourceMessage: string,
    platform?: string
  ): Promise<{ id: string; title: string }> {
    const record = await this.db.incident.create({
      data: {
        userId,
        title: incident.title,
        description: incident.description,
        rootCause: incident.rootCause ?? null,
        solution: incident.solution ?? null,
        severity: incident.severity,
        status: incident.solution ? 'RESOLVED' : 'OPEN',
        service: incident.service ?? null,
        tags: incident.tags,
        sourceMessage,
        resolvedAt: incident.solution ? new Date() : null,
        platform: platform?.toUpperCase() as any ?? null,
      },
    });

    // Sync to Sheets
    if (this.sheets?.isAvailable()) {
      this.sheets.syncIncident({
        id: record.id,
        user: '',
        title: record.title,
        issue: `${record.severity} - ${record.service ?? 'unknown'}`,
        rootCause: record.rootCause ?? undefined,
        solution: record.solution ?? undefined,
        createdAt: record.createdAt,
      }).catch((err) => this.logger.error('Sheet sync failed', err));
    }

    this.logger.info('Incident documented', { id: record.id, title: record.title });
    return { id: record.id, title: record.title };
  }

  /**
   * List recent incidents.
   */
  async listIncidents(
    userId: string,
    options?: { status?: string; service?: string; limit?: number }
  ): Promise<any[]> {
    const where: any = { userId };
    if (options?.status) where.status = options.status;
    if (options?.service) where.service = { contains: options.service, mode: 'insensitive' };

    return this.db.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 10,
    });
  }

  /**
   * Update an incident (add root cause / solution).
   */
  async resolveIncident(
    incidentId: string,
    rootCause?: string,
    solution?: string
  ): Promise<boolean> {
    const data: any = {};
    if (rootCause) data.rootCause = rootCause;
    if (solution) {
      data.solution = solution;
      data.status = 'RESOLVED';
      data.resolvedAt = new Date();
    }

    const result = await this.db.incident.update({
      where: { id: incidentId },
      data,
    });

    return !!result;
  }

  /**
   * Format incident for chat response.
   */
  formatIncident(incident: ExtractedIncident, id: string): string {
    let msg = `📋 *Incident Logged*\n\n`;
    msg += `🆔 ${id}\n`;
    msg += `📌 ${incident.title}\n`;
    msg += `⚠️ Severity: ${incident.severity}\n`;
    if (incident.service) msg += `🔧 Service: ${incident.service}\n`;
    if (incident.rootCause) msg += `🔍 Root Cause: ${incident.rootCause}\n`;
    if (incident.solution) msg += `✅ Solution: ${incident.solution}\n`;
    if (incident.tags.length > 0) msg += `🏷️ Tags: ${incident.tags.join(', ')}\n`;
    return msg;
  }

  // ── Private helpers ──

  private extractIncidentTitle(msg: string): string {
    // Try to extract a concise title
    const errorMatch = msg.match(/(?:error|issue|problem|masalah|bug)\s+(.{5,50}?)(?:\.|,|karena|because|$)/i);
    if (errorMatch) return errorMatch[1].trim();

    const fixMatch = msg.match(/(?:fix|perbaiki|solve)\s+(.{5,50}?)(?:\.|,|karena|because|$)/i);
    if (fixMatch) return fixMatch[1].trim();

    // Fallback: first 60 chars
    const clean = msg.replace(/^(tadi|barusan|kemarin)\s+/i, '');
    return clean.length > 60 ? clean.substring(0, 60).trim() + '...' : clean;
  }

  private extractRootCause(msg: string): string | null {
    const patterns = [
      /(?:karena|because|caused by|root cause[:\s]*)\s*(.{5,100}?)(?:\.|$)/i,
      /(?:penyebab(?:nya)?[:\s]*)\s*(.{5,100}?)(?:\.|$)/i,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return m[1].trim();
    }
    return null;
  }

  private extractSolution(msg: string): string | null {
    const patterns = [
      /(?:fix|solved|resolved|solution|diperbaiki|solusi(?:nya)?)[:\s]+(.{5,150}?)(?:\.|$)/i,
      /(?:dengan cara|by|with)\s+(.{5,150}?)(?:\.|$)/i,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return m[1].trim();
    }
    return null;
  }

  private extractSeverity(msg: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (/\b(critical|outage|down|502|503|crash)\b/i.test(msg)) return 'CRITICAL';
    if (/\b(error|failed|gagal|500)\b/i.test(msg)) return 'HIGH';
    if (/\b(warning|warn|slow|lambat)\b/i.test(msg)) return 'MEDIUM';
    return 'LOW';
  }

  private extractService(msg: string): string | null {
    const services = [
      'nginx', 'apache', 'docker', 'postgresql', 'postgres', 'mysql',
      'redis', 'mongodb', 'node', 'pm2', 'systemd', 'kubernetes', 'k8s',
      'caddy', 'haproxy', 'grafana', 'prometheus', 'jenkins', 'gitlab',
    ];
    const lower = msg.toLowerCase();
    return services.find((s) => lower.includes(s)) ?? null;
  }

  private extractIncidentTags(msg: string): string[] {
    const tags: string[] = [];
    if (/\b(nginx|apache|caddy|webserver)\b/i.test(msg)) tags.push('webserver');
    if (/\b(docker|container|k8s|kubernetes)\b/i.test(msg)) tags.push('containers');
    if (/\b(database|db|postgres|mysql|redis|mongo)\b/i.test(msg)) tags.push('database');
    if (/\b(network|dns|ssl|tls|port)\b/i.test(msg)) tags.push('network');
    if (/\b(memory|cpu|disk|storage)\b/i.test(msg)) tags.push('resources');
    if (/\b(deploy|ci|cd|pipeline)\b/i.test(msg)) tags.push('deployment');
    return tags;
  }
}
