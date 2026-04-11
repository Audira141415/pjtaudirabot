# deploy-to-server.ps1 - Deploy PJTAudiBot ke audira@192.168.100.157
# Jalankan: .\scripts\deploy-to-server.ps1

$ErrorActionPreference = "Stop"
$SERVER     = "audira@192.168.100.157"
$DEPLOY_DIR = "/home/audira/pjtaudirabot"
$REPO_URL   = "https://github.com/Audira141415/pjtaudirabot.git"
$ROOT       = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "    FAIL: $msg" -ForegroundColor Red; exit 1 }

$REMOTE_STAGE_DIR = "~/.config/pjtaudi/.staging"

function Invoke-SSH {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string]$Context
    )

    ssh $SERVER $Command
    if ($LASTEXITCODE -ne 0) {
        Fail "$Context (exit code $LASTEXITCODE)"
    }
}

function Invoke-SSHCapture {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string]$Context
    )

    $output = ssh $SERVER $Command
    if ($LASTEXITCODE -ne 0) {
        Fail "$Context (exit code $LASTEXITCODE)"
    }

    return $output
}

function Invoke-SCP {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination,
        [Parameter(Mandatory = $true)][string]$Context
    )

    scp $Source $Destination
    if ($LASTEXITCODE -ne 0) {
        Fail "$Context (exit code $LASTEXITCODE)"
    }
}

# 1. Cek file lokal
Step "1/8  Cek file lokal"
if (-not (Test-Path "$ROOT\.env.production"))         { Fail ".env.production tidak ditemukan" }
if (-not (Test-Path "$ROOT\google-credentials.json")) { Fail "google-credentials.json tidak ditemukan" }
OK ".env.production + google-credentials.json ada"

# 2. Test SSH
Step "2/9  Test koneksi SSH"
$sshTest = ssh -o BatchMode=yes -o ConnectTimeout=8 $SERVER "echo SSH_OK" 2>&1
if ($sshTest -notmatch "SSH_OK") {
    Write-Host "    SSH key belum terpasang. Jalankan dulu:" -ForegroundColor Yellow
    Write-Host '    Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | ssh audira@192.168.100.157 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"' -ForegroundColor Yellow
    exit 1
}
OK "SSH berhasil"

# 3. Kirim .env
Step "3/9  Kirim .env.production"
Invoke-SSH -Command "mkdir -p $REMOTE_STAGE_DIR && chmod 700 $REMOTE_STAGE_DIR" -Context "Siapkan secure staging dir gagal"
Invoke-SCP -Source "$ROOT\.env.production" -Destination "${SERVER}:$REMOTE_STAGE_DIR/.env.production" -Context "Upload .env.production gagal"
OK ".env.production terkirim"

# 4. Kirim credentials
Step "4/9  Kirim google-credentials.json"
Invoke-SCP -Source "$ROOT\google-credentials.json" -Destination "${SERVER}:$REMOTE_STAGE_DIR/google-credentials.json" -Context "Upload google-credentials.json gagal"
OK "google-credentials.json terkirim"

# 5. Setup direktori
Step "5/9  Setup direktori + repo"
Invoke-SSH -Command "mkdir -p $DEPLOY_DIR/logs" -Context "Setup direktori gagal"

$repoCheck = Invoke-SSHCapture -Command "test -d $DEPLOY_DIR/.git && echo HAS_REPO || echo NO_REPO" -Context "Cek repository gagal"
if ($repoCheck -match "NO_REPO") {
    Invoke-SSH -Command "cd $DEPLOY_DIR && git clone '$REPO_URL' ." -Context "Clone repository gagal"
    OK "Repository di-clone"
} else {
    # Reset tracked files to remote state; avoid deleting untracked runtime data.
    Invoke-SSH -Command "cd $DEPLOY_DIR && git fetch origin main && git reset --hard origin/main" -Context "Sync repository gagal"
    OK "Repository di-update"
}

