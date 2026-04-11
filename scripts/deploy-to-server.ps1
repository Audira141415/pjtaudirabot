# deploy-to-server.ps1 - Deploy PJTAudiBot ke audira@192.168.100.157
# Jalankan: .\scripts\deploy-to-server.ps1

$ErrorActionPreference = "Stop"
$SERVER     = "audira@192.168.100.157"
$DEPLOY_DIR = "/home/audira/pjtaudirabot"
$ROOT       = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "    FAIL: $msg" -ForegroundColor Red; exit 1 }

# 1. Cek file lokal
Step "1/8  Cek file lokal"
if (-not (Test-Path "$ROOT\.env.production"))         { Fail ".env.production tidak ditemukan" }
if (-not (Test-Path "$ROOT\google-credentials.json")) { Fail "google-credentials.json tidak ditemukan" }
OK ".env.production + google-credentials.json ada"

# 2. Test SSH
Step "2/8  Test koneksi SSH"
$sshTest = ssh -o BatchMode=yes -o ConnectTimeout=8 $SERVER "echo SSH_OK" 2>&1
if ($sshTest -notmatch "SSH_OK") {
    Write-Host "    SSH key belum terpasang. Jalankan dulu:" -ForegroundColor Yellow
    Write-Host '    Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | ssh audira@192.168.100.157 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"' -ForegroundColor Yellow
    exit 1
}
OK "SSH berhasil"

# 3. Kirim .env
Step "3/8  Kirim .env.production"
scp "$ROOT\.env.production" "${SERVER}:/tmp/.env.production"
OK ".env.production terkirim"

# 4. Kirim credentials
Step "4/8  Kirim google-credentials.json"
scp "$ROOT\google-credentials.json" "${SERVER}:/tmp/google-credentials.json"
OK "google-credentials.json terkirim"

# 5. Setup direktori
Step "5/8  Setup direktori + repo"
ssh $SERVER "mkdir -p $DEPLOY_DIR/logs && echo DIR_OK"

$repoCheck = ssh $SERVER "test -d $DEPLOY_DIR/.git && echo HAS_REPO || echo NO_REPO"
if ($repoCheck -match "NO_REPO") {
    $repoUrl = Read-Host "    Masukkan URL git repo (contoh: https://github.com/org/repo.git)"
    ssh $SERVER "cd $DEPLOY_DIR && git clone '$repoUrl' ."
    OK "Repository di-clone"
} else {
    ssh $SERVER "cd $DEPLOY_DIR && git pull origin main"
    OK "Repository di-update"
}

# 6. Pasang config
Step "6/8  Pasang config di server"
ssh $SERVER "mv /tmp/.env.production $DEPLOY_DIR/.env.production && mv /tmp/google-credentials.json $DEPLOY_DIR/google-credentials.json && chmod 600 $DEPLOY_DIR/.env.production && chmod 600 $DEPLOY_DIR/google-credentials.json && mkdir -p ~/.config/pjtaudi && chmod 700 ~/.config/pjtaudi && test -f ~/.config/pjtaudi/secrets.env || echo 'WARN: ~/.config/pjtaudi/secrets.env belum dibuat' && echo CONFIG_OK"
OK "Config terpasang"

# 7. Build + launch
Step "7/8  Build dan launch containers (pertama kali ~5-10 menit)"
ssh $SERVER "cd $DEPLOY_DIR && docker compose --env-file .env.production --env-file ~/.config/pjtaudi/secrets.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml build --no-cache && docker compose --env-file .env.production --env-file ~/.config/pjtaudi/secrets.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d && echo COMPOSE_OK"
OK "Containers berjalan"

# 7b. Migrate
Step "7b/8 Database migration"
$migrateScript = 'for i in $(seq 1 20); do STATUS=$(docker inspect --format="{{.State.Health.Status}}" pjtaudi-api 2>/dev/null); [ "$STATUS" = "healthy" ] && break; echo "Waiting ($i/20) status=$STATUS"; sleep 5; done; docker exec pjtaudi-api npx prisma migrate deploy && echo MIGRATE_OK'
ssh $SERVER $migrateScript
OK "Migration selesai"

# 8. Health check
Step "8/8  Verifikasi"
$ps = ssh $SERVER 'docker ps --format "table {{.Names}}\t{{.Status}}" | grep pjtaudi'
Write-Host $ps
$health = ssh $SERVER 'curl -sf http://localhost:4000/health && echo HEALTH_OK || echo HEALTH_FAIL'
if ($health -match "HEALTH_FAIL") {
    Write-Host "    WARN: API belum healthy - cek: docker logs pjtaudi-api" -ForegroundColor Yellow
} else {
    OK "API health OK"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DEPLOY SELESAI!" -ForegroundColor Green
Write-Host "  Dashboard : http://192.168.100.157:3000" -ForegroundColor Green
Write-Host "  API       : http://192.168.100.157:4000/health" -ForegroundColor Green
Write-Host "  Admin     : lihat ~/.config/pjtaudi/secrets.last-rotated.env di server" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green