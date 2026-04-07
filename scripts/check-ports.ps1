# ============================================================
#  AUDIRA BOT - Smart Port Detection & Auto-Configuration
#  Checks all required ports, finds alternatives if occupied,
#  writes a temporary .env.ports override, and diagnoses errors.
# ============================================================

param(
    [switch]$Fix,        # Auto-fix by finding free ports
    [switch]$Silent      # Suppress verbose output
)

$ErrorActionPreference = 'Stop'

# ─── Default Port Map ─────────────────────────────────────────
$PortMap = [ordered]@{
    'API_PORT'       = 4000
    'TELEGRAM_PORT'  = 4010
    'WHATSAPP_PORT'  = 4020
    'DASHBOARD_PORT' = 3000
    'DB_PORT'        = 5433
    'REDIS_PORT'     = 6379
}

# ─── Load .env overrides if present ──────────────────────────
$envFile = Join-Path $PSScriptRoot '..\\.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*(API_PORT|TELEGRAM_PORT|WHATSAPP_PORT|DASHBOARD_PORT)\s*=\s*(\d+)') {
            $PortMap[$Matches[1]] = [int]$Matches[2]
        }
    }
}

# ─── Helper: Check if a port is in use ───────────────────────
function Test-PortInUse {
    param([int]$Port)
    $connections = netstat -ano 2>$null | Select-String ":$Port\s"
    return ($null -ne $connections -and $connections.Count -gt 0)
}

# ─── Helper: Get process info occupying a port ────────────────
function Get-PortOccupant {
    param([int]$Port)
    $lines = netstat -ano 2>$null | Select-String "LISTENING" | Select-String ":$Port\s"
    if (-not $lines) { return $null }

    $results = @()
    foreach ($line in $lines) {
        if ($line -match '\s(\d+)\s*$') {
            $procId = [int]$Matches[1]
            try {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    $results += [PSCustomObject]@{
                        PID         = $procId
                        ProcessName = $proc.ProcessName
                        Path        = $proc.Path
                        StartTime   = $proc.StartTime
                    }
                }
            } catch {
                $results += [PSCustomObject]@{
                    PID         = $procId
                    ProcessName = '(access denied)'
                    Path        = ''
                    StartTime   = $null
                }
            }
        }
    }
    return $results | Sort-Object PID -Unique
}

# ─── Helper: Find next free port starting from a base ────────
function Find-FreePort {
    param([int]$StartPort, [int]$MaxAttempts = 50)

    for ($p = $StartPort; $p -lt ($StartPort + $MaxAttempts); $p++) {
        if (-not (Test-PortInUse $p)) {
            return $p
        }
    }
    return -1
}

# ─── Helper: Diagnose common error causes ────────────────────
function Get-PortDiagnosis {
    param([string]$Service, [int]$Port, $Occupants)

    $diagnosis = @()

    foreach ($occ in $Occupants) {
        $name = $occ.ProcessName.ToLower()

        switch -Wildcard ($name) {
            'node'    { $diagnosis += "  PENYEBAB: Proses Node.js lain (PID $($occ.PID)) sedang berjalan." 
                        $diagnosis += "  SOLUSI:   Jalankan AUDIRA_STOP.bat dulu, atau: taskkill /PID $($occ.PID) /F" }
            'tsx'     { $diagnosis += "  PENYEBAB: tsx dev server (PID $($occ.PID)) masih aktif dari sesi sebelumnya."
                        $diagnosis += "  SOLUSI:   taskkill /PID $($occ.PID) /F" }
            'python*' { $diagnosis += "  PENYEBAB: Proses Python (PID $($occ.PID)) memakai port $Port."
                        $diagnosis += "  SOLUSI:   Hentikan proses Python tersebut atau gunakan port alternatif." }
            'java*'   { $diagnosis += "  PENYEBAB: Proses Java (PID $($occ.PID)) memakai port $Port."
                        $diagnosis += "  SOLUSI:   Hentikan service Java tersebut." }
            'nginx'   { $diagnosis += "  PENYEBAB: Nginx web server memakai port $Port."
                        $diagnosis += "  SOLUSI:   Stop nginx: nginx -s stop, atau ubah port." }
            'apache*' { $diagnosis += "  PENYEBAB: Apache/httpd memakai port $Port."
                        $diagnosis += "  SOLUSI:   Stop Apache via Services atau httpd -k stop." }
            'docker*' { $diagnosis += "  PENYEBAB: Docker container memakai port $Port."
                        $diagnosis += "  SOLUSI:   docker ps lalu docker stop <container_id>." }
            'com.docker*' { $diagnosis += "  PENYEBAB: Docker Desktop proxy memakai port $Port."
                        $diagnosis += "  SOLUSI:   docker compose down lalu start ulang." }
            'postgres*' { $diagnosis += "  PENYEBAB: PostgreSQL langsung (non-Docker) memakai port $Port."
                          $diagnosis += "  SOLUSI:   Stop service PostgreSQL lokal: net stop postgresql-x64-16" }
            'redis-server*' { $diagnosis += "  PENYEBAB: Redis lokal (non-Docker) memakai port $Port."
                              $diagnosis += "  SOLUSI:   Stop Redis lokal: net stop Redis" }
            default   { $diagnosis += "  PENYEBAB: Proses '$($occ.ProcessName)' (PID $($occ.PID)) memakai port $Port."
                        $diagnosis += "  SOLUSI:   Hentikan proses: taskkill /PID $($occ.PID) /F" }
        }

        if ($occ.Path) {
            $diagnosis += "  PATH:     $($occ.Path)"
        }
    }

    return $diagnosis
}

