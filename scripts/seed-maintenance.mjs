/**
 * Seed Maintenance Schedules — 9 jenis PM × 26 lokasi neuCentrIX = 234 jadwal.
 *
 * Usage:
 *   node scripts/seed-maintenance.mjs
 *   node scripts/seed-maintenance.mjs http://192.168.100.157:4000
 *
 * Env variables (optional):
 *   API_URL           — default http://localhost:4000
 *   ADMIN_USERNAME    — default admin
 *   ADMIN_PASSWORD    — default admin123
 */

const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:4000';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ── 26 Lokasi neuCentrIX ────────────────────────────────────────────────────
const LOCATIONS = [
  // Sumatera
  { code: 'BTM', fullName: 'neuCentrIX Batam Center',          region: 'Riau Islands' },
  { code: 'PKU', fullName: 'neuCentrIX Pekanbaru',             region: 'Riau' },
  { code: 'TLK', fullName: 'neuCentrIX Talang Kelapa',         region: 'South Sumatera' },
  { code: 'TKL', fullName: 'neuCentrIX Tanjung Karang Lampung',region: 'Lampung' },
  { code: 'ACH', fullName: 'neuCentrIX Aceh',                  region: 'Aceh' },
  { code: 'PLM', fullName: 'neuCentrIX Palembang',             region: 'South Sumatera' },
  { code: 'MDN', fullName: 'neuCentrIX Medan Centrum',         region: 'North Sumatera' },

  // Jawa
  { code: 'KTS', fullName: 'neuCentrIX Karet Tengsin',         region: 'Jakarta' },
  { code: 'MRY', fullName: 'neuCentrIX Meruya',                region: 'Jakarta' },
  { code: 'JTN', fullName: 'neuCentrIX Jatinegara',            region: 'Jakarta' },
  { code: 'LMB', fullName: 'neuCentrIX Lembong',               region: 'Bandung' },
  { code: 'KBL', fullName: 'neuCentrIX Kebalen',               region: 'Semarang' },
  { code: 'MLG', fullName: 'neuCentrIX Malang',                region: 'East Java' },
  { code: 'GBG', fullName: 'neuCentrIX Gubeng',                region: 'Surabaya' },
  { code: 'KLS', fullName: 'neuCentrIX Kaliasem',              region: 'East Java' },
  { code: 'CRB', fullName: 'neuCentrIX Cirebon',               region: 'West Java' },

  // Kalimantan
  { code: 'BPN', fullName: 'neuCentrIX TTC Balikpapan',        region: 'East Kalimantan' },
  { code: 'PTK', fullName: 'neuCentrIX Pontianak',             region: 'West Kalimantan' },
  { code: 'BJM', fullName: 'neuCentrIX Ulin Banjarmasin',      region: 'South Kalimantan' },
  { code: 'KTB', fullName: 'neuCentrIX Kotabaru',              region: 'South Kalimantan' },
  { code: 'SPK', fullName: 'neuCentrIX Sepaku',                region: 'East Kalimantan' },
  { code: 'BTA', fullName: 'neuCentrIX Batuampar',             region: 'Batam' },

  // Sulawesi & Papua
  { code: 'MKS', fullName: 'neuCentrIX Mattoangin',            region: 'South Sulawesi' },
  { code: 'PGR', fullName: 'neuCentrIX Pugeran',               region: 'South Sulawesi' },
  { code: 'MND', fullName: 'neuCentrIX Paniki',                region: 'North Sulawesi' },
  { code: 'JPR', fullName: 'neuCentrIX Jayapura',              region: 'Papua' },
];

