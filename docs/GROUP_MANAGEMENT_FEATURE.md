# Fitur Group Management & Report Configuration

## 📋 Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Setup Awal](#setup-awal)
3. [Perintah-Perintah](#perintah-perintah)
4. [Contoh Penggunaan](#contoh-penggunaan)
5. [Database Tables](#database-tables)
6. [Architecture](#architecture)

---

## Pengenalan

Fitur **Group Management** memungkinkan Anda untuk:
- ✅ Mendaftarkan grup WhatsApp yang ingin di-monitor
- ✅ Mengatur grup mana saja yang akan menerima daily/weekly/monthly reports
- ✅ Mengelola konfigurasi pengiriman report per grup  
- ✅ Mengganti silent mode dengan selective delivery (hanya ke grup terdaftar)

### Perbedaan dengan Sistem Sebelumnya

**Sebelumnya (Hardcoded):**
```
ADMIN_GROUP_JIDS=120363xxx@g.us,120363yyy@g.us
→ Semua reports dikirim ke semua grup di list
```

**Sekarang (Database-driven):**
```
Database menyimpan per-group configuration untuk:
- Daily report? (Yes/No)
- Weekly report? (Yes/No)
- Monthly report? (Yes/No)
- Custom schedule per group
```

---

## Setup Awal

### 1. Database Migration
Migration sudah otomatis berjalan saat Anda:
```bash
cd packages/database
npx prisma migrate deploy
```

Ini membuat 2 tabel baru:
- `ChatGroup` - Menyimpan metadata grup & konfigurasi monitoring
- `ReportGroupConfig` - Menyimpan setting pengiriman report per grup

### 2. Register Grup Pertama

Gunakan command `!add-group` untuk mendaftarkan grup:

```
!add-group 120363xxxxxxxxxxxxxxxxx@g.us "Admin Group"
```

**Catatan JID WhatsApp:**
- Format: `120363xxxxxxxxxxxxxxxxx@g.us` (bukan nama grup, tapi ID teknis)
- Dapatkan dari: Buka gruppe, perhatikan URL group chat atau gunakan debug tool

### 3. Aktifkan Monitoring (Opsional)

Jika ingin bot mendengarkan pesan di grup:
```
!set-monitor-group 120363xxxxxxxxxxxxxxxxx@g.us true
```

---

## Perintah-Perintah

### 1. `!list-groups`
Tampilkan semua grup yang terdaftar + konfigurasi mereka

**Output:**
```
*Daftar Grup dan Konfigurasi:*

1. *Admin Group*
   JID: `120363123456@g.us`
   Monitor: ✅ | Target: 📤
   Reports: 📅 Daily, 📆 Weekly, 📊 Monthly

2. *Support Team*
   JID: `120363789012@g.us`
   Monitor: ⛔ | Target: ❌
   Reports: Tidak ada
```

---

### 2. `!add-group <jid> <name>`
Tambahkan grup baru

**Syntax:**
```
!add-group 120363xxxxxxxxxxxxxxxxx@g.us "My Group Name"
```

**Opsi:**
- Group dibuat dengan monitoring=OFF dan isReportTarget=OFF (disable semua)
- Anda harus explicitly mengaktifkan dengan command lain

**Output:**
```
✅ Grup ditambahkan: *My Group Name*
`120363xxxxxxxxxxxxxxxxx@g.us`

Konfigurasi monitoring dan report dengan:
!set-monitor-group <jid> true
!set-report-target <type> <jid> true
```

---

### 3. `!set-monitor-group <jid> <true|false>`
Aktifkan/nonaktifkan monitoring untuk grup

**Syntax:**
```
!set-monitor-group 120363xxxxxxxxxxxxxxxxx@g.us true
!set-monitor-group 120363xxxxxxxxxxxxxxxxx@g.us false
```

**Penjelasan:**
- `true` = Bot akan mendengarkan pesan di grup ini
- `false` = Bot akan mengabaikan pesan dari grup ini

**Output:**
```
✅ DIAKTIFKAN

Grup *Admin Group* monitoring diaktifkan
```

---

### 4. `!set-report-target <type> <jid> <true|false>`
Atur laporan mana saja yang dikirim ke grup

**Syntax:**
```
!set-report-target daily 120363xxxxxxxxxxxxxxxxx@g.us true
!set-report-target weekly 120363xxxxxxxxxxxxxxxxx@g.us false
!set-report-target monthly 120363xxxxxxxxxxxxxxxxx@g.us true
```

**Opsi type:**
- `daily` - Daily report (setiap hari jam 7 pagi)
- `weekly` - Weekly report (setiap Senin jam 8 pagi)
- `monthly` - Monthly report (akhir bulan jam 6 sore)

**Penjelasan:**
- `true` = Aktifkan pengiriman report type ini ke grup
- `false` = Nonaktifkan pengiriman report type ini ke grup

**Output:**
```
✅ DIAKTIFKAN

Laporan *DAILY* untuk grup *Admin Group* diaktifkan
```

---

### 5. `! report-config`
Tampilkan konfigurasi laporan yang sedang aktif

**Output:**
```
*📊 Konfigurasi Laporan Aktif*

*Admin Group*
JID: `120363123456@g.us`
  📅 Daily @ 7:00
  📆 Weekly @ Mon 8:00
  📊 Monthly @ Day Last 18:00

*Support Team*
JID: `120363789012@g.us`
  📅 Daily @ 7:00
```

---

### 6. `!remove-group <jid>`
Hapus grup dari daftar terdaftar

**Syntax:**
```
!remove-group 120363xxxxxxxxxxxxxxxxx@g.us
```

**Catatan:**
- Menghapus grup juga menghapus konfigurasi reportnya
- Tidak reversible (harus add-group lagi untuk re-register)

**Output:**
```
✅ Grup *My Group Name* telah dihapus
```

---

## Contoh Penggunaan

### Scenario 1: Dua Grup Berbeda

**Setup:**
1. Admin Group - menerima semua reports
2. Support Team - hanya daily reports

```
# Register kedua grup
!add-group 120363111111@g.us "Admin Group"
!add-group 120363222222@g.us "Support Team"

# Konfigurasi Admin Group
!set-report-target daily 120363111111@g.us true
!set-report-target weekly 120363111111@g.us true
!set-report-target monthly 120363111111@g.us true

# Konfigurasi Support Team
!set-report-target daily 120363222222@g.us true
!set-report-target weekly 120363222222@g.us false
!set-report-target monthly 120363222222@g.us false

# Verify
!report-config
```

---

### Scenario 2: Keamanan dengan Silent Mode

**Setup dengan Silent Mode (default):**
```
Env: WHATSAPP_SILENT_MODE=true
```

Dengan silent mode ON:
- Bot tidak dikirim report ke ADMIN_GROUP_JIDS (dari .env)
- Bot HANYA dikirim ke grup yang dikonfigurasi via database

**Benefit:**
- Anda bisa mendaftar test group tanpa mengirim ke group produksi
- Anda bisa disable semua reports dengan tidak add-group sama sekali

---

### Scenario 3: Monitoring Aktif + Selective Reporting

```
# Register monitoring group (untuk mendengarkan pesan)
!add-group 120363333333@g.us "General Chat"
!set-monitor-group 120363333333@g.us true

# Register reporting group (untuk menerima laporan)
!add-group 120363444444@g.us "Management Reports"
!set-report-target daily 120363444444@g.us true
!set-report-target weekly 120363444444@g.us true
!set-report-target monthly 120363444444@g.us true
```

---

## Database Tables

### Table: `ChatGroup`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (CUID) |
| `groupJid` | TEXT | WhatsApp group JID (unique) |
| `groupName` | TEXT | Display name |
| `description` | TEXT | Optional description |
| `groupPicture` | TEXT | URL to group picture |
| `isMonitored` | BOOLEAN | Should bot listen to messages? |
| `isReportTarget` | BOOLEAN | Should reports be sent? |
| `reportTypes` | JSON | Array of enabled report types |
| `participantCount` | INTEGER | Number of group members |
| `lastMessageAt` | TIMESTAMP | When was last message in group? |
| `metadata` | JSON | Extra data |
| `createdAt` | TIMESTAMP | When was group registered |
| `updatedAt` | TIMESTAMP | Last modification time |

---

### Table: `ReportGroupConfig`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key |
| `chatGroupId` | TEXT | FK to ChatGroup |
| `enableDaily` | BOOLEAN | Send daily report? |
| `enableWeekly` | BOOLEAN | Send weekly report? |
| `enableMonthly` | BOOLEAN | Send monthly report? |
| `dailyHour` | INTEGER | Hour for daily (0-23, null=7) |
| `weeklyDay` | INTEGER | Day for weekly (0-6, null=1=Monday) |
| `weeklyHour` | INTEGER | Hour for weekly (0-23, null=8) |
| `monthlyDay` | INTEGER | Day for monthly (1-31, null=last day) |
| `monthlyHour` | INTEGER | Hour for monthly (0-23, null=18) |
| `timezone` | TEXT | IANA timezone (optional) |
| `includeCharts` | BOOLEAN | Include charts in report? |
| `includeSummary` | BOOLEAN | Include summary in report? |
| `createdAt` | TIMESTAMP | When was config created |
| `updatedAt` | TIMESTAMP | Last modification time |

---

## Architecture

### Data Flow

```
┌─────────────────────────┐
│  Scheduler (Hourly)     │
│  - daily-report-auto    │
│  - weekly-report-auto   │
│  - monthly-report-auto  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  reportService.generateReport() │
│  Return: Report text string     │
└────────────┬────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  sendToReportGroups(type, text)      │
│  Query DB for enabled groups for     │
│  this report type                    │
└────────────┬─────────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  connection.sendMessage()       │
│  Send to each configured group  │
└─────────────────────────────────┘
```

### Service Hierarchy

```
WhatsAppBot
├── ReportService
│   └── Generates report text
├── GroupManagementService
│   ├── getChatGroup()
│   ├── getReportTargetGroups()
│   ├── setGroupReportType()
│   └── formatGroupsList()
├── Commands
│   ├── AddGroupCommand
│   ├── SetMonitorGroupCommand
│   ├── SetReportTargetCommand
│   ├── ListGroupsCommand
│   ├── RemoveGroupCommand
│   └── ReportConfigCommand
└── Connection
    └── sendMessage()
```

---

## Troubleshooting

### Problem: "Grup tidak ditemukan"
**Solutions:**
- Pastikan JID format benar: `120363xxx@g.us`
- Gunakan `!list-groups` untuk melihat daftar terdaftar
- Gunakan `!add-group` untuk register grup baru

### Problem: "Silent mode enabled — skipping report broadcast"
**Solutions:**
- Silakan mode memang menghalangi pengiriman ke adminGroupJids dari .env
- Untuk mengirim report, register grup di database:
  ```
  !add-group <jid> <name>
  !set-report-target daily <jid> true
  ```

### Problem: Report tidak dikirim ke grup
**Check:**
1. Apakah grup sudah di-add? → `!list-groups`
2. Apakah report type diaktifkan? → `!report-config`
3. Apakah bot online & connected? → `!status`
4. Apakah jam pengiriman sudah tercapai? (Daily @ 7 AM, Weekly @ Monday 8 AM, Monthly @ Last day 6 PM)

---

## Migrasi dari Sistem Lama

**Jika Anda punya ADMIN_GROUP_JIDS di .env:**

1. Bot masih membaca env var tersebut sebagai fallback
2. Tapi kalau WHATSAPP_SILENT_MODE=true (recommended), env var tidak digunakan
3. Migrasi ke database:
   ```
   # Untuk setiap grup di ADMIN_GROUP_JIDS:
   !add-group <jid> "<group_name>"
   !set-report-target daily <jid> true
   !set-report-target weekly <jid> true
   !set-report-target monthly <jid> true
   ```

4. Setelah semua grup teregister, Anda bisa hapus/kosongkan ADMIN_GROUP_JIDS dari .env

---

## Future Enhancements

- [ ] Timezone support per group
- [ ] Custom schedules per group (saat ini semua group mengikuti global schedule)
- [ ] Report customization (include/exclude metrics)
- [ ] Retry logic untuk failed deliveries
- [ ] Event notifications ke specific groups
- [ ] Group-specific alert channels
