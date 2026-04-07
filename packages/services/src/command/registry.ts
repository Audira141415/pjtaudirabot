import { ILogger } from '@pjtaudirabot/core';
import { ICommandHandler } from './handler';

export class CommandRegistry {
  private commands: Map<string, ICommandHandler> = new Map();

  constructor(private logger: ILogger) {}

  register(handler: ICommandHandler): void {
    const name = handler.getName();
    if (this.commands.has(name)) {
      this.logger.warn(`Command '${name}' is already registered, overwriting`);
    }
    this.commands.set(name, handler);
    this.logger.info(`Command '${name}' registered`);
  }

  get(name: string): ICommandHandler | null {
    return this.commands.get(name) || null;
  }

  getAll(): ICommandHandler[] {
    return Array.from(this.commands.values());
  }

  getAllByCategory(category: string): ICommandHandler[] {
    return Array.from(this.commands.values()).filter(
      cmd => cmd.getCategory() === category
    );
  }

  exists(name: string): boolean {
    return this.commands.has(name);
  }

  remove(name: string): boolean {
    return this.commands.delete(name);
  }

  clear(): void {
    this.commands.clear();
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.commands.forEach(cmd => {
      categories.add(cmd.getCategory());
    });
    return Array.from(categories).sort();
  }

  list(): Array<{ name: string; description: string; category: string }> {
    return Array.from(this.commands.values()).map(cmd => ({
      name: cmd.getName(),
      description: cmd.getDescription(),
      category: cmd.getCategory()
    }));
  }
}
