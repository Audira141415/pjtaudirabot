# Deploy Checklist — audira@bot-server (Proxmox Ubuntu 24.04)
> Tanggal: 2026-04-10 | Docker 28.2.2 | User: audira

---

## FASE 0 — Persiapan di Windows (lakukan dulu sebelum SSH)

### 0-A. Generate secrets (jalankan di PowerShell / WSL)
```powershell
# JWT Secret — salin hasilnya ke .env.production JWT_SECRET
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"

# DB Password — salin ke DB_PASSWORD dan DATABASE_URL di .env.production
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"

# Admin Password — salin ke ADMIN_PASSWORD
node -e "process.stdout.write(require('crypto').randomBytes(14).toString('base64url'))"
```

### 0-B. Edit .env.production
Buka `f:\PJTAUDIRABOT\.env.production` dan ganti semua `<<<CHANGE_ME_...>>>`:

| Field | Nilai |
|---|---|
| `SERVER_URL` | `http://<IP_PROXMOX_VM>:4000` |
| `DB_PASSWORD` | hasil openssl/crypto step 0-A |
| `DATABASE_URL` | ganti password di-inline: `...pjtaudi:<DB_PASSWORD>@db:5432/pjtaudi` |
| `JWT_SECRET` | hasil step 0-A |
| `ADMIN_PASSWORD` | hasil step 0-A |
| `TELEGRAM_BOT_TOKEN` | token baru dari @BotFather setelah revoke lama |

### 0-C. Revoke & buat ulang Telegram Bot Token
1. Buka Telegram → cari `@BotFather`
2. Kirim `/mybots` → pilih bot Anda
3. Pilih **API Token** → **Revoke current token**
4. Salin token baru → isi ke `TELEGRAM_BOT_TOKEN` di `.env.production`

---

## FASE 1 — Kirim file ke server

```bash
# Dari terminal Windows (CMD / PowerShell), ganti <SERVER_IP> dengan IP Proxmox VM
set SERVER_IP=<SERVER_IP>

# Kirim .env production
scp f:\PJTAUDIRABOT\.env.production audira@%SERVER_IP%:/tmp/.env.production

# Kirim Google credentials
scp f:\PJTAUDIRABOT\google-credentials.json audira@%SERVER_IP%:/tmp/google-credentials.json
```

---

## FASE 2 — Setup di server (SSH ke bot-server)

```bash
ssh audira@<SERVER_IP>
```

### 2-A. Buat direktori kerja
```bash
sudo mkdir -p /opt/pjtaudirabot/logs
sudo chown -R audira:audira /opt/pjtaudirabot
```

### 2-B. Clone repository
```bash
cd /opt/pjtaudirabot
git clone https://github.com/<YOUR_ORG>/pjtaudirabot.git .
# atau jika private, gunakan deploy key / personal access token
```

### 2-C. Pindahkan file config
```bash
mv /tmp/.env.production /opt/pjtaudirabot/.env
mv /tmp/google-credentials.json /opt/pjtaudirabot/google-credentials.json
chmod 600 /opt/pjtaudirabot/.env
chmod 600 /opt/pjtaudirabot/google-credentials.json
```

### 2-D. Verifikasi .env sudah benar
```bash
grep -E "NODE_ENV|SERVER_URL|DATABASE_URL|JWT_SECRET|ADMIN_PASSWORD|TELEGRAM_BOT_TOKEN" /opt/pjtaudirabot/.env
# Pastikan:
# NODE_ENV=production
# SERVER_URL=http://<IP_SERVER>:4000
# DATABASE_URL=...@db:5432/...  (bukan localhost)
# JWT_SECRET=<tidak ada placeholder <<<CHANGE_ME>>>)
```

---

## FASE 3 — Build & Launch semua container

```bash
cd /opt/pjtaudirabot

# Build semua image (butuh ~5-10 menit pertama kali)
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml build

# Jalankan semua service di background
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
```

### 3-A. Monitor startup
```bash
# Lihat semua status container
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps

# Ikuti log real-time (Ctrl+C untuk keluar)
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs -f --tail=50
```

### 3-B. Jalankan migrasi database (hanya pertama kali atau setelah update skema)
```bash
# Masuk ke container API dan jalankan Prisma migrate
docker exec pjtaudi-api npx prisma migrate deploy
```

---

## FASE 4 — Verifikasi setelah deploy

### 4-A. Health check API
```bash
curl http://localhost:4000/health
# Expected: {"status":"ok"} atau {"ok":true}
```

### 4-B. Status semua container
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# Expected: semua container STATUS = "Up X minutes (healthy)"
```

### 4-C. Test Telegram Bot
1. Buka Telegram
2. Cari bot Anda
3. Kirim pesan `/start`
4. Bot harus merespons dalam ≤3 detik

### 4-D. Test Dashboard
Buka browser: `http://<SERVER_IP>:3000`
- Login dengan `admin` / `<ADMIN_PASSWORD baru>`
- Navigasi ke **Tickets** → pastikan halaman load

### 4-E. Test koneksi Google Sheets
```bash
# Cek log API untuk error Google Sheets
docker logs pjtaudi-api 2>&1 | grep -i "sheet\|google\|credentials" | tail -20
# Tidak boleh ada error "file not found" atau "invalid credentials"
```

---

## FASE 5 — Auto-start saat server reboot

Karena semua service menggunakan `restart: always` di `docker-compose.prod.yml`,
container akan otomatis restart setelah reboot. Verifikasi dengan:

```bash
# Simulasi reboot (opsional — hanya jika ingin test)
sudo reboot

# Setelah login kembali, cek semua container jalan
docker ps
```

Jika ingin systemd unit sebagai safety net tambahan:

```bash
sudo tee /etc/systemd/system/pjtaudi-bot.service > /dev/null <<'EOF'
[Unit]
Description=PJTAudi Bot Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/pjtaudirabot
ExecStart=/usr/bin/docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml down
User=audira

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable pjtaudi-bot.service
sudo systemctl start pjtaudi-bot.service
```

---

## FASE 6 — Update / Redeploy (untuk deployment berikutnya)

```bash
cd /opt/pjtaudirabot

# Pull kode terbaru
git pull origin main

# Rebuild image yang berubah dan restart container
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --build

# Jalankan migrasi jika ada perubahan skema
docker exec pjtaudi-api npx prisma migrate deploy
```

---

## Checklist Ringkas ✅

- [ ] `JWT_SECRET` di-generate baru (bukan placeholder)
- [ ] `DB_PASSWORD` di-generate baru & konsisten di `DB_PASSWORD` + `DATABASE_URL`
- [ ] `ADMIN_PASSWORD` bukan `admin123`
- [ ] `TELEGRAM_BOT_TOKEN` sudah di-revoke + diganti dari @BotFather
- [ ] `DATABASE_URL` memakai hostname `db` (bukan `localhost`)
- [ ] `GOOGLE_SHEETS_CREDENTIALS` path = `/opt/google-credentials.json`
- [ ] File `.env` mode `600` (tidak world-readable)
- [ ] `docker ps` semua container status `healthy`
- [ ] `curl http://localhost:4000/health` → OK
- [ ] Telegram bot merespons `/start`
- [ ] Dashboard login berhasil di `http://<SERVER_IP>:3000`
