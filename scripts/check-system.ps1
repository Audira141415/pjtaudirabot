param(
    [switch]$Detailed
)

Write-Host "`n=== AUDIRA BOT SYSTEM DIAGNOSTICS ===" -ForegroundColor Cyan
Write-Host "Checking local services and remote connectivity...`n"

$services = @(
    @{ Name = "Dashboard (Local)"; Port = 3001; Type = "Web UI" },
    @{ Name = "API Server (Local)"; Port = 4000; Type = "Backend" },
    @{ Name = "API Server (Remote)"; Port = 4000; Type = "Backend"; Host = "192.168.100.157" }
)

foreach ($service in $services) {
    $hostAddr = if ($service.Host) { $service.Host } else { "localhost" }
    $conn = Test-NetConnection -ComputerName $hostAddr -Port $service.Port -WarningAction SilentlyContinue
    
    if ($conn.TcpTestSucceeded) {
        Write-Host "[OK] $($service.Name) is active on port $($service.Port)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($service.Name) is UNREACHABLE on port $($service.Port)" -ForegroundColor Red
        if ($service.Name -eq "API Server (Local)") {
            Write-Host "     -> Hint: Run 'pnpm dev:api' or check your .env DATABASE_URL" -ForegroundColor Gray
        }
    }
}

Write-Host "`n=== DOCKER INFRASTRUCTURE STATUS ===" -ForegroundColor Cyan
try {
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
} catch {
    Write-Host "Docker is not running or not found in PATH." -ForegroundColor Yellow
}

Write-Host "`n=== API HEALTH ENDPOINT CHECK ===" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method Get -ErrorAction SilentlyContinue
    if ($health) {
        $health | ConvertTo-Json
    } else {
        Write-Host "API Health endpoint returned no data." -ForegroundColor Red
    }
} catch {
    Write-Host "Could not reach API Health endpoint." -ForegroundColor Red
}

Write-Host "`n======================================" -ForegroundColor Cyan
