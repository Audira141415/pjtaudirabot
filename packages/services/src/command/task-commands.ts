import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { TaskManagerService } from '../task-manager';

/**
 * !tasks - List pending tasks
 * !tasks done - List completed tasks
 * !tasks today - Today's tasks
 */
export class TasksCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private taskManager: TaskManagerService) {
    super(logger);
  }

  getName(): string { return 'tasks'; }
  getDescription(): string { return 'List and manage tasks'; }
  getCategory(): string { return 'productivity'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!tasks\s*/i, '').trim().toLowerCase();
    const userId = (context as any).userId ?? context.user.id;

    if (args === 'today') {
      const tasks = await this.taskManager.getTodayTasks(userId);
      return this.createResult(true, this.formatTaskList(tasks, "Today's Tasks"));
    }

    if (args === 'done' || args === 'completed') {
      const tasks = await this.taskManager.listTasks(userId, { status: 'COMPLETED' });
      return this.createResult(true, this.formatTaskList(tasks, 'Completed Tasks'));
    }

    if (args === 'stats') {
      const stats = await this.taskManager.getStats(userId);
      const msg = [
        '📊 *Task Statistics*',
        '',
        `📝 Total: ${stats.total}`,
        `⏳ Pending: ${stats.pending}`,
        `✅ Completed: ${stats.completed}`,
        `⚠️ Overdue: ${stats.overdue}`,
      ].join('\n');
      return this.createResult(true, msg);
    }

    // Default: pending tasks
    const tasks = await this.taskManager.listTasks(userId, { status: 'PENDING' });
    return this.createResult(true, this.formatTaskList(tasks, 'Pending Tasks'));
  }

  private formatTaskList(tasks: any[], header: string): string {
    if (tasks.length === 0) return `📝 *${header}*\n\nNo tasks found.`;

    const lines = tasks.map((t: any, i: number) => {
      const priorityMap: Record<string, string> = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🟠', URGENT: '🔴' };
      const priority = priorityMap[t.priority] ?? '⚪';
      const due = t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleDateString()})` : '';
      return `${priority} ${i + 1}. ${t.title}${due}`;
    });

    return `📝 *${header}* (${tasks.length})\n\n${lines.join('\n')}`;
  }
}

/**
 * !done <search text> - Complete a task by title match
 */
export class DoneCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private taskManager: TaskManagerService) {
    super(logger);
  }

  getName(): string { return 'done'; }
  getDescription(): string { return 'Mark a task as completed'; }
  getCategory(): string { return 'productivity'; }

  async validate(input: string): Promise<void> {
    const text = input.replace(/^!done\s*/i, '').trim();
    if (!text) throw new Error('Usage: !done <task title or part of it>');
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const searchText = context.input.replace(/^!done\s+/i, '').trim();
    const userId = (context as any).userId ?? context.user.id;

    const result = await this.taskManager.completeTaskByTitle(searchText, userId);
    if (result.found) {
      return this.createResult(true, `✅ Task completed: *${result.title}*`);
    }
    return this.createResult(false, `❌ No pending task found matching "${searchText}"`);
  }
}

/**
 * !addtask <title> - Manually create a task
 */
export class AddTaskCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private taskManager: TaskManagerService) {
    super(logger);
  }

  getName(): string { return 'addtask'; }
  getDescription(): string { return 'Add a new task manually'; }
  getCategory(): string { return 'productivity'; }

  async validate(input: string): Promise<void> {
    const text = input.replace(/^!addtask\s*/i, '').trim();
    if (!text) throw new Error('Usage: !addtask <task title>');
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const title = context.input.replace(/^!addtask\s+/i, '').trim();
    const userId = (context as any).userId ?? context.user.id;

    const task = await this.taskManager.createTask(
      userId,
      { title, priority: 'MEDIUM', tags: [] },
      context.input,
      context.platform
    );

    return this.createResult(true, `✅ Task added: *${task.title}*`);
  }
}