// ── 9 Jenis Peralatan PM ────────────────────────────────────────────────────
const EQUIPMENT_TYPES = [
  {
    title: 'PAC',
    description: 'Preventive Maintenance PAC (Precision Air Conditioning) — pembersihan filter, pengecekan freon, cek temperatur ruangan.',
    intervalMonths: 2,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 7,
    reminderEveryMonths: 2,
  },
  {
    title: 'AC',
    description: 'Preventive Maintenance AC (Air Conditioning) — pembersihan indoor/outdoor, cek tekanan freon, cek drainage.',
    intervalMonths: 2,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 7,
    reminderEveryMonths: 2,
  },
  {
    title: 'FSS',
    description: 'Preventive Maintenance FSS (Fire Suppression System) — pengecekan tabung, sensor asap, panel alarm, dan nozzle.',
    intervalMonths: 3,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 7,
    reminderEveryMonths: 3,
  },
  {
    title: 'AKSES DOOR',
    description: 'Preventive Maintenance Akses Door — pengecekan card reader, magnetic lock, push button, dan log akses.',
    intervalMonths: 3,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 7,
    reminderEveryMonths: 3,
  },
  {
    title: 'CCTV',
    description: 'Preventive Maintenance CCTV — pembersihan lensa, cek recording/storage NVR, cek kabel dan konektor.',
    intervalMonths: 3,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 7,
    reminderEveryMonths: 3,
  },
  {
    title: 'EMS',
    description: 'Preventive Maintenance EMS (Environmental Monitoring System) — kalibrasi sensor suhu, kelembaban, dan water leak.',
    intervalMonths: 3,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 7,
    reminderEveryMonths: 3,
  },
  {
    title: 'UPS',
    description: 'Preventive Maintenance UPS — pengecekan battery health, load test, pengecekan capacitor dan fan.',
    intervalMonths: 3,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 7,
    reminderEveryMonths: 3,
  },
  {
    title: 'GROUNDING & ARRESTER',
    description: 'Preventive Maintenance Grounding & Arrester — pengukuran grounding resistance, pengecekan SPD/arrester, cek kabel ground.',
    intervalMonths: 6,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 14,
    reminderEveryMonths: 6,
  },
  {
    title: 'PANEL',
    description: 'Preventive Maintenance Panel Listrik — pengecekan MCB, kabel, termografi panel, torque terminal, dan pembersihan.',
    intervalMonths: 12,
    anchorMonth: 1,
    anchorDay: 1,
    notifyDaysBefore: 30,
    reminderEveryMonths: 12,
  },
];

// ── Generate 234 jadwal (9 jenis × 26 lokasi) ───────────────────────────────
const SCHEDULES = [];
for (const loc of LOCATIONS) {
  for (const equipment of EQUIPMENT_TYPES) {
    SCHEDULES.push({
      title: `${equipment.title} — ${loc.fullName}`,
      description: equipment.description,
      location: loc.fullName,
      intervalMonths: equipment.intervalMonths,
      anchorMonth: equipment.anchorMonth,
      anchorDay: equipment.anchorDay,
      notifyDaysBefore: equipment.notifyDaysBefore,
      reminderEveryMonths: equipment.reminderEveryMonths,
    });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const INTERVAL_LABEL = {
  1: 'Bulanan',
  2: '2 Bulanan',
  3: 'Triwulan',
  6: 'Semesteran',
  12: 'Tahunan',
};

async function main() {
  console.log(`\n🔧 Seed PM Schedules — ${LOCATIONS.length} lokasi × ${EQUIPMENT_TYPES.length} jenis = ${SCHEDULES.length} jadwal`);
  console.log(`   API: ${API_URL}`);
  console.log(`   User: ${USERNAME}\n`);

  // 1. Login
  console.log('⏳ Logging in...');
  const loginRes = await fetch(`${API_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.text();
    console.error(`❌ Login gagal (${loginRes.status}): ${err}`);
    process.exit(1);
  }

  const { token } = await loginRes.json();
  console.log('✅ Login OK\n');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. Ambil jadwal yang sudah ada
  console.log('⏳ Mengambil data jadwal yang sudah ada...');
  const existingRes = await fetch(`${API_URL}/api/admin/maintenance?limit=500`, { headers });
  const existingBody = await existingRes.json();
  const existing = existingBody.data ?? [];
  const existingTitles = new Set(existing.map((s) => s.title.toLowerCase()));
  console.log(`   Ditemukan ${existing.length} jadwal yang sudah ada.\n`);

  // 3. Buat jadwal per lokasi
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < SCHEDULES.length; i++) {
    const schedule = SCHEDULES[i];
    const progressPct = Math.round(((i + 1) / SCHEDULES.length) * 100);

    if (existingTitles.has(schedule.title.toLowerCase())) {
      process.stdout.write(`   ⏭️  [${progressPct}%] ${schedule.title} — sudah ada\r`);
      skipped++;
      continue;
    }

    const res = await fetch(`${API_URL}/api/admin/maintenance`, {
      method: 'POST',
      headers,
      body: JSON.stringify(schedule),
    });

    if (res.ok) {
      const { data } = await res.json();
      console.log(`   ✅ [${progressPct}%] ${schedule.title} → ${INTERVAL_LABEL[schedule.intervalMonths]} | next: ${new Date(data.nextDueDate).toLocaleDateString('id-ID')}`);
      created++;
    } else {
      const err = await res.text();
      console.log(`   ❌ [${progressPct}%] ${schedule.title} — GAGAL (${res.status}): ${err}`);
      failed++;
    }

    // Rate limit: jeda 50ms antar request agar tidak membebani API
    await sleep(50);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   ✅ Dibuat   : ${created}`);
  console.log(`   ⏭️  Dilewati : ${skipped}`);
  console.log(`   ❌ Gagal    : ${failed}`);
  console.log(`   📊 Total    : ${SCHEDULES.length} jadwal (${LOCATIONS.length} lokasi × ${EQUIPMENT_TYPES.length} jenis)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