# ============================================================
#  MAIN: Scan all ports
# ============================================================
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "   AUDIRA BOT - Smart Port Scanner & Auto-Configurator" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""

$conflicts = @{}
$portOverrides = @{}
$allOk = $true

foreach ($entry in $PortMap.GetEnumerator()) {
    $svc  = $entry.Key
    $port = $entry.Value

    $inUse = Test-PortInUse $port

    if ($inUse) {
        $allOk = $false
        $occupants = Get-PortOccupant $port

        Write-Host "  [CONFLICT] " -ForegroundColor Red -NoNewline
        Write-Host "$svc = $port " -ForegroundColor Yellow -NoNewline
        Write-Host "- PORT SUDAH DIPAKAI!" -ForegroundColor Red

        $diagnosis = Get-PortDiagnosis $svc $port $occupants
        foreach ($line in $diagnosis) {
            Write-Host $line -ForegroundColor DarkYellow
        }

        if ($Fix) {
            # For DB/Redis: check if it's OUR container already running (common on restart)
            if ($svc -in @('DB_PORT', 'REDIS_PORT')) {
                $containerName = if ($svc -eq 'DB_PORT') { 'pjtaudi-db' } else { 'pjtaudi-redis' }
                $runningContainers = docker ps --format "{{.Names}}" 2>$null
                if ($runningContainers -contains $containerName) {
                    Write-Host "  [OK-DOCKER] " -ForegroundColor Green -NoNewline
                    Write-Host "$svc = $port - container $containerName sudah berjalan, tidak perlu pindah." -ForegroundColor Gray
                    Write-Host ""
                    # Not a real conflict — our container owns the port
                    $allOk = $true
                    continue
                }
            }

            $newPort = Find-FreePort ($port + 1)
            if ($newPort -gt 0) {
                Write-Host "  [AUTO-FIX] " -ForegroundColor Green -NoNewline
                Write-Host "Memindahkan $svc dari $port ke $newPort" -ForegroundColor White
                $portOverrides[$svc] = $newPort
                $conflicts[$svc] = @{ Old = $port; New = $newPort; Occupants = $occupants }
            } else {
                Write-Host "  [GAGAL]   Tidak ada port kosong ditemukan untuk $svc (range $port-$($port+50))" -ForegroundColor Red
            }
        }

        Write-Host ""
    } else {
        if (-not $Silent) {
            Write-Host "  [OK]      " -ForegroundColor Green -NoNewline
            Write-Host "$svc = $port - tersedia" -ForegroundColor Gray
        }
    }
}

# ─── Write .env.ports override file ──────────────────────────
$envPortsFile = Join-Path $PSScriptRoot '..\\.env.ports'

