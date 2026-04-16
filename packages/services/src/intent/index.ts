import { ILogger } from '@pjtaudirabot/core';
import { TaskManagerService } from '../task-manager';
import { DocumentationService } from '../documentation';
import { ReminderService } from '../reminders';
import { KnowledgeBaseService } from '../knowledge';
import { DataExtractionService } from '../data-extraction';
import { TicketService } from '../ticket';
import { SLAService } from '../sla';
import { SheetsService } from '../sheets';

export type IntentType =
  | 'task'
  | 'incident'
  | 'report'             // New structured report intent
  | 'reminder'
  | 'knowledge_query'
  | 'greeting'
  | 'unknown';

export interface DetectedIntent {
  type: IntentType;
  confidence: number;
  data?: any;
}

/**
 * Rule-based intent detection for incoming messages.
 * Routes messages to the appropriate service without requiring a ! prefix.
 */
export class IntentDetector {
  private logger: ILogger;

  constructor(
    private taskManager: TaskManagerService,
    private documentation: DocumentationService,
    private reminderService: ReminderService,
    private knowledgeBase: KnowledgeBaseService,
    private dataExtraction: DataExtractionService,
    private ticketService: TicketService,
    private slaService: SLAService,
    private sheetsService: SheetsService | null,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'intent-detector' });
  }

  /**
   * Detect the intent of a message and return structured result.
   */
  detect(message: string): DetectedIntent {
    const lower = message.toLowerCase().trim();

    // 1. Structured Report detection (Highest priority - Template-based)
    const extraction = this.dataExtraction.extract(message);
    if (extraction.isValid && extraction.fieldCount >= 3) {
      return { type: 'report', confidence: 0.95, data: extraction };
    }

    // 2. Greetings
    if (this.isGreeting(lower)) {
      return { type: 'greeting', confidence: 0.9 };
    }

    // 3. Reminder detection
    if (this.reminderService.detectReminder(message)) {
      return { type: 'reminder', confidence: 0.85 };
    }

    // 4. Incident detection (Generic chat)
    if (this.documentation.detectIncident(message)) {
      return { type: 'incident', confidence: 0.8 };
    }

    // 5. Knowledge query
    if (this.knowledgeBase.detectQuery(message)) {
      return { type: 'knowledge_query', confidence: 0.75 };
    }

    // 6. Task detection
    const extractedTask = this.taskManager.extractTask(message);
    if (extractedTask) {
      return { type: 'task', confidence: 0.7, data: extractedTask };
    }

    return { type: 'unknown', confidence: 0 };
  }

  /**
   * Process a message based on detected intent.
   * Returns a response string or null if no action was taken.
   */
  async process(
    userId: string,
    message: string,
    platform: string
  ): Promise<string | null> {
    const intent = this.detect(message);

    this.logger.debug('Intent detected', {
      type: intent.type,
      confidence: intent.confidence,
      userId,
    });

    // Only act on high-confidence intents
    if (intent.confidence < 0.6) return null;

    switch (intent.type) {
      case 'report':
        return this.handleStructuredReport(userId, message, platform, intent.data);

      case 'task':
        return this.handleTask(userId, message, platform, intent.data);

      case 'incident':
        return this.handleIncident(userId, message);

      case 'reminder':
        return this.handleReminder(userId, message, platform);

      case 'knowledge_query':
        return this.handleKnowledgeQuery(userId, message);

      case 'greeting':
        return this.handleGreeting();

      default:
        return null;
    }
  }

  private async handleStructuredReport(
    userId: string,
    message: string,
    platform: string,
    extraction: any
  ): Promise<string> {
    const data = extraction.data;
    
    // Create high-fidelity ticket
    const ticket = await this.ticketService.create({
      createdById: userId,
      title: `${data.customer ?? 'Client'} - ${data.problem ?? 'Support Request'}`,
      description: message,
      problem: data.problem ?? message,
      customer: data.customer,
      location: data.location,
      ao: data.ao,
      sid: data.sid,
      service: data.service,
      hostnameSwitch: data.hostnameSwitch,
      port: data.port,
      vlanId: data.vlanId,
      ipAddress: data.ipAddress,
      gateway: data.gateway,
      subnet: data.subnet,
      source: platform.toUpperCase() as any,
      sourceMessage: message,
    });

    // Determine priority and start SLA
    const priority = (message.toLowerCase().includes('critical') || extraction.priorityScore >= 8) 
      ? 'CRITICAL' 
      : 'MEDIUM';
    
    await this.slaService.startTracking(ticket.id, priority as any, ticket.category, ticket.problem);
    
    // Immediate GSheet Sync
    if (this.sheetsService) {
      await this.ticketService.syncSingleTicket(ticket.id).catch(err => {
        this.logger.error('Failed immediate gsheet sync for structured report', err);
      });
    }

    let response = `✅ *Structured Ticket Created*\n\n`;
    response += `🎫 *No:* ${ticket.ticketNumber}\n`;
    response += `📌 *Title:* ${ticket.title}\n`;
    response += `👤 *Customer:* ${data.customer ?? '-'}\n`;
    response += `📍 *Location:* ${data.location ?? '-'}\n`;
    response += `⚠️ *Priority:* ${priority}\n`;
    response += `⏱️ *SLA:* ${priority === 'CRITICAL' ? '2 Hours' : '4 Hours'} (Resolution)\n\n`;
    response += `_Data extracted automatically from template._`;
    
    return response;
  }

  private async handleTask(
    userId: string,
    message: string,
    platform: string,
    extractedData: any
  ): Promise<string> {
    const task = await this.taskManager.createTask(userId, extractedData, message, platform);
    let response = `✅ *Task Saved*\n\n📌 ${task.title}`;
    if (task.dueDate) {
      response += `\n🕐 Due: ${task.dueDate.toLocaleString('id-ID', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })}`;
    }
    response += '\n\n_Task synced to database & sheets_';
    return response;
  }

  private async handleIncident(
    userId: string,
    message: string
  ): Promise<string> {
    const extracted = this.documentation.extractIncident(message);
    const incident = await this.documentation.createIncident(userId, extracted, message);

    // Also store in knowledge base if solution is provided
    if (extracted.solution) {
      await this.knowledgeBase.storeFromIncident(userId, {
        title: extracted.title,
        service: extracted.service,
        rootCause: extracted.rootCause,
        solution: extracted.solution,
        description: message,
      }).catch(() => {});
    }

    return this.documentation.formatIncident(extracted, incident.id);
  }

  private async handleReminder(
    userId: string,
    message: string,
    platform: string
  ): Promise<string> {
    const extracted = this.reminderService.extractReminder(message, platform);
    if (!extracted) {
      return '⚠️ Could not understand the reminder time. Try: "ingatkan saya jam 5" or "remind me in 30 minutes"';
    }

    const reminder = await this.reminderService.createReminder({
      userId,
      ...extracted,
    });

    return this.reminderService.formatConfirmation(reminder);
  }

  private async handleKnowledgeQuery(
    userId: string,
    message: string
  ): Promise<string> {
    const results = await this.knowledgeBase.search(userId, message);
    return this.knowledgeBase.formatResults(results);
  }

  private handleGreeting(): string {
    const greetings = [
      '👋 Hello! I\'m your personal assistant. How can I help you today?\n\nType !help to see all commands.',
      '🤖 Hi there! Ready to assist with tasks, DevOps, and more.\n\nType !help for commands.',
      '👋 Halo! Siap membantu. Ketik !help untuk melihat semua perintah.',
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private isGreeting(msg: string): boolean {
    return /^(hi|hello|hey|halo|hai|yo|sup|good morning|selamat pagi|selamat siang|selamat malam)\b/i.test(msg);
  }
}
