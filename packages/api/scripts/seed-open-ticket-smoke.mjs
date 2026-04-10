import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../../..');

dotenv.config({ path: path.resolve(workspaceRoot, '.env') });

const prisma = new PrismaClient();

async function getOrCreateSeedUser() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
  if (existingAdmin) return existingAdmin;

  const existingAny = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existingAny) return existingAny;

  return prisma.user.create({
    data: {
      platform: 'WHATSAPP',
      platformUserId: `smoke-seed-${Date.now()}`,
      displayName: 'Smoke Seed User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
}

async function main() {
  const createdBy = await getOrCreateSeedUser();
  const now = new Date();
  const ticketNumber = `TKT-SMOKE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-6)}`;

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      createdById: createdBy.id,
      title: '[SMOKE] UI Modal Validation Ticket',
      description: 'Test-only ticket for validating Tickets bulk resolve modal flow via Playwright.',
      status: 'OPEN',
      priority: 'MEDIUM',
      category: 'INCIDENT',
      customer: 'SMOKE-TEST',
      location: 'Dashboard QA',
      problem: 'Smoke validation ticket for modal step flow.',
      tags: ['smoke-test', 'ui-modal', 'test-only'],
      metadata: { seededBy: 'packages/api/scripts/seed-open-ticket-smoke.mjs', createdAt: now.toISOString() },
    },
  });

  console.log(`SEEDED_TICKET_ID=${ticket.id}`);
  console.log(`SEEDED_TICKET_NUMBER=${ticket.ticketNumber}`);
  console.log('SEEDED_STATUS=OPEN');
}

main()
  .catch((error) => {
    console.error('SEED_FAILED', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
