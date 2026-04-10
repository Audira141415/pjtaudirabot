import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const scheduleItems = [
  { title: 'PAC', intervalMonths: 2 },
  { title: 'AC', intervalMonths: 2 },
  { title: 'FSS', intervalMonths: 3 },
  { title: 'AKSES DOOR', intervalMonths: 3 },
  { title: 'CCTV', intervalMonths: 3 },
  { title: 'EMS', intervalMonths: 3 },
  { title: 'UPS', intervalMonths: 3 },
  { title: 'GROUNDING & ARRESTER', intervalMonths: 6 },
  { title: 'PANEL', intervalMonths: 12 },
];

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function nextDueFromJanuary(now, intervalMonths, anchorDay = 1) {
  let cursor = new Date(now.getFullYear(), 0, anchorDay, 9, 0, 0, 0);
  while (cursor <= now) {
    cursor = addMonths(cursor, intervalMonths);
  }
  return cursor;
}

async function ensureSystemAdmin() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (existingAdmin) return existingAdmin;

  return prisma.user.create({
    data: {
      platform: 'WHATSAPP',
      platformUserId: 'system-maintenance-seeder',
      displayName: 'System Maintenance Scheduler',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
}

async function main() {
  const shouldResetExisting = process.argv.includes('--reset');
  const createdBy = await ensureSystemAdmin();
  const now = new Date();

  let created = 0;
  let updated = 0;

  for (const item of scheduleItems) {
    const nextDueDate = nextDueFromJanuary(now, item.intervalMonths, 1);

    const existing = await prisma.maintenanceSchedule.findFirst({
      where: { title: item.title },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      if (!shouldResetExisting) {
        console.log(`SKIPPED  | ${item.title} | already exists (use --reset to realign)`);
        continue;
      }

      await prisma.maintenanceSchedule.update({
        where: { id: existing.id },
        data: {
          intervalMonths: item.intervalMonths,
          anchorMonth: 1,
          anchorDay: 1,
          reminderEveryMonths: 3,
          notifyDaysBefore: 7,
          isActive: true,
          nextDueDate,
          description: `Jadwal maintenance berkala ${item.intervalMonths} bulanan untuk ${item.title}`,
        },
      });
      updated += 1;
      console.log(`UPDATED  | ${item.title} | every ${item.intervalMonths} month(s) | next due ${nextDueDate.toISOString().slice(0, 10)}`);
    } else {
      await prisma.maintenanceSchedule.create({
        data: {
          title: item.title,
          description: `Jadwal maintenance berkala ${item.intervalMonths} bulanan untuk ${item.title}`,
          intervalMonths: item.intervalMonths,
          anchorMonth: 1,
          anchorDay: 1,
          reminderEveryMonths: 3,
          notifyDaysBefore: 7,
          nextDueDate,
          createdById: createdBy.id,
          isActive: true,
        },
      });
      created += 1;
      console.log(`CREATED  | ${item.title} | every ${item.intervalMonths} month(s) | next due ${nextDueDate.toISOString().slice(0, 10)}`);
    }
  }

  const total = await prisma.maintenanceSchedule.count({ where: { isActive: true } });

  console.log('');
  console.log(`DONE     | created=${created} updated=${updated} activeSchedules=${total} resetMode=${shouldResetExisting}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
