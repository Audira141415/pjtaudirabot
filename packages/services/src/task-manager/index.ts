import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { GoogleSheetsService } from '../sheets';

export interface ExtractedTask {
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  dueDate?: Date;
  client?: string;
  location?: string;
  tags: string[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  category?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

export class TaskManagerService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private sheets: GoogleSheetsService | null,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'task-manager' });
  }

  /**
   * Extract task information from a natural language message using patterns.
   */
  extractTask(message: string): ExtractedTask | null {
    // Detect task-like patterns (Indonesian + English)
    const taskPatterns = [
      /\b(meeting|rapat|pertemuan)\b/i,
      /\b(deadline|tenggat)\b/i,
      /\b(review|check|periksa|cek)\b/i,
      /\b(fix|perbaiki|solve|selesaikan)\b/i,
      /\b(deploy|release|push)\b/i,
      /\b(backup|restore)\b/i,
      /\b(update|upgrade|patch)\b/i,
      /\b(install|setup|konfigurasi|configure)\b/i,
      /\b(buat|create|bikin|tulis|write)\b/i,
      /\b(kirim|send|email)\b/i,
      /\b(todo|task|tugas)\b/i,
    ];

    const isTask = taskPatterns.some((p) => p.test(message));
    if (!isTask) return null;

    const title = this.extractTitle(message);
    const dueDate = this.extractDateTime(message);
    const client = this.extractClient(message);
    const priority = this.extractPriority(message);
    const category = this.extractCategory(message);
    const tags = this.extractTags(message);

    return {
      title,
      description: message,
      priority,
      category: category || undefined,
      dueDate: dueDate || undefined,
      client: client || undefined,
      tags,
    };
  }

  /**
   * Create a task from extracted data and save to DB + Sheets.
   */
  async createTask(
    userId: string,
    extracted: ExtractedTask,
    sourceMessage: string,
    platform?: string
  ): Promise<{ id: string; title: string; dueDate?: Date }> {
    const task = await this.db.task.create({
      data: {
        userId,
        title: extracted.title,
        description: extracted.description,
        priority: extracted.priority,
        category: extracted.category ?? null,
        dueDate: extracted.dueDate ?? null,
        client: extracted.client ?? null,
        location: extracted.location ?? null,
        tags: extracted.tags,
        sourceMessage,
        platform: platform?.toUpperCase() as any ?? null,
      },
    });

    // Sync to Google Sheets (fire-and-forget)
    if (this.sheets?.isAvailable()) {
      this.sheets.syncTask({
        id: task.id,
        user: userId,
        title: task.title,
        description: task.description ?? undefined,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? undefined,
        createdAt: task.createdAt,
      }).catch((err) => this.logger.error('Sheet sync failed', err));
    }

    this.logger.info('Task created', { taskId: task.id, title: task.title });
    return { id: task.id, title: task.title, dueDate: extracted.dueDate };
  }

  async completeTask(taskId: string, userId: string): Promise<boolean> {
    const task = await this.db.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) return false;

    await this.db.task.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    this.logger.info('Task completed', { taskId });
    return true;
  }

  async completeTaskByTitle(searchText: string, userId: string): Promise<{ found: boolean; title?: string }> {
    const task = await this.db.task.findFirst({
      where: {
        userId,
        status: 'PENDING',
        title: { contains: searchText, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!task) return { found: false };

    await this.db.task.update({
      where: { id: task.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return { found: true, title: task.title };
  }

  async listTasks(userId: string, filters?: TaskFilters): Promise<any[]> {
    const where: any = { userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.dueBefore) where.dueDate = { ...(where.dueDate || {}), lte: filters.dueBefore };
    if (filters?.dueAfter) where.dueDate = { ...(where.dueDate || {}), gte: filters.dueAfter };

    return this.db.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    });
  }

  async getTodayTasks(userId: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.db.task.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        OR: [
          { dueDate: { gte: today, lt: tomorrow } },
          { dueDate: null, createdAt: { gte: today } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async getStats(userId: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  }> {
    const [total, pending, completed, overdue] = await Promise.all([
      this.db.task.count({ where: { userId } }),
      this.db.task.count({ where: { userId, status: 'PENDING' } }),
      this.db.task.count({ where: { userId, status: 'COMPLETED' } }),
      this.db.task.count({
        where: {
          userId,
          status: 'PENDING',
          dueDate: { lt: new Date() },
        },
      }),
    ]);
    return { total, pending, completed, overdue };
  }

  // ── Private extraction helpers ──

  private extractTitle(msg: string): string {
    // Clean up the message to a short title
    let title = msg.replace(/^(besok|hari ini|nanti|lusa|minggu depan)\s+/i, '');
    title = title.replace(/\b(jam|pukul)\s+\d{1,2}[:.]\d{0,2}\s*/gi, '');
    title = title.replace(/\b(dengan|sama|bersama|with)\s+\w+/i, (match) => match);
    // Limit to ~60 chars
    if (title.length > 60) title = title.substring(0, 60).trim() + '...';
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  private extractDateTime(msg: string): Date | null {
    const now = new Date();

    // "besok jam 10" / "tomorrow at 10"
    const besokJam = msg.match(/\b(besok|tomorrow)\b.*?\b(?:jam|at|pukul)\s*(\d{1,2})[:.:]?(\d{0,2})\b/i);
    if (besokJam) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(parseInt(besokJam[2], 10), parseInt(besokJam[3] || '0', 10), 0, 0);
      return d;
    }

    // "hari ini jam 15" / "today at 3pm"
    const hariIniJam = msg.match(/\b(hari ini|today)\b.*?\b(?:jam|at|pukul)\s*(\d{1,2})[:.:]?(\d{0,2})\b/i);
    if (hariIniJam) {
      const d = new Date(now);
      d.setHours(parseInt(hariIniJam[2], 10), parseInt(hariIniJam[3] || '0', 10), 0, 0);
      return d;
    }

    // "jam 10" / "at 10:30"
    const jamOnly = msg.match(/\b(?:jam|at|pukul)\s*(\d{1,2})[:.:]?(\d{0,2})\b/i);
    if (jamOnly) {
      const d = new Date(now);
      d.setHours(parseInt(jamOnly[1], 10), parseInt(jamOnly[2] || '0', 10), 0, 0);
      if (d < now) d.setDate(d.getDate() + 1);
      return d;
    }

    // "besok" / "tomorrow"
    if (/\b(besok|tomorrow)\b/i.test(msg)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0); // default 9 AM
      return d;
    }

    // "lusa" / "day after tomorrow"
    if (/\b(lusa|day after tomorrow)\b/i.test(msg)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      d.setHours(9, 0, 0, 0);
      return d;
    }

    return null;
  }

  private extractClient(msg: string): string | null {
    // "dengan client A" / "with client A" / "sama pak Budi"
    const patterns = [
      /\b(?:dengan|sama|bersama|with)\s+(?:client|klien|pak|bu|bapak|ibu|mr|mrs|ms)\.?\s+(\w+(?:\s+\w+)?)/i,
      /\bclient\s+(\w+(?:\s+\w+)?)/i,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return m[1].trim();
    }
    return null;
  }

  private extractPriority(msg: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (/\b(urgent|darurat|segera|asap|critical)\b/i.test(msg)) return 'URGENT';
    if (/\b(penting|important|high|tinggi)\b/i.test(msg)) return 'HIGH';
    if (/\b(low|rendah|nanti|kapan-kapan)\b/i.test(msg)) return 'LOW';
    return 'MEDIUM';
  }

  private extractCategory(msg: string): string | null {
    if (/\b(meeting|rapat|pertemuan)\b/i.test(msg)) return 'meeting';
    if (/\b(deploy|release|server|docker|nginx|devops)\b/i.test(msg)) return 'devops';
    if (/\b(bug|fix|error|perbaiki)\b/i.test(msg)) return 'bugfix';
    if (/\b(document|docs|laporan|report)\b/i.test(msg)) return 'documentation';
    if (/\b(backup|restore|database|db)\b/i.test(msg)) return 'infrastructure';
    return null;
  }

  private extractTags(msg: string): string[] {
    const tags: string[] = [];
    if (/\b(server|infrastructure|infra)\b/i.test(msg)) tags.push('server');
    if (/\b(docker|container)\b/i.test(msg)) tags.push('docker');
    if (/\b(nginx|apache|caddy)\b/i.test(msg)) tags.push('webserver');
    if (/\b(database|db|postgres|mysql|redis)\b/i.test(msg)) tags.push('database');
    if (/\b(meeting|rapat)\b/i.test(msg)) tags.push('meeting');
    if (/\b(client|klien)\b/i.test(msg)) tags.push('client');
    return tags;
  }
}
