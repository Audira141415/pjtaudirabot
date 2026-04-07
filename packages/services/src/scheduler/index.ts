import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';

export interface ScheduledTask {
  name: string;
  intervalMs: number;
  handler: () => Promise<void>;
  runOnStart?: boolean;
}

/**
 * Simple interval-based scheduler (no external cron dependency).
 * Manages recurring tasks with Redis-backed distributed locking.
 */
export class Scheduler {
  private tasks: Map<string, NodeJS.Timeout> = new Map();
  private running = false;

  constructor(
    _db: PrismaClient,
    private redis: RedisClientType,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'scheduler' });
  }

  /**
   * Register and start a task.
   */
  register(task: ScheduledTask): void {
    if (this.tasks.has(task.name)) {
      this.logger.warn('Task already registered', { name: task.name });
      return;
    }

    const wrappedHandler = async () => {
      const lockKey = `scheduler:lock:${task.name}`;
      try {
        // Acquire distributed lock (prevent multi-instance overlap)
        const acquired = await this.redis.set(lockKey, '1', {
          NX: true,
          PX: Math.min(task.intervalMs, 300000), // Lock TTL = min(interval, 5m)
        });

        if (!acquired) {
          this.logger.debug('Task skipped (locked)', { name: task.name });
          return;
        }

        this.logger.debug('Running task', { name: task.name });
        await task.handler();
        this.logger.debug('Task completed', { name: task.name });
      } catch (error) {
        this.logger.error('Task failed', error as Error, { name: task.name });
      } finally {
        try { await this.redis.del(lockKey); } catch { /* non-critical */ }
      }
    };

    if (task.runOnStart) {
      wrappedHandler().catch(() => {});
    }

    const timer = setInterval(wrappedHandler, task.intervalMs);
    this.tasks.set(task.name, timer);
    this.running = true;

    this.logger.info('Task registered', {
      name: task.name,
      intervalMs: task.intervalMs,
      runOnStart: task.runOnStart ?? false,
    });
  }

  /**
   * Stop a specific task.
   */
  stop(name: string): boolean {
    const timer = this.tasks.get(name);
    if (timer) {
      clearInterval(timer);
      this.tasks.delete(name);
      this.logger.info('Task stopped', { name });
      return true;
    }
    return false;
  }

  /**
   * Stop all tasks and clean up.
   */
  shutdown(): void {
    for (const [name, timer] of this.tasks) {
      clearInterval(timer);
      this.logger.info('Task stopped', { name });
    }
    this.tasks.clear();
    this.running = false;
    this.logger.info('Scheduler shut down');
  }

  isRunning(): boolean {
    return this.running;
  }

  getRegisteredTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}

/**
 * Create default maintenance tasks.
 */
export function createMaintenanceTasks(deps: {
  db: PrismaClient;
  redis: RedisClientType;
  logger: ILogger;
  analyticsFlush?: () => Promise<void>;
  memoryCleaner?: () => Promise<void>;
  summaryGenerator?: () => Promise<void>;
  auditCleaner?: () => Promise<void>;
  flowCleaner?: () => Promise<void>;
}): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];

  // Flush analytics to DB every 5 minutes
  if (deps.analyticsFlush) {
    tasks.push({
      name: 'analytics-flush',
      intervalMs: 5 * 60 * 1000,
      handler: deps.analyticsFlush,
    });
  }

  // Clean old memories every 6 hours
  if (deps.memoryCleaner) {
    tasks.push({
      name: 'memory-cleanup',
      intervalMs: 6 * 60 * 60 * 1000,
      handler: deps.memoryCleaner,
    });
  }

  // Generate conversation summaries every 30 minutes
  if (deps.summaryGenerator) {
    tasks.push({
      name: 'summary-generation',
      intervalMs: 30 * 60 * 1000,
      handler: deps.summaryGenerator,
    });
  }

  // Clean audit logs older than 90 days, every 24 hours
  if (deps.auditCleaner) {
    tasks.push({
      name: 'audit-cleanup',
      intervalMs: 24 * 60 * 60 * 1000,
      handler: deps.auditCleaner,
    });
  }

  // Clean expired flow sessions every 15 minutes
  if (deps.flowCleaner) {
    tasks.push({
      name: 'flow-cleanup',
      intervalMs: 15 * 60 * 1000,
      handler: deps.flowCleaner,
    });
  }

  return tasks;
}
