import { ILogger } from '@pjtaudirabot/core';
import { IAIProvider, AIMessage } from '../ai/types';

// ── Output types ──

export type ExtractedType = 'task' | 'note' | 'reminder' | 'incident';

export interface ExtractedTask {
  type: 'task';
  title: string;
  description?: string;
  dueDate?: string;      // ISO-8601
  priority: 'low' | 'medium' | 'high';
}

export interface ExtractedNote {
  type: 'note';
  content: string;
  tags: string[];
}

export interface ExtractedReminder {
  type: 'reminder';
  message: string;
  remindAt: string;       // ISO-8601
}

export interface ExtractedIncident {
  type: 'incident';
  title: string;
  issue: string;
  rootCause?: string;
  solution?: string;
}

export type ExtractionResult =
  | ExtractedTask
  | ExtractedNote
  | ExtractedReminder
  | ExtractedIncident;

export interface ExtractionOutput {
  result: ExtractionResult;
  confidence: number;     // 0-1
  rawResponse: string;    // original LLM text for audit
}

// ── Prompt ──

function buildSystemPrompt(today: string): string {
  return `You are a strict data extraction engine.
Your ONLY job is to convert a raw chat message into EXACTLY ONE JSON object.

Today's date/time: ${today}

## Rules
1. Output ONLY valid JSON — no markdown fences, no explanation, no extra text.
2. Determine the message type using these rules:
   - "task"     → contains a verb/action + optional deadline (e.g. meeting, check, fix, deploy, review, kirim, buat, update)
   - "reminder" → explicitly asks to be reminded (ingatkan, remind, jangan lupa, don't forget)
   - "incident" → describes an error, outage, bug, crash, or fix (error, down, crash, fix, patch, rollback, perbaiki)
   - "note"     → anything that does not match the above three
3. For dates:
   - "besok" / "tomorrow" = today + 1 day
   - "lusa" = today + 2 days
   - "jam 10" / "at 10" = 10:00
   - Relative hours like "2 jam lagi" = now + 2h
   - Always return ISO-8601 format with timezone offset
4. For priority (only for tasks):
   - default: "medium"
   - "urgent" / "penting" / "segera" / "ASAP" → "high"
   - "santai" / "low priority" / "nanti aja" → "low"
5. For tags (only for notes): extract up to 5 relevant single-word tags from the content.
6. Respond in the LANGUAGE of the user's message for title/content/message fields.

## Output schemas

### task
{"type":"task","title":"<string>","description":"<string|omit>","dueDate":"<ISO-8601|omit>","priority":"low|medium|high"}

### note
{"type":"note","content":"<full message rephrased>","tags":["<tag>","<tag>"]}

### reminder
{"type":"reminder","message":"<what to remind>","remindAt":"<ISO-8601>"}

### incident
{"type":"incident","title":"<short title>","issue":"<what happened>","rootCause":"<why|omit>","solution":"<how it was fixed|omit>"}

Respond with ONLY the JSON object.`;
}

// ── Service class ──

export class AIExtractor {
  private logger: ILogger;

