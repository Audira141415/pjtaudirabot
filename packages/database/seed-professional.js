const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function seed() {
  // Seed Sentiment Logs
  const sentiments = [
    { platform: 'WHATSAPP', userId: 'user1', message: 'Terima kasih banyak, pelayanan sangat memuaskan!', sentiment: 'POSITIVE', score: 0.92, confidence: 0.95, emotions: ['happy','grateful'], language: 'id' },
    { platform: 'TELEGRAM', userId: 'user2', message: 'Bot ini sangat membantu pekerjaan saya', sentiment: 'POSITIVE', score: 0.85, confidence: 0.88, emotions: ['satisfied'], language: 'id' },
    { platform: 'WHATSAPP', userId: 'user3', message: 'Kenapa tiket saya belum ditangani? Sudah 2 hari!', sentiment: 'NEGATIVE', score: 0.25, confidence: 0.91, emotions: ['frustrated','angry'], language: 'id' },
    { platform: 'TELEGRAM', userId: 'user4', message: 'Saya ingin tahu jadwal maintenance selanjutnya', sentiment: 'NEUTRAL', score: 0.50, confidence: 0.82, emotions: ['curious'], language: 'id' },
    { platform: 'WHATSAPP', userId: 'user5', message: 'Fitur baru lumayan bagus tapi masih ada bug', sentiment: 'MIXED', score: 0.55, confidence: 0.78, emotions: ['hopeful','disappointed'], language: 'id' },
    { platform: 'WHATSAPP', userId: 'user6', message: 'Respon cepat sekali, mantap!', sentiment: 'POSITIVE', score: 0.95, confidence: 0.97, emotions: ['impressed'], language: 'id' },
    { platform: 'TELEGRAM', userId: 'user7', message: 'Error terus pas login, sangat mengecewakan', sentiment: 'NEGATIVE', score: 0.15, confidence: 0.93, emotions: ['frustrated'], language: 'id' },
    { platform: 'WHATSAPP', userId: 'user8', message: 'Biasa aja sih, standar lah', sentiment: 'NEUTRAL', score: 0.48, confidence: 0.75, emotions: [], language: 'id' },
    { platform: 'TELEGRAM', userId: 'user9', message: 'Harga cukup terjangkau, fitur oke', sentiment: 'POSITIVE', score: 0.78, confidence: 0.85, emotions: ['satisfied'], language: 'id' },
    { platform: 'WHATSAPP', userId: 'user10', message: 'Servernya sering down akhir-akhir ini', sentiment: 'NEGATIVE', score: 0.20, confidence: 0.90, emotions: ['annoyed'], language: 'id' },
    { platform: 'TELEGRAM', userId: 'user11', message: 'Bagus sih tapi agak lambat', sentiment: 'MIXED', score: 0.52, confidence: 0.80, emotions: ['neutral'], language: 'id' },
    { platform: 'WHATSAPP', userId: 'user12', message: 'Sangat recommended! 5 bintang!', sentiment: 'POSITIVE', score: 0.98, confidence: 0.99, emotions: ['excited','happy'], language: 'id' },
  ];

  for (const s of sentiments) {
    await db.sentimentLog.create({ data: s });
  }
  console.log('Sentiment: ' + sentiments.length + ' seeded');

  // Seed Inbox Messages
  const inbox = [
    { platform: 'WHATSAPP', fromNumber: '+6281234567890', fromName: 'Budi Santoso', content: 'Halo admin, saya mau tanya soal langganan premium', sentiment: 'NEUTRAL', tags: ['inquiry','premium'] },
    { platform: 'TELEGRAM', fromNumber: '@siti_rhy', fromName: 'Siti Rahayu', groupId: 'grp1', groupName: 'Support Group', content: 'Tolong bantu saya, tiket TK-0042 belum direspon', sentiment: 'NEGATIVE', tags: ['urgent','tiket'] },
    { platform: 'WHATSAPP', fromNumber: '+6281234567892', fromName: 'Andi Wijaya', content: 'Terima kasih sudah bantu resolve masalah saya!', sentiment: 'POSITIVE', tags: ['feedback'] },
    { platform: 'TELEGRAM', fromNumber: '@dewi_lt', fromName: 'Dewi Lestari', content: 'Apakah ada diskon untuk paket enterprise?', sentiment: 'NEUTRAL', tags: ['sales','enterprise'] },
    { platform: 'WHATSAPP', fromNumber: '+6281234567894', fromName: 'Rudi Hermawan', groupId: 'grp2', groupName: 'IT Department', content: 'Bot error lagi, tolong cek segera', sentiment: 'NEGATIVE', tags: ['bug','urgent'], isStarred: true },
    { platform: 'TELEGRAM', fromNumber: '@maya_s', fromName: 'Maya Sari', content: 'Saya mau daftar akun baru, gimana caranya?', sentiment: 'NEUTRAL', tags: ['onboarding'] },
    { platform: 'WHATSAPP', fromNumber: '+6281234567896', fromName: 'Fahri Ibrahim', content: 'Keren banget fitur AI-nya, sangat membantu!', sentiment: 'POSITIVE', tags: ['feedback','ai'], isRead: true },
    { platform: 'WHATSAPP', fromNumber: '+6281234567897', fromName: 'Lisa Permata', groupId: 'grp1', groupName: 'Support Group', content: 'Ada masalah dengan pembayaran invoice INV-003', sentiment: 'NEGATIVE', tags: ['payment','invoice'] },
    { platform: 'TELEGRAM', fromNumber: '@ahmad_f', fromName: 'Ahmad Fauzi', content: 'Kapan fitur voice message tersedia?', sentiment: 'NEUTRAL', tags: ['feature-request'] },
    { platform: 'WHATSAPP', fromNumber: '+6281234567899', fromName: 'Rina Wati', content: 'Bot-nya bagus, cuma kadang lambat respon', sentiment: 'MIXED', tags: ['feedback'] },
  ];

  for (const m of inbox) {
    await db.inboxMessage.create({ data: m });
  }
  console.log('Inbox: ' + inbox.length + ' seeded');

  await db.$disconnect();
  console.log('Done!');
}

seed().catch(e => { console.error(e); process.exit(1); });
