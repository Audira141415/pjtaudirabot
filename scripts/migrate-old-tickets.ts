/**
 * Migrate ticket JSON files from bot old/ to Prisma database.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-old-tickets.ts
 *
 * What it does:
 * 1. Reads all TKT-*.json from bot old/data/tickets/
 * 2. Creates a "SYSTEM" user to own legacy tickets
 * 3. Inserts each ticket + SLA tracking in a transaction
 * 4. Reports results
 */
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { PrismaClient, TicketPriority, TicketStatus } from '@prisma/client';
import { createClient } from 'redis';

const OLD_TICKETS_DIR = path.resolve(__dirname, '..', 'bot old', 'data', 'tickets');

interface OldTicket {
  ticketId: string;       // "TKT-0001"
  hostname?: string;
  description: string;
  priority: string;       // "HIGH", "MEDIUM", etc.
  status: string;         // "OPEN", "IN_PROGRESS", etc.
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  comments?: Array<{ user: string; text: string; timestamp: string }>;
  escalated?: boolean;
  resolvedAt?: string | null;
  resolutionTime?: number | null;
  customer?: string;
  location?: string;
  assignedTo?: string;
}

// Map old priority strings to Prisma enum
function mapPriority(p: string): TicketPriority {
  const upper = (p ?? 'MEDIUM').toUpperCase();
  if (upper === 'CRITICAL') return 'CRITICAL';
  if (upper === 'HIGH') return 'HIGH';
  if (upper === 'LOW') return 'LOW';
  return 'MEDIUM';
}

// Map old status strings to Prisma enum
function mapStatus(s: string): TicketStatus {
  const upper = (s ?? 'OPEN').toUpperCase().replace(/[\s-]/g, '_');
  const valid: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED', 'RESOLVED', 'CLOSED'];
  return valid.includes(upper as TicketStatus) ? (upper as TicketStatus) : 'OPEN';
}

// Determine SLA targets (same logic as SLAService)
function getSLATargets(priority: TicketPriority) {
  const targets: Record<string, { responseMin: number; resolutionMin: number; level: string }> = {
    CRITICAL: { responseMin: 5, resolutionMin: 120, level: 'L0' },
    HIGH:     { responseMin: 15, resolutionMin: 240, level: 'L1' },
    MEDIUM:   { responseMin: 30, resolutionMin: 480, level: 'L1' },
    LOW:      { responseMin: 60, resolutionMin: 2880, level: 'L1' },
  };
  return targets[priority] ?? targets.MEDIUM;
}

async function main() {
  console.log('=== Old Ticket Migration ===\n');

  // 1. Check source directory
  if (!fs.existsSync(OLD_TICKETS_DIR)) {
    console.error(`Ticket directory not found: ${OLD_TICKETS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(OLD_TICKETS_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Found ${files.length} ticket file(s) in: ${OLD_TICKETS_DIR}\n`);

  if (files.length === 0) {
    console.log('No tickets to migrate.');
    process.exit(0);
  }

  // 2. Connect to database
  const db = new PrismaClient();
  const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
  await redis.connect();

  try {
    // 3. Ensure a SYSTEM user exists for legacy tickets
    let systemUser = await db.user.findUnique({
      where: { platform_platformUserId: { platform: 'WHATSAPP', platformUserId: 'SYSTEM' } },
    });
    if (!systemUser) {
      systemUser = await db.user.create({
        data: {
          platform: 'WHATSAPP',
          platformUserId: 'SYSTEM',
          displayName: 'Legacy Migration',
          role: 'ADMIN',
        },
      });
      console.log(`Created SYSTEM user: ${systemUser.id}`);
    }

    // 4. Migrate each ticket
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of files) {
      const filePath = path.join(OLD_TICKETS_DIR, file);
      let raw: OldTicket;
      try {
        raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.error(`  ✗ Failed to parse ${file}: ${e}`);
        errors++;
        continue;
      }

      // Check if already migrated (by matching legacy ticket number in metadata)
      const existing = await db.ticket.findFirst({
        where: { metadata: { path: ['legacyId'], equals: raw.ticketId } },
      });
      if (existing) {
        console.log(`  ⦿ ${raw.ticketId} already migrated → ${existing.ticketNumber}`);
        skipped++;
        continue;
      }

      // Generate new ticket number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const dailyKey = `ticket:counter:${dateStr}`;
      const seq = await redis.incr(dailyKey);
      await redis.expire(dailyKey, 172800);
      const ticketNumber = `TKT-${dateStr}-${String(seq).padStart(4, '0')}`;

      const priority = mapPriority(raw.priority);
      const status = mapStatus(raw.status);
      const createdAt = new Date(raw.createdAt);
      const sla = getSLATargets(priority);

      try {
        await db.$transaction(async (tx) => {
          // Create ticket
          const ticket = await tx.ticket.create({
            data: {
              ticketNumber,
              createdById: systemUser!.id,
              title: raw.description.slice(0, 100),
              description: raw.description,
              problem: raw.description,
              priority,
              status,
              category: 'INCIDENT',
              hostnameSwitch: raw.hostname,
              customer: raw.customer,
              location: raw.location,
              source: 'WHATSAPP',
              createdAt,
              updatedAt: new Date(raw.updatedAt),
              resolvedAt: raw.resolvedAt ? new Date(raw.resolvedAt) : undefined,
              metadata: {
                legacyId: raw.ticketId,
                legacyComments: raw.comments ?? [],
                migratedAt: new Date().toISOString(),
              },
            },
          });

          // Create SLA tracking
          await tx.sLATracking.create({
            data: {
              ticketId: ticket.id,
              responseTargetMin: sla.responseMin,
              resolutionTargetMin: sla.resolutionMin,
              responseDeadline: new Date(createdAt.getTime() + sla.responseMin * 60_000),
              resolutionDeadline: new Date(createdAt.getTime() + sla.resolutionMin * 60_000),
              slaLevel: sla.level,
              // Mark already breached for old open tickets
              responseBreached: true,
              resolutionBreached: status === 'OPEN' || status === 'IN_PROGRESS',
              resolvedAt: raw.resolvedAt ? new Date(raw.resolvedAt) : undefined,
              resolutionTimeMin: raw.resolutionTime ?? undefined,
            },
          });

          // History entry
          await tx.ticketHistory.create({
            data: {
              ticketId: ticket.id,
              action: 'migrated',
              note: `Migrated from legacy ${raw.ticketId} (created ${raw.createdAt})`,
              changedById: systemUser!.id,
            },
          });

          console.log(`  ✓ ${raw.ticketId} → ${ticketNumber} (${priority}, ${status})`);
        });

        migrated++;
      } catch (e) {
        console.error(`  ✗ ${raw.ticketId} failed: ${e}`);
        errors++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`  Migrated: ${migrated}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Errors:   ${errors}`);
  } finally {
    await redis.quit();
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