if ($portOverrides.Count -gt 0) {
    Write-Host ""
    Write-Host "  ────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  Menulis port override ke .env.ports ..." -ForegroundColor Cyan

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $lines = @(
        "# Auto-generated by check-ports.ps1 - $timestamp",
        "# Port asli bentrok, berikut port pengganti yang kosong.",
        ""
    )

    foreach ($kvp in $portOverrides.GetEnumerator()) {
        $lines += "$($kvp.Key)=$($kvp.Value)"
    }

    # If DB_PORT changed, also write new DATABASE_URL so Node services connect to right port
    if ($portOverrides.ContainsKey('DB_PORT')) {
        $newDbPort = $portOverrides['DB_PORT']
        # Parse current DATABASE_URL from .env
        $dbUrl = ''
        if (Test-Path $envFile) {
            $dbLine = Get-Content $envFile | Select-String '^\s*DATABASE_URL\s*='
            if ($dbLine) {
                $dbUrl = ($dbLine -split '=', 2)[1].Trim()
                # Replace the port number (after localhost: or 127.0.0.1:)
                $dbUrl = $dbUrl -replace '@(localhost|127\.0\.0\.1):\d+/', "@`$1:${newDbPort}/"
            }
        }
        if ($dbUrl) {
            $lines += "DATABASE_URL=$dbUrl"
            Write-Host "  [INFO]    DATABASE_URL diupdate ke port $newDbPort" -ForegroundColor Yellow
        }
    }

    # If REDIS_PORT changed, also write new REDIS_URL
    if ($portOverrides.ContainsKey('REDIS_PORT')) {
        $newRedisPort = $portOverrides['REDIS_PORT']
        $redisUrl = ''
        if (Test-Path $envFile) {
            $redisLine = Get-Content $envFile | Select-String '^\s*REDIS_URL\s*='
            if ($redisLine) {
                $redisUrl = ($redisLine -split '=', 2)[1].Trim()
                $redisUrl = $redisUrl -replace ':(localhost|127\.0\.0\.1):\d+', ":`$1:${newRedisPort}"
                # Handle redis://localhost:PORT format
                $redisUrl = $redisUrl -replace '(redis://(?:localhost|127\.0\.0\.1)):\d+', "`$1:${newRedisPort}"
            }
        }
        if ($redisUrl) {
            $lines += "REDIS_URL=$redisUrl"
            Write-Host "  [INFO]    REDIS_URL diupdate ke port $newRedisPort" -ForegroundColor Yellow
        }
    }

    $lines -join "`n" | Set-Content -Path $envPortsFile -Encoding UTF8 -NoNewline
    Write-Host "  [SAVED]   $envPortsFile" -ForegroundColor Green

    # Also update vite.config.ts proxy target if API_PORT changed
    if ($portOverrides.ContainsKey('API_PORT')) {
        $newApiPort = $portOverrides['API_PORT']
        Write-Host "  [INFO]    API_PORT berubah ke $newApiPort - Dashboard proxy akan redirect otomatis." -ForegroundColor Yellow
    }
    
    Write-Host ""
} elseif (Test-Path $envPortsFile) {
    # Clean up stale override file if all ports are now OK
    Remove-Item $envPortsFile -Force -ErrorAction SilentlyContinue
}

# ─── Summary ─────────────────────────────────────────────────
Write-Host ""
if ($allOk) {
    Write-Host "  ============================================================" -ForegroundColor Green
    Write-Host "   SEMUA PORT TERSEDIA - Siap untuk start!" -ForegroundColor Green
    Write-Host "  ============================================================" -ForegroundColor Green
} elseif ($portOverrides.Count -gt 0) {
    Write-Host "  ============================================================" -ForegroundColor Yellow
    Write-Host "   PORT OVERRIDE AKTIF - Menggunakan port alternatif:" -ForegroundColor Yellow
    Write-Host "  ============================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Service           Asli    Baru" -ForegroundColor White
    Write-Host "   -------           ----    ----" -ForegroundColor Gray

    foreach ($kvp in $conflicts.GetEnumerator()) {
        $svc = $kvp.Key
        $old = $kvp.Value.Old
        $new = $kvp.Value.New
        Write-Host "   $($svc.PadRight(18)) $($old.ToString().PadRight(8)) $new" -ForegroundColor White
    }
    Write-Host ""
} else {
    Write-Host "  ============================================================" -ForegroundColor Red
    Write-Host "   ADA PORT BENTROK! Jalankan dengan -Fix untuk auto-pindah:" -ForegroundColor Red
    Write-Host "   powershell -File scripts\check-ports.ps1 -Fix" -ForegroundColor Yellow
    Write-Host "  ============================================================" -ForegroundColor Red
}

Write-Host ""

# ─── Return results for BAT consumption ──────────────────────
# Set environment variables that AUDIRA_START.bat can read
if ($portOverrides.ContainsKey('API_PORT'))       { $env:AUDIRA_API_PORT       = $portOverrides['API_PORT'] }
if ($portOverrides.ContainsKey('WHATSAPP_PORT'))  { $env:AUDIRA_WHATSAPP_PORT  = $portOverrides['WHATSAPP_PORT'] }
if ($portOverrides.ContainsKey('TELEGRAM_PORT'))  { $env:AUDIRA_TELEGRAM_PORT  = $portOverrides['TELEGRAM_PORT'] }
if ($portOverrides.ContainsKey('DASHBOARD_PORT')) { $env:AUDIRA_DASHBOARD_PORT = $portOverrides['DASHBOARD_PORT'] }

# Exit code: 0 = all OK, 1 = conflicts found but fixed, 2 = conflicts not fixed
if ($allOk) { exit 0 }
elseif ($portOverrides.Count -gt 0) { exit 1 }
else { exit 2 }
