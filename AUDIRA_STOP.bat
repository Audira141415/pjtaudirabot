@echo off
title AUDIRA BOT - STOP ALL SERVICES
color 0C
cls

if exist "BANNER_AUDIRA_BOT.bat" call "BANNER_AUDIRA_BOT.bat" /nopause

echo.
echo  ============================================================
echo   AUDIRA BOT - STOPPING ALL SERVICES
echo   PJTAudiRaBot v1.0.0
echo  ============================================================
echo.

cd /d F:\PJTAUDIRABOT

:: ----------------------------------------------------------------
:: STEP 1: Kill processes on service ports (including overrides)
:: ----------------------------------------------------------------
echo [1/4] Stopping Node.js services...
echo.

:: Read override ports if .env.ports exists
set STOP_API_PORT=4000
set STOP_WHATSAPP_PORT=4020
set STOP_TELEGRAM_PORT=4010
set STOP_DASHBOARD_PORT=3000

if exist ".env.ports" (
    echo  [INFO] Membaca port override dari .env.ports ...
    for /f "usebackq tokens=1,2 delims==" %%a in (".env.ports") do (
        if "%%a"=="API_PORT"       set STOP_API_PORT=%%b
        if "%%a"=="TELEGRAM_PORT"  set STOP_TELEGRAM_PORT=%%b
        if "%%a"=="WHATSAPP_PORT"  set STOP_WHATSAPP_PORT=%%b
        if "%%a"=="DASHBOARD_PORT" set STOP_DASHBOARD_PORT=%%b
    )
)

echo  Stopping API Server (port %STOP_API_PORT%)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%STOP_API_PORT% " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
:: Also kill default port if different
if not "%STOP_API_PORT%"=="4000" (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000 " 2^>nul') do (
        taskkill /PID %%a /F >nul 2>&1
    )
)

echo  Stopping WhatsApp Bot (port %STOP_WHATSAPP_PORT%)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%STOP_WHATSAPP_PORT% " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
if not "%STOP_WHATSAPP_PORT%"=="4020" (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4020 " 2^>nul') do (
        taskkill /PID %%a /F >nul 2>&1
    )
)

echo  Stopping Telegram Bot (port %STOP_TELEGRAM_PORT%)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%STOP_TELEGRAM_PORT% " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
if not "%STOP_TELEGRAM_PORT%"=="4010" (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4010 " 2^>nul') do (
        taskkill /PID %%a /F >nul 2>&1
    )
)

echo  Stopping Dashboard (port %STOP_DASHBOARD_PORT%)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%STOP_DASHBOARD_PORT% " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
if not "%STOP_DASHBOARD_PORT%"=="3000" (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do (
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: Extra: kill any lingering tsx/node processes from this project
echo  Cleaning up lingering tsx/node processes...
taskkill /FI "WINDOWTITLE eq AUDIRA - API Server*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AUDIRA - WhatsApp Bot*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AUDIRA - Dashboard*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AUDIRA - Telegram Bot*" /F >nul 2>&1

echo  [OK] Node.js services stopped.
echo.

:: ----------------------------------------------------------------
:: STEP 2: Stop Docker containers
:: ----------------------------------------------------------------
echo [2/4] Stopping Docker containers (db + redis)...
docker compose -f docker/docker-compose.yml stop db redis
if %errorlevel% neq 0 (
    echo  [WARN] Docker stop returned an error (might already be stopped).
) else (
    echo  [OK] Docker containers stopped.
)
echo.

:: ----------------------------------------------------------------
:: STEP 3: Clean temp/lock files
:: ----------------------------------------------------------------
echo [3/4] Cleaning temporary files...
if exist "packages\bots\whatsapp\baileys_store.json" (
    del /f /q "packages\bots\whatsapp\baileys_store.json" >nul 2>&1
    echo  [OK] Baileys store cache cleaned.
)
echo  [OK] Cleanup done.
echo.

:: ----------------------------------------------------------------
:: STEP 4: Clean port override file
:: ----------------------------------------------------------------
echo [4/4] Cleaning port overrides...
if exist ".env.ports" (
    del /f /q ".env.ports" >nul 2>&1
    echo  [OK] Port override (.env.ports) dihapus.
) else (
    echo  [OK] Tidak ada port override aktif.
)
echo  [OK] Cleanup selesai.
echo.

:: ----------------------------------------------------------------
:: SUMMARY
:: ----------------------------------------------------------------
echo  ============================================================
echo   ALL SERVICES STOPPED SUCCESSFULLY!
echo  ============================================================
echo.
echo   Untuk menjalankan ulang: AUDIRA_START.bat
echo.
pause
