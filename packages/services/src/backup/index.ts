import { PrismaClient, BackupType } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const BACKUP_DIR = './data/backups';
const RETENTION_DAYS = 90;

export class BackupService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'backup' });
  }

  /** Create a full backup of tickets + extractions */
  async createFullBackup(createdById?: string) {
    await mkdir(path.resolve(BACKUP_DIR, 'full'), { recursive: true });

    const [tickets, extractions, sla] = await Promise.all([
      this.db.ticket.findMany({ include: { slaTracking: true, escalations: true } }),
      this.db.dataExtraction.findMany(),
      this.db.sLATracking.findMany(),
    ]);

    const data = { tickets, extractions, sla, exportedAt: new Date().toISOString(), recordCount: tickets.length + extractions.length };
    const json = JSON.stringify(data, null, 2);
    const checksum = createHash('sha256').update(json).digest('hex');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `full-backup-${dateStr}.json`;
    const filePath = path.resolve(BACKUP_DIR, 'full', fileName);
    await writeFile(filePath, json, 'utf-8');

    const backup = await this.db.backup.create({
      data: {
        backupType: 'FULL',
        fileName,
        filePath,
        fileSize: Buffer.byteLength(json),
        checksum,
        recordCount: data.recordCount,
        metadata: { ticketCount: tickets.length, extractionCount: extractions.length },
        status: 'COMPLETED',
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + RETENTION_DAYS * 86_400_000),
        createdById,
      },
    });

    this.logger.info('Full backup created', { backupId: backup.id, records: data.recordCount, size: backup.fileSize });
    return backup;
  }

  /** Create incremental backup (only new records since last backup) */
  async createIncrementalBackup(createdById?: string) {
    await mkdir(path.resolve(BACKUP_DIR, 'incremental'), { recursive: true });

    const lastBackup = await this.db.backup.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    const since = lastBackup?.completedAt ?? new Date(0);
    const [tickets, extractions] = await Promise.all([
      this.db.ticket.findMany({ where: { createdAt: { gt: since } }, include: { slaTracking: true } }),
      this.db.dataExtraction.findMany({ where: { createdAt: { gt: since } } }),
    ]);

    const data = { tickets, extractions, since: since.toISOString(), exportedAt: new Date().toISOString(), recordCount: tickets.length + extractions.length };
    const json = JSON.stringify(data, null, 2);
    const checksum = createHash('sha256').update(json).digest('hex');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `incremental-${dateStr}.json`;
    const filePath = path.resolve(BACKUP_DIR, 'incremental', fileName);
    await writeFile(filePath, json, 'utf-8');

    const backup = await this.db.backup.create({
      data: {
        backupType: 'INCREMENTAL',
        fileName,
        filePath,
        fileSize: Buffer.byteLength(json),
        checksum,
        recordCount: data.recordCount,
        metadata: { since: since.toISOString() },
        status: 'COMPLETED',
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + RETENTION_DAYS * 86_400_000),
        createdById,
      },
    });

    this.logger.info('Incremental backup created', { backupId: backup.id, records: data.recordCount });
    return backup;
  }

  /** List available backups */
  async listBackups(type?: BackupType, limit = 20) {
    const where: any = { status: 'COMPLETED' };
    if (type) where.backupType = type;
    return this.db.backup.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
  }

  /** Clean up expired backups */
  async cleanupExpired() {
    const expired = await this.db.backup.findMany({
      where: { expiresAt: { lte: new Date() } },
    });

    for (const b of expired) {
      await this.db.backup.delete({ where: { id: b.id } });
      // Note: file deletion omitted for safety — can be added with fs.unlink
    }

    if (expired.length > 0) this.logger.info('Expired backups cleaned', { count: expired.length });
    return expired.length;
  }

  /** Get backup stats */
  async getStats() {
    const [total, full, incremental, snapshot] = await Promise.all([
      this.db.backup.count({ where: { status: 'COMPLETED' } }),
      this.db.backup.count({ where: { backupType: 'FULL', status: 'COMPLETED' } }),
      this.db.backup.count({ where: { backupType: 'INCREMENTAL', status: 'COMPLETED' } }),
      this.db.backup.count({ where: { backupType: 'SNAPSHOT', status: 'COMPLETED' } }),
    ]);
    return { total, full, incremental, snapshot };
  }
}
