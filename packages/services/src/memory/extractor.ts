import OpenAI from 'openai';
import { ILogger } from '@pjtaudirabot/core';
import { IMemoryExtractor, ExtractedFact, MemoryCategory } from './types';

const EXTRACTION_PROMPT = `You are a memory extraction assistant. Analyze the user message and extract any personal facts, preferences, or important information worth remembering.

Return ONLY a JSON array of extracted facts. Each fact must have:
- "category": one of "PERSONAL", "PREFERENCE", "CONTEXT", "KNOWLEDGE", "RELATIONSHIP"
- "key": a short snake_case identifier (e.g. "name", "favorite_color", "job_title")
- "value": the extracted value as a string
- "confidence": a number between 0.0 and 1.0 indicating how confident you are

Rules:
- Only extract facts that are clearly stated or strongly implied
- Prefer high-confidence extractions over guesses
- If no facts can be extracted, return an empty array []
- Keep keys short and consistent (use snake_case)
- Category guide:
  - PERSONAL: name, age, location, job, birthday, etc.
  - PREFERENCE: likes, dislikes, favorite things, settings
  - CONTEXT: current task, topic being discussed, deadlines
  - KNOWLEDGE: things the user taught or explained
  - RELATIONSHIP: mentions of other people and relationships

Example input: "I'm John from Jakarta, I work as a software engineer and I love TypeScript"
Example output:
[
  {"category": "PERSONAL", "key": "name", "value": "John", "confidence": 0.95},
  {"category": "PERSONAL", "key": "location", "value": "Jakarta", "confidence": 0.9},
  {"category": "PERSONAL", "key": "job_title", "value": "software engineer", "confidence": 0.9},
  {"category": "PREFERENCE", "key": "favorite_language", "value": "TypeScript", "confidence": 0.8}
]

Now extract facts from this message:`;

const VALID_CATEGORIES: ReadonlySet<string> = new Set<MemoryCategory>([
  'PERSONAL',
  'PREFERENCE',
  'CONTEXT',
  'KNOWLEDGE',
  'RELATIONSHIP',
]);

export class MemoryExtractor implements IMemoryExtractor {
  private openai: OpenAI;
  private model: string;

  constructor(
    apiKey: string,
    private logger: ILogger,
    model?: string
  ) {
    this.logger = logger.child({ service: 'memory-extractor' });
    this.openai = new OpenAI({ apiKey });
    this.model = model ?? 'gpt-3.5-turbo';
  }

  async extract(message: string): Promise<ExtractedFact[]> {
    // Skip very short messages — unlikely to contain extractable facts
    if (message.length < 10) return [];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
        max_tokens: 512,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      return this.parseResponse(content);
    } catch (error) {
      this.logger.error('Memory extraction failed', error as Error);
      return [];
    }
  }

  private parseResponse(raw: string): ExtractedFact[] {
    try {
      // Strip markdown code fences if AI wraps response
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item: any) => this.isValidFact(item))
        .map((item: any) => ({
          category: item.category as MemoryCategory,
          key: String(item.key).toLowerCase().replace(/\s+/g, '_').slice(0, 64),
          value: String(item.value).slice(0, 500),
          confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0.5)),
        }));
    } catch {
      this.logger.warn('Failed to parse memory extraction result', { raw });
      return [];
    }
  }

  private isValidFact(item: unknown): boolean {
    if (typeof item !== 'object' || item === null) return false;
    const obj = item as Record<string, unknown>;

    return (
      typeof obj.category === 'string' &&
      VALID_CATEGORIES.has(obj.category) &&
      typeof obj.key === 'string' &&
      obj.key.length > 0 &&
      typeof obj.value === 'string' &&
      obj.value.length > 0
    );
  }
}

/**
 * Simple rule-based extractor as a free fallback (no API calls).
 */
export class RuleBasedExtractor implements IMemoryExtractor {
  private patterns: ReadonlyArray<{
    regex: RegExp;
    category: MemoryCategory;
    key: string;
    valueGroup: number;
  }> = [
    { regex: /my name is (\w+)/i, category: 'PERSONAL', key: 'name', valueGroup: 1 },
    { regex: /i'm (\w+)/i, category: 'PERSONAL', key: 'name', valueGroup: 1 },
    { regex: /i am (\d{1,3}) years old/i, category: 'PERSONAL', key: 'age', valueGroup: 1 },
    { regex: /i live in (.+?)(?:\.|,|$)/i, category: 'PERSONAL', key: 'location', valueGroup: 1 },
    { regex: /i'm from (.+?)(?:\.|,|$)/i, category: 'PERSONAL', key: 'location', valueGroup: 1 },
    { regex: /i work as (?:a |an )?(.+?)(?:\.|,|$)/i, category: 'PERSONAL', key: 'job_title', valueGroup: 1 },
    { regex: /my job is (.+?)(?:\.|,|$)/i, category: 'PERSONAL', key: 'job_title', valueGroup: 1 },
    { regex: /i (?:really )?like (.+?)(?:\.|,|$)/i, category: 'PREFERENCE', key: 'likes', valueGroup: 1 },
    { regex: /i (?:really )?love (.+?)(?:\.|,|$)/i, category: 'PREFERENCE', key: 'loves', valueGroup: 1 },
    { regex: /i (?:don't like|hate|dislike) (.+?)(?:\.|,|$)/i, category: 'PREFERENCE', key: 'dislikes', valueGroup: 1 },
    { regex: /my (?:favorite|favourite) (\w+) is (.+?)(?:\.|,|$)/i, category: 'PREFERENCE', key: 'favorite_$1', valueGroup: 2 },
    { regex: /i speak (.+?)(?:\.|,|$)/i, category: 'PERSONAL', key: 'language', valueGroup: 1 },
    { regex: /my birthday is (.+?)(?:\.|,|$)/i, category: 'PERSONAL', key: 'birthday', valueGroup: 1 },
  ];

  async extract(message: string): Promise<ExtractedFact[]> {
    const facts: ExtractedFact[] = [];
    const seen = new Set<string>();

    for (const pattern of this.patterns) {
      const match = message.match(pattern.regex);
      if (!match) continue;

      const value = match[pattern.valueGroup]?.trim();
      if (!value) continue;

      // Handle dynamic keys like "favorite_$1"
      let key = pattern.key;
      if (key.includes('$1') && match[1]) {
        key = key.replace('$1', match[1].toLowerCase());
      }

      const dedupKey = `${pattern.category}:${key}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      facts.push({
        category: pattern.category,
        key,
        value: value.slice(0, 500),
        confidence: 0.7,
      });
    }

    return facts;
  }
}
