import { PrismaClient } from '@prisma/client';
import { FastifyRequest } from 'fastify';

/**
 * Audit trail helper for admin API actions.
 * Provides a simple interface to log all mutations (create, update, delete)
 * to the AuditLog table with structured change data.
 */
export interface AuditLogEntry {
  /** The type of action performed (e.g. 'create', 'update', 'delete', 'bulk_resolve') */
  action: string;
  /** The resource type (e.g. 'ticket', 'user', 'webhook') */
  resource: string;
  /** The ID of the specific resource that was affected */
  resourceId?: string;
  /** Optional description or note */
  details?: string;
  /** The change data — before/after snapshot or relevant metadata */
  changes?: Record<string, unknown>;
}

/**
 * Log an admin action to the AuditLog table.
 * Fire-and-forget — never throws, never blocks the response.
 */
export function logAdminAction(
  db: PrismaClient,
  request: FastifyRequest,
  entry: AuditLogEntry,
): void {
  const user = request.user as { sub?: string; role?: string } | undefined;
  const adminId = user?.sub ?? 'unknown';
  const ip = request.ip;

  db.auditLog.create({
    data: {
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId ?? null,
      details: entry.details ?? null,
      changes: (entry.changes ?? {}) as any,
      performedBy: adminId,
      ipAddress: ip,
      status: 'SUCCESS',
    },
  }).catch(() => {
    // Audit logging should never break the application flow
  });
}

/**
 * Create an audit-aware wrapper that logs before returning.
 * Useful for wrapping existing route handlers.
 * 
 * Example:
 * ```ts
 * const webhook = await ctx.db.webhookConfig.create({ data: { ... } });
 * auditLog(ctx.db, request, {
 *   action: 'create',
 *   resource: 'webhook',
 *   resourceId: webhook.id,
 *   changes: { name: webhook.name, url: webhook.url },
 * });
 * ```
 */
export { logAdminAction as auditLog };
