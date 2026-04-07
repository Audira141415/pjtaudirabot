import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { KnowledgeBaseService } from '../knowledge';

/**
 * !kb <query> - Search the knowledge base
 */
export class KBSearchCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private kb: KnowledgeBaseService) {
    super(logger);
  }

  getName(): string { return 'kb'; }
  getDescription(): string { return 'Search knowledge base'; }
  getCategory(): string { return 'knowledge'; }

  async validate(input: string): Promise<void> {
    const query = input.replace(/^!kb\s*/i, '').trim();
    if (!query) throw new Error('Usage: !kb <search query>\nExample: !kb nginx error solution');
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const query = context.input.replace(/^!kb\s+/i, '').trim();
    const userId = (context as any).userId ?? context.user.id;

    const results = await this.kb.search(userId, query);
    return this.createResult(true, this.kb.formatResults(results));
  }
}

/**
 * !kbtopics - List all knowledge base topics
 */
export class KBTopicsCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private kb: KnowledgeBaseService) {
    super(logger);
  }

  getName(): string { return 'kbtopics'; }
  getDescription(): string { return 'List all knowledge base topics'; }
  getCategory(): string { return 'knowledge'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const userId = (context as any).userId ?? context.user.id;
    const topics = await this.kb.listTopics(userId);

    if (topics.length === 0) {
      return this.createResult(true, '📚 Knowledge base is empty. It will grow as you resolve incidents and share solutions.');
    }

    const list = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
    return this.createResult(true, `📚 *Knowledge Base Topics*\n\n${list}`);
  }
}
