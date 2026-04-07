import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { GoogleSheetsService } from '../sheets';

export interface ChecklistTemplateInput {
  name: string;
  description?: string;
  items: Array<{ title: string; order: number }>;
  schedule?: string; // "daily", "weekly", "monthly"
}

export class ChecklistService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private sheets: GoogleSheetsService | null,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'checklist' });
  }

  /**
   * Create or update a checklist template.
   */
  async upsertTemplate(input: ChecklistTemplateInput): Promise<{ id: string; name: string }> {
    const template = await this.db.checklistTemplate.upsert({
      where: { name: input.name },
      create: {
        name: input.name,
        description: input.description,
        items: input.items,
        schedule: input.schedule,
      },
      update: {
        description: input.description,
        items: input.items,
        schedule: input.schedule,
      },
    });

    this.logger.info('Checklist template upserted', { name: input.name });
    return { id: template.id, name: template.name };
  }

  /**
   * Generate today's checklist items for a user from all active daily templates.
   */
  async generateDailyChecklist(userId: string): Promise<Array<{ id: string; title: string; isCompleted: boolean }>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const templates = await this.db.checklistTemplate.findMany({
      where: { isActive: true, schedule: 'daily' },
    });

    const results: Array<{ id: string; title: string; isCompleted: boolean }> = [];

    for (const template of templates) {
      const items = template.items as Array<{ title: string; order: number }>;

      for (const item of items) {
        // Check if already generated for today
        const existing = await this.db.checklistItem.findFirst({
          where: {
            templateId: template.id,
            userId,
            title: item.title,
            scheduledDate: today,
          },
        });

        if (existing) {
          results.push({ id: existing.id, title: existing.title, isCompleted: existing.isCompleted });
        } else {
          const created = await this.db.checklistItem.create({
            data: {
              templateId: template.id,
              userId,
              title: item.title,
              scheduledDate: today,
            },
          });
          results.push({ id: created.id, title: created.title, isCompleted: false });
        }
      }
    }

    results.sort((a, b) => (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0));
    return results;
  }

  /**
   * Mark a checklist item as done by title search.
   */
  async completeItem(
    userId: string,
    searchText: string,
    notes?: string
  ): Promise<{ found: boolean; title?: string }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const item = await this.db.checklistItem.findFirst({
      where: {
        userId,
        isCompleted: false,
        scheduledDate: today,
        title: { contains: searchText, mode: 'insensitive' },
      },
      include: { template: true },
    });

    if (!item) return { found: false };

    const now = new Date();
    await this.db.checklistItem.update({
      where: { id: item.id },
      data: { isCompleted: true, completedAt: now, notes },
    });

    // Sync to sheets
    if (this.sheets?.isAvailable()) {
      this.sheets.appendToSheet('tasks', {
        ID: item.id,
        User: '',
        Title: `[Checklist] ${item.template.name}: ${item.title}`,
        Description: notes ?? '',
        Status: 'done',
        Priority: 'medium',
        'Due Date': item.scheduledDate?.toISOString() ?? '',
        'Created At': now.toISOString(),
      }).catch((err) => this.logger.error('Sheet sync failed', err));
    }

    return { found: true, title: item.title };
  }

  /**
   * Get today's checklist progress.
   */
  async getTodayProgress(userId: string): Promise<{
    total: number;
    completed: number;
    pending: string[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = await this.db.checklistItem.findMany({
      where: { userId, scheduledDate: today },
    });

    const completed = items.filter((i: any) => i.isCompleted).length;
    const pending = items.filter((i: any) => !i.isCompleted).map((i: any) => i.title);

    return { total: items.length, completed, pending };
  }

  /**
   * Format checklist for chat message.
   */
  formatChecklist(items: Array<{ title: string; isCompleted: boolean }>): string {
    if (items.length === 0) return '📋 No checklist items for today.';

    const lines = items.map((item, i) => {
      const icon = item.isCompleted ? '✅' : '⬜';
      return `${icon} ${i + 1}. ${item.title}`;
    });

    const completed = items.filter((i) => i.isCompleted).length;
    const header = `📋 *Daily Checklist* (${completed}/${items.length})\n`;
    return header + lines.join('\n');
  }

  /**
   * Seed the default DevOps daily checklist.
   */
  async seedDefaults(): Promise<void> {
    await this.upsertTemplate({
      name: 'devops-daily',
      description: 'Daily DevOps checklist',
      schedule: 'daily',
      items: [
        { title: 'Check server status', order: 1 },
        { title: 'Check backup status', order: 2 },
        { title: 'Review error logs', order: 3 },
        { title: 'Check disk usage', order: 4 },
        { title: 'Check SSL certificates', order: 5 },
        { title: 'Review Docker containers', order: 6 },
        { title: 'Check monitoring alerts', order: 7 },
      ],
    });

    this.logger.info('Default checklist templates seeded');
  }
}
