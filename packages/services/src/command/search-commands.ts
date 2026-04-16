import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { SearchService, SearchFilters } from '../search';

export class SearchCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private searchService: SearchService) {
    super(logger);
  }

  getName(): string { return 'search'; }
  getDescription(): string { return 'Search for tickets, tasks, or incidents with filters'; }
  getCategory(): string { return 'Search'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.trim();
    if (!input) {
      return this.createResult(false, 'Usage: !search <ticket|task|incident|all> [--query=...] [--status=...] [--priority=...]');
    }

    const parts = input.split(' ');
    const type = parts[0].toLowerCase() as any;
    if (!['ticket', 'task', 'incident', 'all'].includes(type)) {
      return this.createResult(false, 'Invalid type. Use: ticket, task, incident, or all');
    }

    const filters = this.parseFilters(input);
    const results = await this.searchService.search(type, filters);

    if (results.total === 0) {
      return this.createResult(true, `No results found for ${type} with specified filters.`);
    }

    let message = `🔍 **Search Results for ${type.toUpperCase()}** (${results.total} total)\n\n`;

    if (results.tickets.length > 0) {
      message += `📋 **Tickets:**\n`;
      results.tickets.forEach(t => {
        message += `- [${t.ticketNumber}] ${t.title} (${t.status}) - ${t.priority}\n`;
      });
      message += '\n';
    }

    if (results.tasks.length > 0) {
      message += `✅ **Tasks:**\n`;
      results.tasks.forEach(t => {
        message += `- ${t.title} (${t.status}) - ${t.priority}\n`;
      });
      message += '\n';
    }

    if (results.incidents.length > 0) {
      message += `🚨 **Incidents:**\n`;
      results.incidents.forEach(t => {
        message += `- ${t.title} (${t.status}) - ${t.severity}\n`;
      });
    }

    return this.createResult(true, message, results);
  }

  private parseFilters(input: string): SearchFilters {
    const filters: SearchFilters = {};
    const words = input.split(' ');
    
    // The first word is the type
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (word.startsWith('--')) {
        const [key, value] = word.substring(2).split('=');
        if (key === 'status') filters.status = value;
        if (key === 'priority') filters.priority = value;
        if (key === 'category') filters.category = value;
        if (key === 'query') filters.query = value;
        if (key === 'customer') filters.customer = value;
      } else if (!filters.query) {
        // Collect everything else as query if --query isn't used
        filters.query = words.slice(i).join(' ');
        break;
      }
    }
    
    return filters;
  }
}

export class SaveSearchCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private searchService: SearchService) {
    super(logger);
  }

  getName(): string { return 'save-search'; }
  getDescription(): string { return 'Save current search filters for future use'; }
  getCategory(): string { return 'Search'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.trim();
    const parts = input.split(' ');
    if (parts.length < 2) {
      return this.createResult(false, 'Usage: !save-search <name> <search_args...>');
    }

    const name = parts[0];
    const query = parts.slice(1).join(' ');
    
    await this.searchService.saveSearch(context.user.id, name, 'all', query, {});
    return this.createResult(true, `Search '${name}' saved successfully. Use !use-search ${name} to run it.`);
  }
}

export class SearchSavedCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private searchService: SearchService) {
    super(logger);
  }

  getName(): string { return 'search-saved'; }
  getDescription(): string { return 'List all your saved searches'; }
  getCategory(): string { return 'Search'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const searches = await this.searchService.listSavedSearches(context.user.id);
    if (searches.length === 0) {
      return this.createResult(true, 'You have no saved searches.');
    }

    let message = '🔖 **Saved Searches:**\n\n';
    searches.forEach(s => {
      message += `- **${s.name}**: !search ${s.query}\n`;
    });

    return this.createResult(true, message);
  }
}

export class UseSearchCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private searchService: SearchService, private executor: any) {
    super(logger);
  }

  getName(): string { return 'use-search'; }
  getDescription(): string { return 'Run a saved search'; }
  getCategory(): string { return 'Search'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const name = context.input.trim();
    if (!name) {
      return this.createResult(false, 'Usage: !use-search <name>');
    }

    const saved = await this.searchService.getSavedSearch(context.user.id, name);
    if (!saved) {
      return this.createResult(false, `Saved search '${name}' not found.`);
    }

    // Proxy the execution back to the executor
    return this.executor.execute({
      ...context,
      input: `search ${saved.query}`
    });
  }
}
