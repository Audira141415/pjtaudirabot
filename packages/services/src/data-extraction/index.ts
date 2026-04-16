import { PrismaClient, TicketCategory } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { resolveLocation } from '../data/neucentrix-locations';

/**
 * NOC Data Extraction Service — migrated from bot old dataExtractionService.js
 * Auto-detects 15+ field patterns from WhatsApp NOC messages.
 */

export interface ExtractedNOCData {
  customer?: string;
  location?: string;  // Lokasi (physical location: DC, kota, site)
  alokasi?: string;   // Alokasi (infrastructure allocation: hostname/switch + port)
  ao?: string;
  sid?: string;
  service?: string;
  vlanId?: string;
  vlanType?: string;
  vlanName?: string;
  hostnameSwitch?: string;
  port?: string;
  ipAddress?: string;
  gateway?: string;
  subnet?: string;
  mode?: string;
  problem?: string;
  notes?: string;
}

export interface ExtractionResult {
  data: ExtractedNOCData;
  fieldCount: number;
  category: TicketCategory;
  priorityScore: number;
  isValid: boolean;
}

// Category keywords for classification
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  DOWN: ['down', 'mati', 'offline', 'unreachable', 'outage', 'putus', 'loss'],
  SLOW: ['slow', 'lambat', 'intermittent', 'flapping', 'latency', 'jitter', 'delay'],
  MAINTENANCE: ['maintenance', 'pemeliharaan', 'pm', 'scheduled', 'upgrade', 'patching'],
  REQUEST: ['request', 'permintaan', 'new', 'baru', 'tambah', 'add', 'pasang'],
  CONFIGURATION: ['config', 'konfigurasi', 'setting', 'change', 'modify', 'update vlan'],
};

const VIP_KEYWORDS = ['bank', 'telkom', 'xl', 'indosat', 'government', 'pemerintah', 'bumn', 'pertamina', 'pln'];

export class DataExtractionService {
  constructor(
    private db: PrismaClient,
    _logger: ILogger,
  ) {}

  private stripLeadingAliases(value: string, aliases: string[]): string {
    let cleaned = value.trim();
    let changed = true;

    while (changed) {
      changed = false;
      for (const alias of aliases) {
        const pattern = new RegExp(`^${alias}\\s*[:=\\-]\\s*`, 'i');
        if (pattern.test(cleaned)) {
          cleaned = cleaned.replace(pattern, '').trim();
          changed = true;
        }
      }
    }

    return cleaned;
  }

  private normalizeHostnameSwitch(value?: string): string | undefined {
    if (!value) return undefined;

    const cleaned = this.stripLeadingAliases(value, [
      'description',
      'desc',
      'hostname\\/?switch',
      'hostname',
      'switch',
      'perangkat',
    ]);

    return cleaned || undefined;
  }

  /** Normalize port/interface notation: ethernet8 → port 8, GE0/0 remains as-is */
  private normalizePort(value?: string): string | undefined {
    if (!value) return undefined;
    
    let normalized = value.trim();
    
    // Convert ethernet<N> to port <N>
    normalized = normalized.replace(/^ethernet(\d+)$/i, 'port $1');
    
    return normalized || undefined;
  }

  /** Build alokasi (infrastructure allocation) from hostname/switch + port */
  private buildAlokasi(hostname?: string, port?: string): string | undefined {
    const parts: string[] = [];
    if (hostname) parts.push(hostname);
    if (port) parts.push(port);
    
    return parts.length > 0 ? parts.join(' / ') : undefined;
  }

  /** Extract structured data from a raw NOC message */
  extract(message: string): ExtractionResult {
    const data = this.extractFields(message);
    const fieldCount = Object.values(data).filter(Boolean).length;
    const category = this.categorize(data.problem ?? message);
    const priorityScore = this.calculatePriority(data, message);

    return {
      data,
      fieldCount,
      category,
      priorityScore,
      isValid: fieldCount >= 1,
    };
  }

