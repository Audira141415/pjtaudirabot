import { PrismaClient, TemplateCategory } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';

export class AutomationService {
  private logger: ILogger;

  constructor(private db: PrismaClient, logger: ILogger) {
    this.logger = logger.child({ service: 'automation' });
  }

  // --- Template Management ---

  async createTemplate(data: { name: string; category: TemplateCategory; body: string; variables?: string[], createdBy?: string }) {
    return this.db.messageTemplate.create({
      data: {
        name: data.name,
        category: data.category,
        body: data.body,
        variables: data.variables || [],
        createdBy: data.createdBy,
        isActive: true,
      },
    });
  }

  async listTemplates(category?: TemplateCategory) {
    return this.db.messageTemplate.findMany({
      where: category ? { category } : {},
      orderBy: { name: 'asc' },
    });
  }

  async getTemplate(idOrName: string) {
    return this.db.messageTemplate.findFirst({
      where: {
        OR: [
          { id: idOrName },
          { name: idOrName },
        ],
      },
    });
  }

  async renderTemplate(templateId: string, variables: Record<string, string>) {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    let content = template.body;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    await this.db.messageTemplate.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 } },
    });

    return content;
  }

  // --- Automation Rules ---

  async createRule(data: { name: string; triggerEvent: string; conditions: any; actions: any; channels?: string[], createdBy?: string }) {
    return this.db.notificationRule.create({
      data: {
        name: data.name,
        triggerEvent: data.triggerEvent,
        conditions: data.conditions || [],
        actions: data.actions || [],
        channels: data.channels || [],
        createdBy: data.createdBy,
        isActive: true,
      },
    });
  }

  async listRules() {
    return this.db.notificationRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async triggerEvent(event: string, context: any) {
    this.logger.info(`Triggering event: ${event}`, { context });
    
    const rules = await this.db.notificationRule.findMany({
      where: { triggerEvent: event, isActive: true },
    });

    for (const rule of rules) {
      try {
        await this.executeRule(rule, context);
      } catch (e: any) {
        this.logger.error(`Failed to execute rule ${rule.name}`, e);
      }
    }
  }

  private async executeRule(rule: any, context: any) {
    // Basic condition evaluation (simplified for now)
    // In a real system, we'd use a rule engine like json-rules-engine
    this.logger.info(`Executing rule: ${rule.name}`, { context });
    
    // Increment trigger count
    await this.db.notificationRule.update({
      where: { id: rule.id },
      data: { 
        triggerCount: { increment: 1 },
        lastTriggered: new Date()
      },
    });

    // Execute actions (placeholder for now)
    // For Phase 2, we just log it or send a notification if specified
  }
}
