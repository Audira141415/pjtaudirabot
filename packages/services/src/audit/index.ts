import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';

export interface AuditEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILURE';
  errorDetails?: string;
}

export class AuditService {
  constructor(
    private db: PrismaClient,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'audit' });
  }

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.db.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          changes: (entry.changes ?? {}) as any,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          status: (entry.status ?? 'SUCCESS') as any,
          errorDetails: entry.errorDetails ?? null,
        },
      });
    } catch (error) {
      // Audit failures should not break the app
      this.logger.error('Failed to write audit log', error as Error);
    }
  }

  async getByUser(
    userId: string,
    options?: { limit?: number; offset?: number; action?: string }
  ): Promise<any[]> {
    return this.db.auditLog.findMany({
      where: {
        userId,
        ...(options?.action ? { action: options.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  async getByResource(
    resource: string,
    resourceId?: string,
    limit: number = 50
  ): Promise<any[]> {
    return this.db.auditLog.findMany({
      where: {
        resource,
        ...(resourceId ? { resourceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, displayName: true, platform: true } } },
    });
  }

  async getRecent(limit: number = 100): Promise<any[]> {
    return this.db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, displayName: true, platform: true } } },
    });
  }

  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.db.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    if (result.count > 0) {
      this.logger.info('Audit logs cleaned up', { deleted: result.count, olderThan: cutoff });
    }

    return result.count;
  }
}
