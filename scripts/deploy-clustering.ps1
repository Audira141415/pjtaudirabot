#!/usr/bin/env pwsh
# Smart Clustering Deployment Script
# Applies migration, rebuilds images, and validates deployment

param(
  [switch]$SkipMigration,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Smart Ticket Clustering - Deployment Script   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $PSScriptRoot
$rootDir   = $scriptDir
$dbDir     = Join-Path $rootDir "packages/database"

# ─── Step 1: Apply Database Migration ──────────────────────────

if (-not $SkipMigration) {
  Write-Host "[STEP 1] Applying database migration..." -ForegroundColor Yellow

  Push-Location $dbDir

  if ($DryRun) {
    Write-Host "  [DRY RUN] Would run: npx prisma migrate deploy" -ForegroundColor Gray
  } else {
    try {
      Write-Host "  Generating Prisma client..." -ForegroundColor Gray
      pnpm prisma generate

      Write-Host "  Applying migration..." -ForegroundColor Gray
      pnpm prisma migrate deploy

      Write-Host "  [✓] Migration applied successfully" -ForegroundColor Green
    } catch {
      Write-Host "  [!] Migration failed. Check error above." -ForegroundColor Red
      Write-Host "  Try manual SQL: psql -d <DATABASE_URL> -f migrations/ticket_clustering/migration.sql" -ForegroundColor Yellow
      Pop-Location
      exit 1
    }
  }

  Pop-Location
} else {
  Write-Host "[STEP 1] Skipping migration (--SkipMigration flag set)" -ForegroundColor Gray
}

# ─── Step 2: Rebuild Docker Images ──────────────────────────────

Write-Host ""
Write-Host "[STEP 2] Rebuilding Docker images with clustering code..." -ForegroundColor Yellow

if ($DryRun) {
  Write-Host "  [DRY RUN] Would run: docker compose build --no-cache" -ForegroundColor Gray
} else {
  Push-Location (Join-Path $rootDir "docker")

  $envFile = Join-Path $rootDir ".env.production"
  $secretsFile = "$HOME\.config\pjtaudi\secrets.env"

  $composeArgs = @("compose", "-f", "docker-compose.prod.yml")
  if (Test-Path $envFile)    { $composeArgs += @("--env-file", $envFile) }
  if (Test-Path $secretsFile){ $composeArgs += @("--env-file", $secretsFile) }

  try {
    Write-Host "  Building bot-whatsapp image..." -ForegroundColor Gray
    & docker @composeArgs build --no-cache --quiet bot-whatsapp

    Write-Host "  Building bot-telegram image..." -ForegroundColor Gray
    & docker @composeArgs build --no-cache --quiet bot-telegram

    Write-Host "  Building api image..." -ForegroundColor Gray
    & docker @composeArgs build --no-cache --quiet api

    Write-Host "  [✓] Docker images built" -ForegroundColor Green
  } catch {
    Write-Host "  [!] Docker build failed." -ForegroundColor Red
    Pop-Location
    exit 1
  }

  Pop-Location
}

# ─── Step 3: Deploy Containers ──────────────────────────────────

Write-Host ""
Write-Host "[STEP 3] Deploying updated containers..." -ForegroundColor Yellow

if ($DryRun) {
  Write-Host "  [DRY RUN] Would run: docker compose up -d" -ForegroundColor Gray
} else {
  Push-Location (Join-Path $rootDir "docker")

  $envFile = Join-Path $rootDir ".env.production"
  $secretsFile = "$HOME\.config\pjtaudi\secrets.env"

  $composeArgs = @("compose", "-f", "docker-compose.prod.yml")
  if (Test-Path $envFile)    { $composeArgs += @("--env-file", $envFile) }
  if (Test-Path $secretsFile){ $composeArgs += @("--env-file", $secretsFile) }

  try {
    & docker @composeArgs up -d --remove-orphans

    Write-Host "  [✓] Containers deployed" -ForegroundColor Green
  } catch {
    Write-Host "  [!] Container deployment failed." -ForegroundColor Red
    Pop-Location
    exit 1
  }

  Pop-Location
}

# ─── Step 4: Health Gate ────────────────────────────────────────

Write-Host ""
Write-Host "[STEP 4] Waiting for health gate (30 seconds)..." -ForegroundColor Yellow

if ($DryRun) {
  Write-Host "  [DRY RUN] Would wait 30s then check health" -ForegroundColor Gray
} else {
  Start-Sleep -Seconds 30

  $apiUrl = $env:API_URL ?? "http://localhost:4000"
  try {
    $health = Invoke-RestMethod -Uri "$apiUrl/health" -Method GET -TimeoutSec 5
    if ($health.status -eq "healthy") {
      Write-Host "  [✓] Health gate PASSED - API is healthy" -ForegroundColor Green
    } else {
      Write-Host "  [!] Health gate FAILED - status: $($health.status)" -ForegroundColor Red
    }
  } catch {
    Write-Host "  [!] Cannot reach API health endpoint: $apiUrl/health" -ForegroundColor Red
    Write-Host "  Check manually: curl $apiUrl/health" -ForegroundColor Yellow
  }
}

# ─── Step 5: Verify Clustering Routes ──────────────────────────

Write-Host ""
Write-Host "[STEP 5] Verifying clustering API routes..." -ForegroundColor Yellow

if ($DryRun) {
  Write-Host "  [DRY RUN] Would check GET /api/tickets/open/clusters" -ForegroundColor Gray
} else {
  $apiUrl = $env:API_URL ?? "http://localhost:4000"
  try {
    $clusters = Invoke-RestMethod -Uri "$apiUrl/api/tickets/open/clusters" -Method GET -TimeoutSec 5
    Write-Host "  [✓] Clustering API is responding" -ForegroundColor Green
    Write-Host "  Active clusters: $($clusters.totalClusters)" -ForegroundColor Gray
  } catch {
    Write-Host "  [!] Clustering API not responding: $apiUrl/api/tickets/open/clusters" -ForegroundColor Red
    Write-Host "  Try: curl $apiUrl/api/tickets/open/clusters" -ForegroundColor Yellow
  }
}

# ─── Summary ───────────────────────────────────────────────────

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Clustering API Endpoints:" -ForegroundColor White
Write-Host "  GET  /api/tickets/open/clusters" -ForegroundColor Gray
Write-Host "  GET  /api/tickets/cluster/:id" -ForegroundColor Gray
Write-Host "  GET  /api/tickets/cluster/:id/members" -ForegroundColor Gray
Write-Host "  POST /api/tickets/cluster/:id/resolve" -ForegroundColor Gray
Write-Host "  GET  /api/tickets/:ticketId/cluster" -ForegroundColor Gray
Write-Host "  GET  /api/tickets/cluster/stats/daily" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "  1. Create 2 similar tickets to test clustering detection" -ForegroundColor Gray
Write-Host "  2. Verify Telegram notification in NOC group" -ForegroundColor Gray
Write-Host "  3. Test cascade resolution (resolve master -> check members)" -ForegroundColor Gray
Write-Host ""
Write-Host "See docs/CLUSTERING_DEPLOYMENT.md for full details" -ForegroundColor Yellow
