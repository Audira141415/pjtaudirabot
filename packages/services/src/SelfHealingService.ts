import { ILogger } from '@pjtaudirabot/core';
import { PrismaClient } from '@prisma/client';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class SelfHealingService {
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private db: PrismaClient,
    private logger: ILogger,
    private isProduction: boolean = false
  ) {}

  /**
   * Starts the monitoring loop for self-healing.
   */
  start(intervalMs: number = 60000) {
    this.logger.info(`Self-Healing protocol initialized with frequency: ${intervalMs}ms`);
    this.checkInterval = setInterval(() => this.performHealthCheck(), intervalMs);
  }

  stop() {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  /**
   * Performs analysis of all bot nodes and triggers recovery if offline.
   */
  private async performHealthCheck() {
    try {
      const bots = await this.db.botConfig.findMany({
        where: { isActive: true }
      });

      for (const bot of bots) {
        // If bot was disconnected for more than 5 minutes, attempt recovery
        const now = new Date();
        const lastSeen = bot.lastConnectedAt || new Date(0);
        const diffMinutes = (now.getTime() - lastSeen.getTime()) / 60000;

        if (bot.connectionStatus === 'DISCONNECTED' && diffMinutes > 5) {
          this.logger.warn(`ANOMALY DETECTED: [${bot.platform}] offline for ${Math.round(diffMinutes)}m. Triggering recovery...`);
          await this.recoverService(bot.platform.toLowerCase());
        }
      }
    } catch (err) {
      this.logger.error('Self-healing cycle failed', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Attempts to restart the service. 
   * In production, this targets the Docker container.
   * In development, it sends a log alert.
   */
  private async recoverService(serviceName: string) {
    if (!this.isProduction) {
      this.logger.info(`[Self-Healing-Dev] Recovery simulated for: ${serviceName}`);
      return;
    }

    try {
      this.logger.info(`[Self-Healing-Prod] Restarting docker container: pjtaudi-${serviceName}`);
      const { stdout, stderr } = await execAsync(`docker restart pjtaudi-${serviceName}`);
      
      if (stderr) {
        this.logger.error(`Recovery execution error for ${serviceName}:`, new Error(stderr));
      } else {
        this.logger.info(`Recovery sequence successful for ${serviceName}:`, { details: stdout.trim() });
        
        // Log the recovery event
        await this.db.serverLog.create({
          data: {
            hostname: 'core-node',
            logLevel: 'INFO',
            service: 'self-healing',
            message: `SYSTEM_AUTORECOVERY: Restarted ${serviceName} container successfully.`,
            metadata: { event: 'RESTART', service: serviceName }
          }
        });
      }
    } catch (err) {
      this.logger.error(`Failed to execute recovery for ${serviceName}`, err instanceof Error ? err : new Error(String(err)));
    }
  }
}
