import { ILogger } from '@pjtaudirabot/core';
import { TaskManagerService } from '../task-manager';
import { DocumentationService } from '../documentation';
import { ReminderService } from '../reminders';
import { KnowledgeBaseService } from '../knowledge';

export type IntentType =
  | 'task'
  | 'incident'
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
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'intent-detector' });
  }

  /**
   * Detect the intent of a message and return structured result.
   */
  detect(message: string): DetectedIntent {
    const lower = message.toLowerCase().trim();

    // Greetings
    if (this.isGreeting(lower)) {
      return { type: 'greeting', confidence: 0.9 };
    }

    // Reminder detection (highest priority - user explicitly asking)
    if (this.reminderService.detectReminder(message)) {
      return { type: 'reminder', confidence: 0.85 };
    }

    // Incident detection
    if (this.documentation.detectIncident(message)) {
      return { type: 'incident', confidence: 0.8 };
    }

    // Knowledge query
    if (this.knowledgeBase.detectQuery(message)) {
      return { type: 'knowledge_query', confidence: 0.75 };
    }

    // Task detection
    const extracted = this.taskManager.extractTask(message);
    if (extracted) {
      return { type: 'task', confidence: 0.7, data: extracted };
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
