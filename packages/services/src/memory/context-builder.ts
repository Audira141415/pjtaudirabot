import { ILogger } from '@pjtaudirabot/core';
import {
  IContextBuilder,
  IShortTermMemory,
  ILongTermMemory,
  ISemanticMemory,
  MemoryFact,
  ShortTermMessage,
  SimilarityResult,
} from './types';

const MAX_CONTEXT_TOKENS_ESTIMATE = 1500; // rough char budget for memory context

export class ContextBuilder implements IContextBuilder {
  constructor(
    private shortTerm: IShortTermMemory,
    private longTerm: ILongTermMemory,
    private semantic: ISemanticMemory,
    logger: ILogger
  ) {
    logger.child({ service: 'context-builder' });
  }

  async build(userId: string, currentMessage: string): Promise<string> {
    const [recentMessages, facts, semanticResults] = await Promise.all([
      this.shortTerm.getMessages(userId, 10),
      this.longTerm.getFacts(userId),
      this.semantic.search(userId, currentMessage, 3),
    ]);

    const sections: string[] = [];

    // 1. User profile from long-term facts
    const profileSection = this.buildProfileSection(facts);
    if (profileSection) {
      sections.push(profileSection);
    }

    // 2. Relevant past knowledge from semantic search
    const semanticSection = this.buildSemanticSection(semanticResults);
    if (semanticSection) {
      sections.push(semanticSection);
    }

    // 3. Recent conversation from short-term memory
    const recentSection = this.buildRecentSection(recentMessages);
    if (recentSection) {
      sections.push(recentSection);
    }

    if (sections.length === 0) return '';

    const context = `[Memory Context]\n${sections.join('\n\n')}`;

    // Truncate if too long
    if (context.length > MAX_CONTEXT_TOKENS_ESTIMATE * 4) {
      return context.slice(0, MAX_CONTEXT_TOKENS_ESTIMATE * 4) + '\n...';
    }

    return context;
  }

  private buildProfileSection(facts: MemoryFact[]): string | null {
    if (facts.length === 0) return null;

    const grouped: Record<string, MemoryFact[]> = {};
    for (const fact of facts) {
      const cat = fact.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(fact);
    }

    const lines: string[] = ['## User Profile'];

    for (const [category, categoryFacts] of Object.entries(grouped)) {
      lines.push(`### ${category}`);
      for (const fact of categoryFacts) {
        lines.push(`- ${fact.key}: ${fact.value}`);
      }
    }

    return lines.join('\n');
  }

  private buildSemanticSection(results: SimilarityResult[]): string | null {
    if (results.length === 0) return null;

    const lines: string[] = ['## Relevant Past Context'];
    for (const result of results) {
      lines.push(`- (relevance: ${result.score.toFixed(2)}) ${result.content}`);
    }

    return lines.join('\n');
  }

  private buildRecentSection(messages: ShortTermMessage[]): string | null {
    if (messages.length === 0) return null;

    const lines: string[] = ['## Recent Conversation'];
    for (const msg of messages) {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      // Truncate individual messages for context budget
      const content = msg.content.length > 200
        ? msg.content.slice(0, 200) + '...'
        : msg.content;
      lines.push(`${role}: ${content}`);
    }

    return lines.join('\n');
  }
}
