import { PrismaClient } from './packages/database/node_modules/@prisma/client/index.js';

const db = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://pjtaudi:dev_password_change_me@192.168.100.157:5433/pjtaudi'
    }
  }
});

async function main() {
  const res = await db.maintenanceSchedule.updateMany({
    where: { title: 'PAC' },
    data: { nextDueDate: new Date() }
  });
  console.log('Updated:', res);
}

main().then(() => db.$disconnect()).catch(err => {
  console.error(err);
  db.$disconnect();
});