  constructor(
    private aiProvider: IAIProvider,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'ai-extractor' });
  }

  /**
   * Convert a raw chat message into a structured extraction result.
   * Falls back to rule-based extraction if the AI provider is unavailable.
   */
  async extract(message: string): Promise<ExtractionOutput> {
    // Guard against excessively long messages — truncate to avoid expensive AI calls
    const MAX_MSG_LENGTH = 2000;
    const trimmed = message.length > MAX_MSG_LENGTH
      ? message.slice(0, MAX_MSG_LENGTH)
      : message;

    const now = new Date();
    const todayStr = now.toISOString();

    // Try AI extraction first
    try {
      const available = await this.aiProvider.isAvailable();
      if (available) {
        return await this.extractWithAI(trimmed, todayStr);
      }
    } catch (err) {
      this.logger.warn('AI extraction failed, falling back to rules', { error: (err as Error).message });
    }

    // Fallback: rule-based
    return this.extractWithRules(trimmed, now);
  }

  // ── AI path ──

  private async extractWithAI(message: string, today: string): Promise<ExtractionOutput> {
    const messages: AIMessage[] = [
      { role: 'system', content: buildSystemPrompt(today) },
      { role: 'user', content: message },
    ];

    const response = await this.aiProvider.chat(messages, {
      temperature: 0.1,  // deterministic
      maxTokens: 512,
    });

    const raw = response.content.trim();
    const parsed = this.parseJSON(raw);

    if (!parsed || !parsed.type) {
      this.logger.warn('AI returned unparseable output, falling back', { raw });
      return this.extractWithRules(message, new Date());
    }

    const validated = this.validateShape(parsed);

    // Score confidence: 0.95 if all required fields present, 0.85 if we had to patch
    const confidence = validated === parsed ? 0.95 : 0.85;

    return {
      result: validated as ExtractionResult,
      confidence,
      rawResponse: raw,
    };
  }

  // ── Rule-based fallback ──

  private extractWithRules(message: string, now: Date): ExtractionOutput {
    const lower = message.toLowerCase();

    // Reminder
    if (/\b(remind|ingatkan|jangan lupa|don'?t forget)\b/i.test(message)) {
      const remindAt = this.parseTimeFromText(message, now);
      return {
        result: {
          type: 'reminder',
          message: message,
          remindAt: remindAt.toISOString(),
        },
        confidence: 0.7,
        rawResponse: '',
      };
    }

    // Incident — exclude "fix" alone (too generic), require error-context words
    if (/\b(error|down|crash|bug|patch|rollback|perbaiki|gagal|failed|outage)\b/i.test(message)) {
      return {
        result: {
          type: 'incident',
          title: message.slice(0, 80),
          issue: message,
          rootCause: undefined,
          solution: undefined,
        },
        confidence: 0.7,
        rawResponse: '',
      };
    }

    // Task
    if (/\b(meeting|rapat|check|cek|fix|deploy|review|buat|create|kirim|send|update|upgrade|install)\b/i.test(lower)) {
      const dueDate = this.parseTimeFromText(message, now);
      const hasDue = Math.abs(dueDate.getTime() - now.getTime()) > 1000; // >1s means a time was extracted
      return {
        result: {
          type: 'task',
          title: message.slice(0, 120),
          description: message,
          priority: /\b(urgent|penting|segera|asap)\b/i.test(message) ? 'high'
            : /\b(santai|low|nanti)\b/i.test(message) ? 'low'
            : 'medium',
          dueDate: hasDue ? dueDate.toISOString() : undefined,
        },
        confidence: 0.6,
        rawResponse: '',
      };
    }

    // Default → note
    return {
      result: {
        type: 'note',
        content: message,
        tags: this.autoTag(message),
      },
      confidence: 0.5,
      rawResponse: '',
    };
  }

  // ── Helpers ──

  private parseJSON(text: string): Record<string, any> | null {
    // Strip markdown fences if LLM wraps them anyway
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // Try to find first { ... } in the text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* noop */ }
      }
      return null;
    }
  }

  /**
   * Return a new object with all required fields guaranteed.
   * Never mutates the input.
   */
  private validateShape(obj: Record<string, any>): Record<string, any> {
    const out = { ...obj };
    const t = out.type;

    if (t === 'task' && !out.title) out.title = 'Untitled task';
    if (t === 'note' && !out.content) out.content = '';
    if (t === 'note' && !Array.isArray(out.tags)) out.tags = [];
    if (t === 'reminder' && !out.message) out.message = '';
    if (t === 'reminder' && !out.remindAt) out.remindAt = new Date().toISOString();
    if (t === 'incident' && !out.title) out.title = 'Untitled incident';
    if (t === 'incident' && !out.issue) out.issue = '';
    if (!['task', 'note', 'reminder', 'incident'].includes(t)) {
      out.type = 'note';
      if (!out.content) out.content = '';
      if (!Array.isArray(out.tags)) out.tags = [];
    }

    return out;
  }

  private parseTimeFromText(msg: string, now: Date): Date {
    const d = new Date(now);

    // "besok" / "tomorrow"
    if (/\b(besok|tomorrow)\b/i.test(msg)) d.setDate(d.getDate() + 1);
    // "lusa"
    else if (/\blusa\b/i.test(msg)) d.setDate(d.getDate() + 2);

    // "jam X" / "at X"
    const hourMatch = msg.match(/\b(?:jam|at)\s+(\d{1,2})(?::(\d{2}))?\b/i);
    if (hourMatch) {
      d.setHours(parseInt(hourMatch[1], 10), parseInt(hourMatch[2] || '0', 10), 0, 0);
    }

    // "X jam lagi" / "in X hours"
    const relHour = msg.match(/\b(\d{1,2})\s*(?:jam|hours?)\s*(?:lagi|from now)?\b/i);
    if (relHour && !hourMatch) {
      d.setHours(d.getHours() + parseInt(relHour[1], 10));
    }

    // "X menit lagi" / "in X minutes"
    const relMin = msg.match(/\b(\d{1,3})\s*(?:menit|minutes?)\s*(?:lagi|from now)?\b/i);
    if (relMin) {
      d.setMinutes(d.getMinutes() + parseInt(relMin[1], 10));
    }

    return d;
  }

  private autoTag(text: string): string[] {
    const tags: string[] = [];
    const map: Record<string, RegExp> = {
      devops: /\b(server|deploy|docker|k8s|ci|cd|pipeline)\b/i,
      database: /\b(database|db|postgres|mysql|redis|mongo)\b/i,
      network: /\b(network|dns|ssl|tls|firewall|vpn|proxy)\b/i,
      meeting: /\b(meeting|rapat|call|zoom)\b/i,
      client: /\b(client|klien|customer|pelanggan)\b/i,
      security: /\b(security|keamanan|auth|token|password)\b/i,
    };

    for (const [tag, re] of Object.entries(map)) {
      if (re.test(text)) tags.push(tag);
    }

    return tags.slice(0, 5);
  }
}
