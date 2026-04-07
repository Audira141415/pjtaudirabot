import { RedisClientType } from 'redis';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';

export interface FlowStep {
  id: string;
  prompt: string;
  type: 'text' | 'choice' | 'confirm' | 'number' | 'email' | 'phone';
  options?: string[];        // for 'choice' type
  validation?: string;       // regex pattern for custom validation
  required?: boolean;
  field: string;             // key in collected data
}

export interface FlowDefinitionData {
  name: string;
  description?: string;
  steps: FlowStep[];
}

export interface FlowState {
  flowName: string;
  userId: string;
  platform: string;
  currentStep: number;
  data: Record<string, unknown>;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
}

export class FlowEngine {
  private flowTtlSeconds: number;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    private logger: ILogger,
    flowTtlSeconds: number = 1800 // 30 min default
  ) {
    this.logger = this.logger.child({ service: 'flow-engine' });
    this.flowTtlSeconds = flowTtlSeconds;
  }

  /**
   * Start a new flow for a user.
   */
  async start(
    flowName: string,
    userId: string,
    platform: string
  ): Promise<{ prompt: string; step: FlowStep } | null> {
    const definition = await this.getDefinition(flowName);
    if (!definition || definition.steps.length === 0) return null;

    const steps = definition.steps as unknown as FlowStep[];
    const expiresAt = new Date(Date.now() + this.flowTtlSeconds * 1000);

    // Upsert flow session
    await this.db.flowSession.upsert({
      where: {
        flowName_userId_platform: {
          flowName,
          userId,
          platform: platform.toUpperCase() as any,
        },
      },
      create: {
        flowName,
        userId,
        platform: platform.toUpperCase() as any,
        currentStep: 0,
        data: {},
        status: 'ACTIVE',
        expiresAt,
      },
      update: {
        currentStep: 0,
        data: {},
        status: 'ACTIVE',
        expiresAt,
      },
    });

    // Cache in Redis for fast access
    await this.cacheState(userId, platform, {
      flowName,
      userId,
      platform,
      currentStep: 0,
      data: {},
      status: 'ACTIVE',
    });

    const firstStep = steps[0];
    return {
      prompt: this.formatPrompt(firstStep),
      step: firstStep,
    };
  }

  /**
   * Process user input for the current flow step.
   * Returns next prompt or null if flow is complete.
   */
  async processInput(
    userId: string,
    platform: string,
    input: string
  ): Promise<{ prompt?: string; completed: boolean; data?: Record<string, unknown>; error?: string }> {
    const state = await this.getState(userId, platform);
    if (!state || state.status !== 'ACTIVE') {
      return { completed: true };
    }

    const definition = await this.getDefinition(state.flowName);
    if (!definition) return { completed: true };

    const steps = definition.steps as unknown as FlowStep[];
    const currentStep = steps[state.currentStep];

    if (!currentStep) return { completed: true };

    // Validate input
    const validationError = this.validateInput(currentStep, input);
    if (validationError) {
      return { completed: false, error: validationError };
    }

    // Store the answer
    const updatedData = { ...state.data, [currentStep.field]: this.parseInput(currentStep, input) };
    const nextStepIndex = state.currentStep + 1;

    if (nextStepIndex >= steps.length) {
      // Flow completed
      await this.updateState(userId, platform, {
        ...state,
        currentStep: nextStepIndex,
        data: updatedData,
        status: 'COMPLETED',
      });

      return { completed: true, data: updatedData };
    }

    // Move to next step
    await this.updateState(userId, platform, {
      ...state,
      currentStep: nextStepIndex,
      data: updatedData,
    });

    const nextStep = steps[nextStepIndex];
    return {
      completed: false,
      prompt: this.formatPrompt(nextStep),
    };
  }

  /**
   * Check if user has an active flow.
   */
  async hasActiveFlow(userId: string, platform: string): Promise<boolean> {
    const state = await this.getState(userId, platform);
    return state?.status === 'ACTIVE';
  }

  /**
   * Cancel active flow.
   */
  async cancel(userId: string, platform: string): Promise<void> {
    const key = this.cacheKey(userId, platform);
    await this.redis.del(key);

    await this.db.flowSession.updateMany({
      where: {
        userId,
        platform: platform.toUpperCase() as any,
        status: 'ACTIVE',
      },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Create or update a flow definition.
   */
  async upsertDefinition(def: FlowDefinitionData): Promise<void> {
    await this.db.flowDefinition.upsert({
      where: { name: def.name },
      create: {
        name: def.name,
        description: def.description ?? null,
        steps: def.steps as any,
      },
      update: {
        description: def.description ?? null,
        steps: def.steps as any,
      },
    });
  }

  /**
   * Clean up expired flow sessions.
   */
  async cleanExpired(): Promise<number> {
    const result = await this.db.flowSession.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return result.count;
  }

  private async getDefinition(name: string): Promise<any> {
    // Simple cache in Redis
    const cacheKey = `flow:def:${name}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { /* proceed to DB */ }

    const definition = await this.db.flowDefinition.findUnique({
      where: { name, isActive: true },
    });

    if (definition) {
      try {
        await this.redis.set(cacheKey, JSON.stringify(definition), { EX: 300 });
      } catch { /* non-critical */ }
    }

    return definition;
  }

  private async getState(userId: string, platform: string): Promise<FlowState | null> {
    const key = this.cacheKey(userId, platform);

    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch { /* proceed to DB */ }

    const session = await this.db.flowSession.findFirst({
      where: {
        userId,
        platform: platform.toUpperCase() as any,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!session) return null;

    const state: FlowState = {
      flowName: session.flowName,
      userId: session.userId,
      platform,
      currentStep: session.currentStep,
      data: session.data as Record<string, unknown>,
      status: session.status as FlowState['status'],
    };

    await this.cacheState(userId, platform, state);
    return state;
  }

  private async updateState(userId: string, platform: string, state: FlowState): Promise<void> {
    await this.cacheState(userId, platform, state);

    await this.db.flowSession.updateMany({
      where: {
        flowName: state.flowName,
        userId,
        platform: platform.toUpperCase() as any,
      },
      data: {
        currentStep: state.currentStep,
        data: state.data as any,
        status: state.status as any,
      },
    });
  }

  private async cacheState(userId: string, platform: string, state: FlowState): Promise<void> {
    try {
      await this.redis.set(
        this.cacheKey(userId, platform),
        JSON.stringify(state),
        { EX: this.flowTtlSeconds }
      );
    } catch { /* non-critical */ }
  }

  private cacheKey(userId: string, platform: string): string {
    return `flow:session:${platform}:${userId}`;
  }

  private formatPrompt(step: FlowStep): string {
    let prompt = step.prompt;

    if (step.type === 'choice' && step.options) {
      const optionsList = step.options
        .map((opt, i) => `  ${i + 1}. ${opt}`)
        .join('\n');
      prompt += `\n${optionsList}\n\nReply with the number of your choice.`;
    }

    if (step.type === 'confirm') {
      prompt += '\n\nReply with "yes" or "no".';
    }

    return prompt;
  }

  private validateInput(step: FlowStep, input: string): string | null {
    const trimmed = input.trim();

    if (step.required !== false && !trimmed) {
      return 'This field is required. Please provide an answer.';
    }

    switch (step.type) {
      case 'choice': {
        if (!step.options) return null;
        const num = parseInt(trimmed, 10);
        if (isNaN(num) || num < 1 || num > step.options.length) {
          return `Please choose a number between 1 and ${step.options.length}.`;
        }
        return null;
      }

      case 'confirm': {
        const lower = trimmed.toLowerCase();
        if (!['yes', 'no', 'y', 'n', 'ya', 'tidak'].includes(lower)) {
          return 'Please reply with "yes" or "no".';
        }
        return null;
      }

      case 'number': {
        if (isNaN(Number(trimmed))) {
          return 'Please enter a valid number.';
        }
        return null;
      }

      case 'email': {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return 'Please enter a valid email address.';
        }
        return null;
      }

      case 'phone': {
        if (!/^\+?[\d\s-]{7,15}$/.test(trimmed)) {
          return 'Please enter a valid phone number.';
        }
        return null;
      }

      case 'text': {
        if (step.validation) {
          try {
            const regex = new RegExp(step.validation);
            if (!regex.test(trimmed)) {
              return 'Invalid format. Please try again.';
            }
          } catch { /* skip invalid regex */ }
        }
        return null;
      }

      default:
        return null;
    }
  }

  private parseInput(step: FlowStep, input: string): unknown {
    const trimmed = input.trim();

    switch (step.type) {
      case 'choice': {
        const idx = parseInt(trimmed, 10) - 1;
        return step.options?.[idx] ?? trimmed;
      }
      case 'confirm': {
        const lower = trimmed.toLowerCase();
        return ['yes', 'y', 'ya'].includes(lower);
      }
      case 'number':
        return Number(trimmed);
      default:
        return trimmed;
    }
  }
}