  /** Extract individual fields via regex */
  private extractFields(msg: string): ExtractedNOCData {
    const lines = msg.replace(/\r/g, '');
    const get = (patterns: RegExp[]): string | undefined => {
      for (const p of patterns) {
        const m = lines.match(p);
        if (m?.[1]?.trim()) return m[1].trim();
      }
      return undefined;
    };

    const hostnameSwitch = this.normalizeHostnameSwitch(get([
      /(?:hostname\s*(?:switch)?|hostname\/switch|switch|perangkat)\s*[:\-=]\s*(.+)/i,
      /\b([A-Z]{2,3}-[A-Z]{3,6}-\w+)\b/,
    ]));

    const rawPort = get([
      /(?:port|interface)\s*[:\-=]\s*(.+)/i,
      /\b((?:GE|FE|TE|XE|ET)\d+\/\d+(?:\/\d+)?)\b/i,
    ]);
    const normalizedPort = this.normalizePort(rawPort);

    return {
      location: (() => {
        const raw = get([
          /(?:lokasi|location|site)(?:\s+neucentrix)?\s*[:\-=]\s*(.+)/i,
          /(?:^|\n)\s*(?:neucentrix|ncx|dc)\s*[:\-=]?\s*([^\n]+)/i,
        ]);
        if (!raw) return undefined;
        return resolveLocation(raw)?.fullName ?? raw;
      })(),
      customer: get([
        /(?:nama\s*(?:cust|customer|pelanggan)|customer\s*name)\s*[:\-=]\s*(.+)/i,
        /(?:cust|customer|pelanggan)\s*[:\-=]\s*(.+)/i,
      ]),
      ao: get([/(?:ao|area\s*of\s*operation)\s*[:\-=]\s*(.+)/i]),
      sid: get([
        /(?:sid|service\s*id)\s*[:\-=]\s*(.+)/i,
        /(?:id\s*layanan)\s*[:\-=]\s*(.+)/i,
      ]),
      service: get([
        /(?:layanan|service|produk|product)\s*[:\-=]\s*(.+)/i,
        /\b(metro[-\s]?e|iptransit|iptx|ip\s*transit|dedicated|cloud|colocation)\b/i,
      ]),
      vlanId: get([
        /(?:vlan\s*(?:id|id\s*vlan)?)\s*[:\-=]\s*(\d{1,5})/i,
        /vlan\s+(\d{1,5})/i,
      ]),
      hostnameSwitch,
      port: normalizedPort,
      alokasi: this.buildAlokasi(hostnameSwitch, normalizedPort),
      ipAddress: get([
        /(?:ip\s*(?:address|customer|cust|p2p|point\s*to\s*point)?)\s*[:\-=]\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:\/\d{1,2})?)/i,
      ]),
      gateway: get([/(?:gateway|gw)\s*[:\-=]\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i]),
      subnet: get([/(?:subnet|mask|subnet\s*mask)\s*[:\-=]\s*(.+)/i]),
      mode: get([/(?:mode)\s*[:\-=]\s*(.+)/i]),
      problem: get([
        /(?:laporan\s*(?:gangguan\/request|gangguan|request)?|problem|masalah(?:\s+yang\s+terjadi)?|keluhan|issue|gangguan)\s*[:\-=]\s*(.+)/i,
        /(?:request|permintaan)\s*[:\-=]\s*(.+)/i,
        /a\.\s*(?:problem|masalah)(?:[^\/]*\/[^:]*)\s*[:\-=]\s*([^\.\n]+)/i,
      ]),
      notes: get([/(?:note|notes|catatan|keterangan)\s*[:\-=]\s*(.+)/i]),
    };
  }

  /** Categorize message as INCIDENT/REQUEST/MAINTENANCE/etc */
  categorize(text: string): TicketCategory {
    const lower = text.toLowerCase();
    let bestCategory: TicketCategory = 'INCIDENT';
    let bestScore = 0;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          // Keyword found early = higher weight
          const pos = lower.indexOf(kw);
          score += pos < lower.length / 2 ? 2 : 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = this.mapCategory(cat);
      }
    }

    // Force category from template if present
    if (lower.includes('category: incident')) bestCategory = 'INCIDENT';
    else if (lower.includes('category: fulfillment')) bestCategory = 'FULFILLMENT';
    else if (lower.includes('category: request')) bestCategory = 'REQUEST';

    return bestCategory;
  }

  private mapCategory(cat: string): TicketCategory {
    switch (cat) {
      case 'DOWN': case 'SLOW': return 'INCIDENT';
      case 'MAINTENANCE': return 'MAINTENANCE';
      case 'REQUEST': return 'REQUEST';
      case 'CONFIGURATION': return 'CONFIGURATION';
      default: return 'INCIDENT';
    }
  }

  /** Calculate priority score 1-10 */
  calculatePriority(data: ExtractedNOCData, rawMessage?: string): number {
    let score = 5; // baseline
    const text = `${data.problem ?? ''} ${rawMessage ?? ''}`.toLowerCase();

    // DOWN keywords → +3
    if (CATEGORY_KEYWORDS.DOWN.some((kw) => text.includes(kw))) score += 3;
    // SLOW keywords → +1
    else if (CATEGORY_KEYWORDS.SLOW.some((kw) => text.includes(kw))) score += 1;

    // Template-based CRITICAL priority → Force score 10
    if (text.includes('priority: critical')) score = 10;
    else if (text.includes('priority: high')) score += 3;

    // VIP customer → +2
    if (data.customer && VIP_KEYWORDS.some((kw) => data.customer!.toLowerCase().includes(kw))) score += 2;

    // Multiple VLANs mentioned → +1
    if (rawMessage) {
      const vlanMatches = rawMessage.match(/vlan/gi);
      if (vlanMatches && vlanMatches.length > 1) score += 1;
    }

    return Math.min(10, Math.max(1, score));
  }

  /** Split a message containing multiple records */
  splitMultipleRecords(message: string): string[] {
    // Try delimiter splitting
    for (const delim of ['====', '----', '____']) {
      if (message.includes(delim)) {
        return message.split(delim).map((s) => s.trim()).filter((s) => s.length > 20);
      }
    }

    // Try repeated "Lokasi" pattern
    const lokasiParts = message.split(/(?=(?:lokasi|location)\s*[:\-=])/i);
    if (lokasiParts.length > 1) {
      return lokasiParts.map((s) => s.trim()).filter((s) => s.length > 20);
    }

    return [message];
  }

  /** Check for duplicates using recent extractions */
  async checkDuplicate(data: ExtractedNOCData, windowMinutes = 60): Promise<{ isDuplicate: boolean; similarity: number; duplicateId?: string }> {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const recent = await this.db.dataExtraction.findMany({
      where: {
        createdAt: { gte: since },
        customer: data.customer ? { equals: data.customer, mode: 'insensitive' } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const existing of recent) {
      const sim = this.calculateSimilarity(data, {
        customer: existing.customer ?? undefined,
        location: existing.location ?? undefined,
        sid: existing.sid ?? undefined,
        hostnameSwitch: existing.hostnameSwitch ?? undefined,
        port: existing.port ?? undefined,
        problem: existing.problem ?? undefined,
      });

      if (sim >= 0.85) {
        return { isDuplicate: true, similarity: sim, duplicateId: existing.id };
      }
    }

    return { isDuplicate: false, similarity: 0 };
  }

  private calculateSimilarity(a: ExtractedNOCData, b: ExtractedNOCData): number {
    const weights: Record<string, number> = {
      customer: 0.3, location: 0.2, problem: 0.2, sid: 0.1, hostnameSwitch: 0.1, port: 0.1,
    };
    let totalWeight = 0;
    let matchWeight = 0;

    for (const [field, weight] of Object.entries(weights)) {
      const va = (a as any)[field]?.toLowerCase();
      const vb = (b as any)[field]?.toLowerCase();
      if (va && vb) {
        totalWeight += weight;
        if (va === vb) matchWeight += weight;
      }
    }

    return totalWeight > 0 ? matchWeight / totalWeight : 0;
  }

  /** Save extraction to database */
  async save(data: ExtractedNOCData, rawMessage: string, opts?: {
    ticketId?: string; extractedById?: string; platform?: string; groupId?: string;
    isDuplicate?: boolean; duplicateOfId?: string; category?: TicketCategory; priorityScore?: number;
  }) {
    const { alokasi: _alokasi, ...persistedData } = data;

    return this.db.dataExtraction.create({
      data: {
        ...persistedData,
        rawMessage,
        ticketId: opts?.ticketId,
        extractedById: opts?.extractedById,
        platform: opts?.platform?.toUpperCase() as any,
        groupId: opts?.groupId,
        isDuplicate: opts?.isDuplicate ?? false,
        duplicateOfId: opts?.duplicateOfId,
        category: opts?.category,
        priorityScore: opts?.priorityScore ?? 0,
      },
    });
  }
}
