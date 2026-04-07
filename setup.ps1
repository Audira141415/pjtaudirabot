#!/usr/bin/env pwsh
# ╔═══════════════════════════════════════════════════════════════╗
# ║  AudiraBot — Setup & Run Script (Windows PowerShell)         ║
# ╚═══════════════════════════════════════════════════════════════╝

param(
    [Parameter(Position=0)]
    [ValidateSet("setup", "dev", "dev:api", "dev:whatsapp", "dev:telegram", "dev:all", "dev:dashboard", "build", "db:init", "db:migrate", "db:studio", "docker:up", "docker:down", "status", "help")]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"

# ─── Colors ───────────────────────────────────────────────────
function Write-Step($msg) { Write-Host "  ▶ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "  $msg" -ForegroundColor DarkGray }

function Show-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║   🤖 AudiraBot Setup & Runner         ║" -ForegroundColor Cyan
    Write-Host "  ║   Multi-Platform Bot System            ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# ─── Prerequisite Checks ─────────────────────────────────────
function Test-Prerequisites {
    Write-Step "Checking prerequisites..."

    # Node.js
    $nodeV = & node --version 2>$null
    if (-not $nodeV) { Write-Err "Node.js not found. Install from https://nodejs.org (v20+)"; exit 1 }
    Write-Ok "Node.js $nodeV"

    # pnpm
    $pnpmV = & pnpm --version 2>$null
    if (-not $pnpmV) {
        Write-Warn "pnpm not found — installing..."
        npm install -g pnpm
        $pnpmV = & pnpm --version
    }
    Write-Ok "pnpm v$pnpmV"

    # Docker (optional)
    $dockerV = & docker --version 2>$null
    if ($dockerV) { Write-Ok "Docker found" } else { Write-Warn "Docker not found (optional — needed for docker:up)" }
}

# ─── Setup Command ────────────────────────────────────────────
function Invoke-Setup {
    Show-Banner
    Write-Host "  Step 1/5 — Prerequisites" -ForegroundColor White
    Test-Prerequisites

    Write-Host ""
    Write-Host "  Step 2/5 — Environment File" -ForegroundColor White
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Ok "Created .env from .env.example"
        Write-Warn "EDIT .env NOW — set these required values:"
        Write-Host "    DATABASE_URL       → Your PostgreSQL connection string" -ForegroundColor Yellow
        Write-Host "    REDIS_URL          → Your Redis connection string" -ForegroundColor Yellow
        Write-Host "    JWT_SECRET         → Random 32+ char secret" -ForegroundColor Yellow
        Write-Host "    TELEGRAM_BOT_TOKEN → From @BotFather on Telegram" -ForegroundColor Yellow
        Write-Host "    OPENAI_API_KEY     → From platform.openai.com (optional)" -ForegroundColor Yellow
    } else {
        Write-Ok ".env already exists"
    }

    Write-Host ""
    Write-Host "  Step 3/5 — Install Dependencies" -ForegroundColor White
    Write-Step "Running pnpm install..."
    pnpm install
    Write-Ok "Dependencies installed"

    Write-Host ""
    Write-Host "  Step 4/5 — Generate Prisma Client" -ForegroundColor White
    Write-Step "Running prisma generate..."
    Push-Location packages/database
    npx prisma generate
    Pop-Location
    Write-Ok "Prisma client generated"

    Write-Host ""
    Write-Host "  Step 5/5 — Build All Packages" -ForegroundColor White
    Write-Step "Building TypeScript..."
    $buildOrder = @("core", "config", "database", "services", "api", "cli")
    $botPkgs = @("bots/whatsapp", "bots/telegram")
    foreach ($pkg in ($buildOrder + $botPkgs)) {
        $tsconfig = "packages/$pkg/tsconfig.json"
        if (Test-Path $tsconfig) {
            npx tsc -p $tsconfig 2>$null
            if ($LASTEXITCODE -eq 0) { Write-Ok "Built $pkg" }
            else { Write-Err "Failed to build $pkg" }
        }
    }

    Write-Host ""
    Write-Host "  ══════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✓ Setup complete!" -ForegroundColor Green
    Write-Host "  ══════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    1. Edit .env with your real credentials" -ForegroundColor Yellow
    Write-Host "    2. Start PostgreSQL + Redis (or run: .\setup.ps1 docker:up)" -ForegroundColor Yellow
    Write-Host "    3. Run database migration:  .\setup.ps1 db:init" -ForegroundColor Yellow
    Write-Host "    4. Start development:       .\setup.ps1 dev:all" -ForegroundColor Yellow
    Write-Host ""
    Show-PortMap
}

# ─── Port Map Display ─────────────────────────────────────────
function Show-PortMap {
    # Read from .env or defaults
    $ports = @{
        "API Server"    = if ($env:API_PORT) { $env:API_PORT } else { "4000" }
        "Telegram Bot"  = if ($env:TELEGRAM_PORT) { $env:TELEGRAM_PORT } else { "4010" }
        "WhatsApp Bot"  = if ($env:WHATSAPP_PORT) { $env:WHATSAPP_PORT } else { "4020" }
        "Dashboard"     = if ($env:DASHBOARD_PORT) { $env:DASHBOARD_PORT } else { "3000" }
        "Dynamic Range" = "$(if ($env:BOT_PORT_RANGE_START) { $env:BOT_PORT_RANGE_START } else { '4100' })-$(if ($env:BOT_PORT_RANGE_END) { $env:BOT_PORT_RANGE_END } else { '4199' })"
    }

    Write-Host "  Port Allocations:" -ForegroundColor White
    foreach ($svc in $ports.Keys | Sort-Object) {
        Write-Host "    $($svc.PadRight(16)) → :$($ports[$svc])" -ForegroundColor Cyan
    }
    Write-Host ""
}

# ─── Database Commands ────────────────────────────────────────
function Invoke-DbInit {
    Write-Step "Initializing database (first migration)..."
    Push-Location packages/database
    npx prisma migrate dev --name init
    Pop-Location
    Write-Ok "Database initialized with initial migration"
}

function Invoke-DbMigrate {
    Write-Step "Running database migrations..."
    Push-Location packages/database
    npx prisma migrate deploy
    Pop-Location
    Write-Ok "Migrations applied"
}

function Invoke-DbStudio {
    Write-Step "Opening Prisma Studio..."
    Push-Location packages/database
    npx prisma studio
    Pop-Location
}

# ─── Dev Commands ─────────────────────────────────────────────
function Invoke-DevApi {
    Show-Banner
    Write-Step "Starting API server on :$(if ($env:API_PORT) { $env:API_PORT } else { '4000' })..."
    pnpm -C packages/api dev
}

function Invoke-DevWhatsApp {
    Show-Banner
    Write-Step "Starting WhatsApp bot (health on :$(if ($env:WHATSAPP_PORT) { $env:WHATSAPP_PORT } else { '4020' }))..."
    pnpm -C packages/bots/whatsapp dev
}

function Invoke-DevTelegram {
    Show-Banner
    Write-Step "Starting Telegram bot (health on :$(if ($env:TELEGRAM_PORT) { $env:TELEGRAM_PORT } else { '4010' }))..."
    pnpm -C packages/bots/telegram dev
}

function Invoke-DevDashboard {
    Show-Banner
    Write-Step "Starting Dashboard on :$(if ($env:DASHBOARD_PORT) { $env:DASHBOARD_PORT } else { '3000' })..."
    pnpm -C packages/dashboard dev
}

function Invoke-DevAll {
    Show-Banner
    Show-PortMap

    Write-Host "  Starting all services..." -ForegroundColor White
    Write-Host "  Press Ctrl+C to stop all" -ForegroundColor DarkGray
    Write-Host ""

    # Start each service in a new PowerShell window
    $root = Get-Location

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; pnpm -C packages/api dev" -WindowStyle Normal
    Write-Ok "API server started in new window"

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; pnpm -C packages/bots/telegram dev" -WindowStyle Normal
    Write-Ok "Telegram bot started in new window"

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; pnpm -C packages/bots/whatsapp dev" -WindowStyle Normal
    Write-Ok "WhatsApp bot started in new window"

    Write-Host ""
    Write-Ok "All services started in separate windows"
    Write-Host "  Close each window to stop its service" -ForegroundColor DarkGray
    Write-Host ""
}

# ─── Build Command ────────────────────────────────────────────
function Invoke-Build {
    Show-Banner
    Write-Step "Building all packages..."
    pnpm run build
    Write-Ok "Build complete"
}

# ─── Docker Commands ──────────────────────────────────────────
function Invoke-DockerUp {
    Write-Step "Starting PostgreSQL + Redis via Docker..."
    docker compose -f docker/docker-compose.yml up -d db redis
    Write-Ok "Database and Redis containers running"
    Write-Info "PostgreSQL → localhost:5432"
    Write-Info "Redis      → localhost:6379"
}

function Invoke-DockerDown {
    Write-Step "Stopping Docker containers..."
    docker compose -f docker/docker-compose.yml down
    Write-Ok "Containers stopped"
}

# ─── Status Command ───────────────────────────────────────────
function Invoke-Status {
    Show-Banner
    Show-PortMap

    Write-Host "  Service Health Checks:" -ForegroundColor White

    $checks = @(
        @{ Name="PostgreSQL"; Test={ & psql --version 2>$null; Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet } },
        @{ Name="Redis"; Test={ Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -InformationLevel Quiet } },
        @{ Name="API Server"; Test={ Test-NetConnection -ComputerName localhost -Port $(if ($env:API_PORT) { $env:API_PORT } else { 4000 }) -WarningAction SilentlyContinue -InformationLevel Quiet } },
        @{ Name="Telegram Bot"; Test={ Test-NetConnection -ComputerName localhost -Port $(if ($env:TELEGRAM_PORT) { $env:TELEGRAM_PORT } else { 4010 }) -WarningAction SilentlyContinue -InformationLevel Quiet } },
        @{ Name="WhatsApp Bot"; Test={ Test-NetConnection -ComputerName localhost -Port $(if ($env:WHATSAPP_PORT) { $env:WHATSAPP_PORT } else { 4020 }) -WarningAction SilentlyContinue -InformationLevel Quiet } }
    )

    foreach ($check in $checks) {
        try {
            $result = & $check.Test
            if ($result) { Write-Ok "$($check.Name)" }
            else { Write-Err "$($check.Name) — not reachable" }
        } catch {
            Write-Err "$($check.Name) — not reachable"
        }
    }
    Write-Host ""
}

# ─── Help ─────────────────────────────────────────────────────
function Show-Help {
    Show-Banner
    Write-Host "  Usage: .\setup.ps1 <command>" -ForegroundColor White
    Write-Host ""
    Write-Host "  Setup:" -ForegroundColor Yellow
    Write-Host "    setup          Full first-time setup (install, generate, build)"
    Write-Host "    build          Build all TypeScript packages"
    Write-Host ""
    Write-Host "  Database:" -ForegroundColor Yellow
    Write-Host "    db:init        Create first migration & apply"
    Write-Host "    db:migrate     Apply pending migrations"
    Write-Host "    db:studio      Open Prisma Studio GUI"
    Write-Host ""
    Write-Host "  Development:" -ForegroundColor Yellow
    Write-Host "    dev:api        Start API server only          (:4000)"
    Write-Host "    dev:telegram   Start Telegram bot only        (:4010)"
    Write-Host "    dev:whatsapp   Start WhatsApp bot only        (:4020)"
    Write-Host "    dev:dashboard  Start Dashboard dev server     (:3000)"
    Write-Host "    dev:all        Start ALL services (new windows)"
    Write-Host ""
    Write-Host "  Docker:" -ForegroundColor Yellow
    Write-Host "    docker:up      Start PostgreSQL + Redis containers"
    Write-Host "    docker:down    Stop all Docker containers"
    Write-Host ""
    Write-Host "  Info:" -ForegroundColor Yellow
    Write-Host "    status         Check service health & ports"
    Write-Host "    help           Show this help"
    Write-Host ""
    Write-Host "  Quick Start:" -ForegroundColor Green
    Write-Host "    1. .\setup.ps1 setup" -ForegroundColor White
    Write-Host "    2. Edit .env (set DATABASE_URL, REDIS_URL, JWT_SECRET, TELEGRAM_BOT_TOKEN)" -ForegroundColor White
    Write-Host "    3. .\setup.ps1 docker:up       # Start DB + Redis" -ForegroundColor White
    Write-Host "    4. .\setup.ps1 db:init          # Create tables" -ForegroundColor White
    Write-Host "    5. .\setup.ps1 dev:all          # Run everything!" -ForegroundColor White
    Write-Host ""
}

# ─── Router ───────────────────────────────────────────────────
switch ($Command) {
    "setup"         { Invoke-Setup }
    "dev"           { Invoke-DevAll }
    "dev:api"       { Invoke-DevApi }
    "dev:whatsapp"  { Invoke-DevWhatsApp }
    "dev:telegram"  { Invoke-DevTelegram }
    "dev:dashboard" { Invoke-DevDashboard }
    "dev:all"       { Invoke-DevAll }
    "build"         { Invoke-Build }
    "db:init"       { Invoke-DbInit }
    "db:migrate"    { Invoke-DbMigrate }
    "db:studio"     { Invoke-DbStudio }
    "docker:up"     { Invoke-DockerUp }
    "docker:down"   { Invoke-DockerDown }
    "status"        { Invoke-Status }
    "help"          { Show-Help }
    default         { Show-Help }
}
