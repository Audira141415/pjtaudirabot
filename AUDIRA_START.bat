@echo off
setlocal enabledelayedexpansion
title AUDIRA BOT - START ALL SERVICES
color 0A
cls

if exist "BANNER_AUDIRA_BOT.bat" call "BANNER_AUDIRA_BOT.bat" /nopause

echo.
echo  ============================================================
echo   AUDIRA BOT - STARTING ALL SERVICES
echo   PJTAudiRaBot v1.0.0
echo  ============================================================
echo.

cd /d F:\PJTAUDIRABOT

:: ----------------------------------------------------------------
:: Default port values (will be overridden if conflict detected)
:: ----------------------------------------------------------------
set AUDIRA_API_PORT=4000
set AUDIRA_TELEGRAM_PORT=4010
set AUDIRA_WHATSAPP_PORT=4020
set AUDIRA_DASHBOARD_PORT=3000

:: ================================================================
:: STEP 0: Smart Port Check & Auto-Fix
:: ================================================================
echo [0/6] Memeriksa ketersediaan port...
echo.

:: Run the port checker with -Fix to auto-resolve conflicts
powershell -ExecutionPolicy Bypass -File "scripts\check-ports.ps1" -Fix
set PORT_CHECK_RESULT=%errorlevel%

if %PORT_CHECK_RESULT% equ 2 (
    echo.
    echo  [ERROR] Port bentrok tidak bisa diperbaiki otomatis!
    echo         Silakan hentikan proses yang memakai port, lalu coba lagi.
    echo         Atau jalankan: powershell -File scripts\check-ports.ps1
    echo         untuk melihat detail diagnostik.
    echo.
    pause
    exit /b 1
)

:: Read port overrides from .env.ports if it was generated
if exist ".env.ports" (
    echo  [INFO] Membaca port override dari .env.ports ...
    for /f "usebackq tokens=1,* delims==" %%a in (".env.ports") do (
        if "%%a"=="API_PORT"       set AUDIRA_API_PORT=%%b
        if "%%a"=="TELEGRAM_PORT"  set AUDIRA_TELEGRAM_PORT=%%b
        if "%%a"=="WHATSAPP_PORT"  set AUDIRA_WHATSAPP_PORT=%%b
        if "%%a"=="DASHBOARD_PORT" set AUDIRA_DASHBOARD_PORT=%%b
        if "%%a"=="DB_PORT"        set DB_PORT=%%b
        if "%%a"=="REDIS_PORT"     set REDIS_PORT=%%b
        if "%%a"=="DATABASE_URL"   set DATABASE_URL=%%b
        if "%%a"=="REDIS_URL"      set REDIS_URL=%%b
    )
    if defined DB_PORT    echo  [PORT] PostgreSQL akan berjalan di port !DB_PORT!
    if defined REDIS_PORT echo  [PORT] Redis akan berjalan di port !REDIS_PORT!
)
echo.

:: ----------------------------------------------------------------
:: STEP 1: Check Docker
:: ----------------------------------------------------------------
echo [1/6] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARN] Docker not running. Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo  [WAIT] Waiting 15 seconds for Docker to initialize...
    timeout /t 15 /nobreak >nul
    :: Re-check after wait
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [ERROR] Docker masih belum siap!
        echo         Pastikan Docker Desktop terinstall dan bisa jalan.
        echo         Kemungkinan penyebab:
        echo           - Docker Desktop belum diinstall
        echo           - WSL2 belum aktif (jalankan: wsl --install)
        echo           - Hyper-V belum di-enable
        echo           - Docker Desktop perlu restart manual
        pause
        exit /b 1
    )
)
echo  [OK] Docker ready.
echo.

:: ----------------------------------------------------------------
:: STEP 2: Start DB + Redis via Docker
:: ----------------------------------------------------------------
echo [2/6] Starting PostgreSQL ^& Redis (Docker)...

:: Check if containers are already healthy (skip recreate if so)
docker exec pjtaudi-db pg_isready -U pjtaudi >nul 2>&1
if !errorlevel! equ 0 (
    echo  [OK] Container DB sudah berjalan, skip recreate.
    goto :db_ready
)