# 6. Pasang config
Step "6/9  Pasang config di server"
Invoke-SSH -Command "mkdir -p ~/.config/pjtaudi && chmod 700 ~/.config/pjtaudi && install -m 600 $REMOTE_STAGE_DIR/.env.production $DEPLOY_DIR/.env.production && install -m 600 $REMOTE_STAGE_DIR/google-credentials.json $DEPLOY_DIR/google-credentials.json && rm -f $REMOTE_STAGE_DIR/.env.production $REMOTE_STAGE_DIR/google-credentials.json" -Context "Pasang config gagal"
Invoke-SSH -Command "test -f ~/.config/pjtaudi/secrets.env" -Context "File ~/.config/pjtaudi/secrets.env wajib ada"
OK "Config terpasang"

# 7. Preflight disk space
Step "7/9  Preflight disk space"
$diskPctRaw = Invoke-SSHCapture -Command "df --output=pcent / | tail -1 | tr -dc '0-9'" -Context "Cek disk usage gagal"
$diskPct = [int]$diskPctRaw
if ($diskPct -ge 90) {
    Fail "Disk server ${diskPct}% terpakai. Jalankan cleanup dulu (contoh: docker system prune -a --volumes)."
}
OK "Disk usage aman (${diskPct}%)"

# 8. Build + launch
Step "8/9  Build dan launch containers (pertama kali ~5-10 menit)"
Invoke-SSH -Command "cd $DEPLOY_DIR && docker compose --env-file .env.production --env-file ~/.config/pjtaudi/secrets.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml build --no-cache && docker compose --env-file .env.production --env-file ~/.config/pjtaudi/secrets.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d" -Context "Build/launch docker compose gagal"
OK "Containers berjalan"

# 8b. Migrate
Step "8b/9 Database migration"
$waitApiHealthy = "for i in `$(seq 1 30); do STATUS=`$(docker inspect --format='{{.State.Health.Status}}' pjtaudi-api 2>/dev/null || echo 'missing'); if [ `"`$STATUS`" = 'healthy' ]; then exit 0; fi; echo waiting_api_healthy_`$i status=`$STATUS; sleep 5; done; exit 1"
Invoke-SSH -Command $waitApiHealthy -Context "API tidak healthy setelah menunggu 150 detik"

# Run migrations from source checkout in one-off container on the same network as DB container.
$migrateCmd = "cd $DEPLOY_DIR && NET=`$(docker inspect -f '{{range `$k,`$v := .NetworkSettings.Networks}}{{println `$k}}{{end}}' pjtaudi-db | head -n1) && test -n `"`$NET`" && docker run --rm --network `"`$NET`" --env-file $DEPLOY_DIR/.env.production --env-file ~/.config/pjtaudi/secrets.env -v ${DEPLOY_DIR}:/workspace -w /workspace node:20 sh -lc 'npm i -g pnpm >/dev/null 2>&1 && pnpm install --frozen-lockfile --ignore-scripts >/dev/null && pnpm --filter @pjtaudirabot/database exec prisma migrate deploy --schema /workspace/packages/database/schema.prisma'"
Invoke-SSH -Command $migrateCmd -Context "Database migration gagal"
OK "Migration selesai"

# 9. Health check
Step "9/9  Verifikasi"
$ps = Invoke-SSHCapture -Command "docker ps --filter name=pjtaudi- --format 'table {{.Names}}`t{{.Status}}'" -Context "Cek container status gagal"
Write-Host $ps
$health = Invoke-SSHCapture -Command "curl -sf http://localhost:4000/health" -Context "Health check API gagal"
Write-Host "    API health response: $health"
OK "API health OK"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DEPLOY SELESAI!" -ForegroundColor Green
Write-Host "  Dashboard : http://192.168.100.157:3000" -ForegroundColor Green
Write-Host "  API       : http://192.168.100.157:4000/health" -ForegroundColor Green
Write-Host "  Admin     : lihat ~/.config/pjtaudi/secrets.last-rotated.env di server" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green