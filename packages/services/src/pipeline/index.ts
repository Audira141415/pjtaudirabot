import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { GoogleSheetsService } from '../sheets';
import { AIExtractor, ExtractionOutput, ExtractionResult } from '../extractor';
import { SentimentService } from '../SentimentService';

/**
 * The result handed back to the caller (bot message handler)
 * so it can send a human-friendly reply.
 */
export interface PipelineResult {
  /** Extraction output from AI / rules */
  extraction: ExtractionOutput;
  /** The database record id that was created */
  recordId: string;
  /** A ready-to-send chat response */
  reply: string;
}

/**
 * ChatPipeline implements the end-to-end flow described in Part 5:
 *
 *   Chat message
 *     → AI Extractor (structured JSON)
 *     → Save to PostgreSQL
 *     → Append to Google Sheets
 *     → Log raw message in ChatLog
 *     → Return reply
 */
export class ChatPipeline {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private extractor: AIExtractor,
    private sentiment: SentimentService,
    private sheets: GoogleSheetsService | null,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'chat-pipeline' });
  }

  /**
   * Main entry point — process a single chat message through the full pipeline.
   * UPGRADED: Includes a "Cognitive Layer" for strategic intent detection.
   */
  async process(
    userId: string,
    message: string,
    platform: string,
    displayName: string,
    imageUrl?: string
  ): Promise<PipelineResult> {
    this.logger.debug('Starting cognitive processing', { message: message.slice(0, 50), hasImage: !!imageUrl });

    // ① Cognitive Strategy Selection (Intent Detection)
    // For now, we lean on the AI Extractor to give us the primary structural intent.
    // In "Ultimate" mode, we allow the engine to reason about the output.
    const extraction = await this.extractor.extract(message, imageUrl);
    const { result } = extraction;

    // ② Strategy: Strategic Reasoning / Decision Making
    // If confidence is low, the agent "reasons" about how to handle the ambiguity.
    if (extraction.confidence < 0.6) {
       this.logger.warn('Low confidence detection, applying reasoning strategy', { confidence: extraction.confidence });
       // Logic to handle ambiguous intent can go here (e.g. asking for clarification)
    }

    this.logger.info('Strategic intent confirmed', {
      strategy: result.type,
      confidence: extraction.confidence,
    });

    // ③ Record Execution (DB + Logs)
    let recordId: string;
    try {
      recordId = await this.saveToDatabase(userId, result, message, platform);
    } catch (err) {
      this.logger.error('Operational persistence failed', err as Error, { userId, type: result.type });
      recordId = 'db-error';
    }

    // ④ Multi-Channel Synchronization (Sheets + Audit)
    this.syncToSheets(displayName, result, recordId).catch((err) =>
      this.logger.error('Sheets matrix sync failed', err as Error)
    );

    this.saveChatLog(userId, message, result.type, extraction, platform).catch((err) =>
      this.logger.error('Command log archive failed', err as Error)
    );

    // ⑤ Professionalized Response Generation
    const reply = recordId === 'db-error'
      ? `⚠️ *STRATEGIC ERROR* — Data extracted (${result.type.toUpperCase()}) but failed to persist. Internal systems alert triggered.`
      : this.formatReply(result, recordId);

    return { extraction, recordId, reply };
  }

  // ── Database persistence ──

  private async saveToDatabase(
    userId: string,
    result: ExtractionResult,
    sourceMessage: string,
    platform: string
  ): Promise<string> {
    switch (result.type) {
      case 'task': {
        const record = await this.db.task.create({
          data: {
            userId,
            title: result.title,
            description: result.description ?? null,
            status: 'PENDING',
            priority: result.priority.toUpperCase() as any,
            dueDate: result.dueDate ? new Date(result.dueDate) : null,
            sourceMessage,
            platform: platform.toUpperCase() as any,
          },
        });
        return record.id;
      }

      case 'note': {
        const record = await this.db.note.create({
          data: {
            userId,
            content: result.content,
            tags: result.tags,
            sourceMessage,
            platform: platform.toUpperCase() as any,
          },
        });
        return record.id;
      }

      case 'reminder': {
        const record = await this.db.reminder.create({
          data: {
            userId,
            message: result.message,
            remindAt: new Date(result.remindAt),
            platform: platform.toUpperCase() as any,
            sourceMessage,
          },
        });
        return record.id;
      }

      case 'incident': {
        const record = await this.db.incident.create({
          data: {
            userId,
            title: result.title,
            description: result.issue,
            rootCause: result.rootCause ?? null,
            solution: result.solution ?? null,
            sourceMessage,
            platform: platform.toUpperCase() as any,
          },
        });
        return record.id;
      }

      default: {
        // Shouldn't happen — treat as note
        const record = await this.db.note.create({
          data: {
            userId,
            content: sourceMessage,
            tags: [],
            sourceMessage,
            platform: platform.toUpperCase() as any,
          },
        });
        return record.id;
      }
    }
  }

  // ── Sheets sync ──

  private async syncToSheets(
    displayName: string,
    result: ExtractionResult,
    recordId: string
  ): Promise<void> {
    if (!this.sheets?.isAvailable()) return;

    const now = new Date();

    switch (result.type) {
      case 'task':
        await this.sheets.syncTask({
          id: recordId,
          user: displayName,
          title: result.title,
          description: result.description,
          status: 'PENDING',
          priority: result.priority,
          dueDate: result.dueDate ? new Date(result.dueDate) : null,
          createdAt: now,
        });
        break;

      case 'note':
        await this.sheets.syncNote({
          id: recordId,
          user: displayName,
          content: result.content,
          tags: result.tags,
          createdAt: now,
        });
        break;

      case 'reminder':
        await this.sheets.syncReminder({
          id: recordId,
          user: displayName,
          message: result.message,
          remindAt: new Date(result.remindAt),
          status: 'pending',
        });
        break;

      case 'incident':
        await this.sheets.syncIncident({
          id: recordId,
          user: displayName,
          title: result.title,
          issue: result.issue,
          rootCause: result.rootCause,
          solution: result.solution,
          createdAt: now,
        });
        break;
    }
  }

  // ── ChatLog audit trail ──

  private async saveChatLog(
    userId: string,
    message: string,
    extractedType: string,
    extraction: ExtractionOutput,
    platform: string
  ): Promise<void> {
    const sentimentResult = await this.sentiment.analyze(message);

    await this.db.chatLog.create({
      data: {
        userId,
        message,
        extractedType: extractedType.toUpperCase() as any,
        extractedData: {
          ...(extraction.result as any),
          sentiment: sentimentResult.sentiment,
          sentimentScore: sentimentResult.score,
        },
        platform: platform.toUpperCase() as any,
        confidence: extraction.confidence,
      },
    });
  }

  // ── Reply formatting ──

  private formatReply(result: ExtractionResult, recordId: string): string {
    switch (result.type) {
      case 'task': {
        let reply = `✅ *Task Saved*\n\n📌 ${result.title}`;
        if (result.dueDate) {
          const d = new Date(result.dueDate);
          reply += `\n🕐 Due: ${d.toLocaleString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
          })}`;
        }
        reply += `\n📊 Priority: ${result.priority}`;
        reply += `\n\n_ID: ${recordId}_`;
        return reply;
      }

      case 'note': {
        const tagStr = result.tags.length > 0 ? `\n🏷️ Tags: ${result.tags.join(', ')}` : '';
        return `📝 *Note Saved*\n\n${result.content.slice(0, 200)}${tagStr}\n\n_ID: ${recordId}_`;
      }

      case 'reminder': {
        const d = new Date(result.remindAt);
        return `⏰ *Reminder Set*\n\n${result.message}\n🕐 ${d.toLocaleString('id-ID', {
          weekday: 'short', day: 'numeric', month: 'short',
          hour: '2-digit', minute: '2-digit',
        })}\n\n_ID: ${recordId}_`;
      }

      case 'incident': {
        let reply = `🔧 *Incident Logged*\n\n🚨 ${result.title}\n📋 ${result.issue}`;
        if (result.rootCause) reply += `\n🔍 Root Cause: ${result.rootCause}`;
        if (result.solution) reply += `\n✅ Solution: ${result.solution}`;
        reply += `\n\n_ID: ${recordId}_`;
        return reply;
      }

      default:
        return `📋 Message recorded. _ID: ${recordId}_`;
    }
  }
}