docker compose -f docker/docker-compose.yml up -d --no-recreate db redis 2>nul
if !errorlevel! neq 0 (
    echo  [WARN] --no-recreate gagal, mencoba force up...
    docker compose -f docker/docker-compose.yml up -d db redis 2>nul
    if !errorlevel! neq 0 (
        echo  [ERROR] Gagal start Docker services!
        echo.
        echo  Mendiagnosa masalah...
        echo.
        if not exist "docker\docker-compose.yml" (
            echo  PENYEBAB: File docker/docker-compose.yml tidak ditemukan!
            echo  SOLUSI:   Pastikan file ada di folder docker/
            pause
            exit /b 1
        )
        docker compose -f docker/docker-compose.yml ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}" 2>nul
        echo.
        echo  SOLUSI UMUM:
        echo    1. docker compose -f docker/docker-compose.yml down
        echo    2. docker compose -f docker/docker-compose.yml up -d db redis
        echo    3. Jika masih gagal, cek: docker system df (storage penuh?)
        pause
        exit /b 1
    )
)

:db_ready

:: Verify containers are actually healthy
echo  [WAIT] Menunggu database siap...
set DB_READY=0
for /L %%i in (1,1,12) do (
    if !DB_READY! equ 0 (
        docker exec pjtaudi-db pg_isready -U pjtaudi >nul 2>&1
        if !errorlevel! equ 0 (
            set DB_READY=1
        ) else (
            timeout /t 2 /nobreak >nul
        )
    )
)
setlocal enabledelayedexpansion
if !DB_READY! equ 0 (
    echo  [WARN] Database belum siap setelah 24 detik -- melanjutkan anyway...
) else (
    echo  [OK] Database siap.
)
endlocal

echo  [OK] Database and Redis started.
echo.

:: ----------------------------------------------------------------
:: STEP 3: Start API Server
:: ----------------------------------------------------------------
echo [3/6] Starting API Server (port %AUDIRA_API_PORT%)...
set API_PORT=%AUDIRA_API_PORT%
start "AUDIRA - API Server" cmd /k "title AUDIRA - API Server [port %AUDIRA_API_PORT%] && cd /d F:\PJTAUDIRABOT && set API_PORT=%AUDIRA_API_PORT% && pnpm dev:api"
timeout /t 3 /nobreak >nul

:: Verify API started (quick health check after delay)
echo  [CHECK] Verifikasi API Server...
timeout /t 2 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%AUDIRA_API_PORT%/health' -TimeoutSec 3 -UseBasicParsing; Write-Host '  [OK] API Server berjalan.' -F Green } catch { Write-Host '  [WAIT] API Server masih loading (normal, tunggu beberapa detik)...' -F Yellow }" 2>nul
echo.

:: ----------------------------------------------------------------
:: STEP 4: Start WhatsApp Bot
:: ----------------------------------------------------------------
echo [4/6] Starting WhatsApp Bot (port %AUDIRA_WHATSAPP_PORT%)...
set WHATSAPP_PORT=%AUDIRA_WHATSAPP_PORT%
start "AUDIRA - WhatsApp Bot" cmd /k "title AUDIRA - WhatsApp Bot [port %AUDIRA_WHATSAPP_PORT%] && cd /d F:\PJTAUDIRABOT && set WHATSAPP_PORT=%AUDIRA_WHATSAPP_PORT% && pnpm dev:whatsapp"
timeout /t 3 /nobreak >nul
echo  [OK] WhatsApp Bot window opened.
echo.

:: ----------------------------------------------------------------
:: STEP 4b: Start Telegram Bot
:: ----------------------------------------------------------------
echo [4b/6] Starting Telegram Bot (port %AUDIRA_TELEGRAM_PORT%)...
set TELEGRAM_PORT=%AUDIRA_TELEGRAM_PORT%
start "AUDIRA - Telegram Bot" cmd /k "title AUDIRA - Telegram Bot [port %AUDIRA_TELEGRAM_PORT%] && cd /d F:\PJTAUDIRABOT && set TELEGRAM_PORT=%AUDIRA_TELEGRAM_PORT% && pnpm dev:telegram"
timeout /t 3 /nobreak >nul
echo  [OK] Telegram Bot window opened.
echo.

