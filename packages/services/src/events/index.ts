import { ILogger } from '@pjtaudirabot/core';
import { createHmac, randomBytes } from 'crypto';

export interface WebhookEvent {
  type: string;       // e.g. "user.created", "command.executed", "error.occurred"
  data: Record<string, unknown>;
  timestamp: number;
}

export interface WebhookTarget {
  name: string;
  url: string;
  secret?: string;
  events: string[];
}

type EventListener = (event: WebhookEvent) => void | Promise<void>;

export class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private webhookTargets: WebhookTarget[] = [];

  constructor(private logger: ILogger) {
    this.logger = logger.child({ service: 'event-bus' });
  }

  /**
   * Register an in-process event listener.
   */
  on(eventType: string, listener: EventListener): void {
    const existing = this.listeners.get(eventType) ?? [];
    existing.push(listener);
    this.listeners.set(eventType, existing);
  }

  /**
   * Register a webhook target.
   */
  registerWebhook(target: WebhookTarget): void {
    this.webhookTargets.push(target);
    this.logger.info('Webhook registered', { name: target.name, events: target.events });
  }

  /**
   * Emit an event to all listeners and matching webhooks.
   */
  async emit(type: string, data: Record<string, unknown>): Promise<void> {
    const event: WebhookEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    // In-process listeners
    const listeners = this.listeners.get(type) ?? [];
    const wildcardListeners = this.listeners.get('*') ?? [];
    const allListeners = [...listeners, ...wildcardListeners];

    for (const listener of allListeners) {
      try {
        await listener(event);
      } catch (error) {
        this.logger.error('Event listener failed', error as Error, { type });
      }
    }

    // Webhook targets
    const matchingWebhooks = this.webhookTargets.filter(
      (wh) => wh.events.includes(type) || wh.events.includes('*')
    );

    // Fire-and-forget webhooks
    for (const webhook of matchingWebhooks) {
      this.deliverWebhook(webhook, event).catch((error) => {
        this.logger.error('Webhook delivery failed', error as Error, {
          webhook: webhook.name,
          type,
        });
      });
    }
  }

  private async deliverWebhook(
    target: WebhookTarget,
    event: WebhookEvent
  ): Promise<void> {
    const payload = JSON.stringify(event);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event.type,
      'X-Webhook-ID': randomBytes(16).toString('hex'),
      'X-Webhook-Timestamp': String(event.timestamp),
    };

    if (target.secret) {
      const signature = createHmac('sha256', target.secret)
        .update(payload)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    const response = await fetch(target.url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Webhook ${target.name}: HTTP ${response.status}`);
    }

    this.logger.debug('Webhook delivered', {
      name: target.name,
      type: event.type,
      status: response.status,
    });
  }
}

/**
 * Load webhook configs from DB and register them.
 */
export async function loadWebhooksFromDB(
  db: any,
  eventBus: EventBus,
  logger: ILogger
): Promise<void> {
  try {
    const configs = await db.webhookConfig.findMany({
      where: { isActive: true },
    });

    for (const config of configs) {
      eventBus.registerWebhook({
        name: config.name,
        url: config.url,
        secret: config.secret ?? undefined,
        events: config.events as string[],
      });
    }

    logger.info('Webhooks loaded from DB', { count: configs.length });
  } catch (error) {
    logger.error('Failed to load webhooks', error as Error);
  }
}