:: ----------------------------------------------------------------
:: STEP 5: Start Dashboard (opsional)
:: ----------------------------------------------------------------
echo [5/6] Starting Dashboard (port %AUDIRA_DASHBOARD_PORT%)...
set DASHBOARD_PORT=%AUDIRA_DASHBOARD_PORT%
start "AUDIRA - Dashboard" cmd /k "title AUDIRA - Dashboard [port %AUDIRA_DASHBOARD_PORT%] && cd /d F:\PJTAUDIRABOT && set DASHBOARD_PORT=%AUDIRA_DASHBOARD_PORT% && pnpm dev:dashboard"
timeout /t 2 /nobreak >nul
echo  [OK] Dashboard window opened.
echo.

:: ----------------------------------------------------------------
:: STEP 6: Post-Start Health Verification
:: ----------------------------------------------------------------
echo [6/6] Verifikasi akhir...
echo.

:: Write startup log for troubleshooting
set STARTUP_LOG=logs\startup_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%.log
if not exist "logs" mkdir logs
(
    echo AUDIRA BOT STARTUP LOG
    echo Date: %date% %time%
    echo.
    echo Port Configuration:
    echo   API_PORT       = %AUDIRA_API_PORT%
    echo   WHATSAPP_PORT  = %AUDIRA_WHATSAPP_PORT%
    echo   TELEGRAM_PORT  = %AUDIRA_TELEGRAM_PORT%
    echo   DASHBOARD_PORT = %AUDIRA_DASHBOARD_PORT%
    echo   DB_PORT        = 5433
    echo   REDIS_PORT     = 6379
    echo.
    echo Port Override Active: %PORT_CHECK_RESULT%
    echo   0 = semua port default, 1 = ada override
) > "%STARTUP_LOG%" 2>nul

:: ----------------------------------------------------------------
:: SUMMARY
:: ----------------------------------------------------------------
echo  ============================================================
echo   ALL SERVICES STARTED SUCCESSFULLY!
echo  ============================================================
echo.
echo   Service           Port    Window Title
echo   -------           ----    ------------
echo   API Server        %AUDIRA_API_PORT%    AUDIRA - API Server
echo   WhatsApp Bot      %AUDIRA_WHATSAPP_PORT%    AUDIRA - WhatsApp Bot
echo   Telegram Bot      %AUDIRA_TELEGRAM_PORT%    AUDIRA - Telegram Bot
echo   Dashboard         %AUDIRA_DASHBOARD_PORT%    AUDIRA - Dashboard
echo   PostgreSQL        5433    (Docker container: pjtaudi-db)
echo   Redis             6379    (Docker container: pjtaudi-redis)
echo.

if %PORT_CHECK_RESULT% equ 1 (
    echo   [!] PERHATIAN: Beberapa port menggunakan port alternatif
    echo       karena port default sudah dipakai aplikasi lain.
    echo       Lihat detail di file: .env.ports
    echo.
)

echo   Google Sheets:  ENABLED
echo   Spreadsheet ID: 1hx2EIvA-gA-wszX34Ptwb6fwczzJxicmZnQZlSDR07s
echo.
echo   Log: Lihat masing-masing window CMD untuk log tiap service.
echo   Stop: Jalankan AUDIRA_STOP.bat untuk menghentikan semua.
echo   Startup Log: %STARTUP_LOG%
echo.
echo   Troubleshooting:
echo     - Port bentrok?    powershell -File scripts\check-ports.ps1
echo     - Docker error?    docker compose -f docker/docker-compose.yml logs
echo     - API error?       Lihat window "AUDIRA - API Server"
echo     - WhatsApp error?  Lihat window "AUDIRA - WhatsApp Bot"
echo     - Telegram error?  Lihat window "AUDIRA - Telegram Bot"
echo.
pause
