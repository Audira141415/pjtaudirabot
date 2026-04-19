@echo off
chcp 65001 >nul
title AUDIRA - Save ^& Push to GitHub

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   AUDIRA - Save ^& Push to GitHub         ║
echo  ╚══════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: ─── Safety checks ───
echo  [1/6] Checking git repository...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Not a git repository! Run: git init
    pause
    exit /b 1
)

:: ─── Check remote ───
echo  [2/6] Checking remote...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] No remote 'origin' configured!
    echo  Run: git remote add origin https://github.com/YOUR/REPO.git
    pause
    exit /b 1
)

:: ─── Show status ───
echo  [3/6] Current changes:
echo  ─────────────────────────────────────
git status --short
echo  ─────────────────────────────────────
echo.

:: ─── Count changes ───
set count=0
for /f %%a in ('git status --short ^| find /c /v ""') do set count=%%a

if "%count%"=="0" (
    echo  [INFO] No changes to commit. Everything is up to date!
    echo.
    pause
    exit /b 0
)

echo  Total: %count% file(s) changed
echo.

:: ─── Security: check for secrets ───
echo  [4/6] Security check — scanning for secrets...
set HAS_SECRET=0

:: Check if .env is staged
git diff --cached --name-only 2>nul | findstr /i "\.env" >nul 2>&1
if not errorlevel 1 (
    echo  [BLOCKED] .env file detected in staging!
    set HAS_SECRET=1
)

:: Check for credential files
git diff --cached --name-only 2>nul | findstr /i "credentials\|serviceaccount\|\.pem\|\.key" >nul 2>&1
if not errorlevel 1 (
    echo  [BLOCKED] Credential file detected in staging!
    set HAS_SECRET=1
)

:: Also check untracked/modified for .env
git status --short 2>nul | findstr /i "\.env" >nul 2>&1
if not errorlevel 1 (
    echo  [OK] .env found but should be in .gitignore (verify!)
)

:: ─── Commit message ───
echo.
echo  [5/6] Commit message:
echo  ─────────────────────────────────────
echo   Leave empty for auto-generated message.
echo   Format: type: description
echo   Types: feat, fix, refactor, docs, chore, perf, test
echo  ─────────────────────────────────────
echo.
set /p "COMMIT_MSG=  Message: "

:: Auto-generate if empty
if "%COMMIT_MSG%"=="" (
    for /f "tokens=1,2,3 delims=/ " %%a in ("%date%") do set TODAY=%%c-%%a-%%b
    set "COMMIT_MSG=chore: auto-save %count% files on %date% %time:~0,5%"
)

echo.
echo  ─────────────────────────────────────
echo   Remote:  origin
for /f "delims=" %%r in ('git remote get-url origin') do echo   URL:     %%r
for /f "delims=" %%b in ('git branch --show-current') do echo   Branch:  %%b
echo   Message: %COMMIT_MSG%
echo   Files:   %count% changed
echo  ─────────────────────────────────────
echo.

set /p "CONFIRM=  Proceed? (Y/n): "
if /i "%CONFIRM%"=="n" (
    echo  [CANCELLED] No changes pushed.
    pause
    exit /b 0
)

:: ─── Stage, Commit, Push ───
echo.
echo  [6/6] Pushing to GitHub...
echo.

echo  → git add -A
git add -A 2>nul

echo  → checking staged file sizes
set HAS_BIG_FILE=0
git diff --cached --name-only > bigfiles_list.tmp
powershell -NoProfile -Command "Get-Content bigfiles_list.tmp | ForEach-Object { if (Test-Path $_) { if ((Get-Item $_).Length -gt 95MB) { $_ } } }" > bigfiles_check.tmp
for /f "usebackq delims=" %%f in ("bigfiles_check.tmp") do (
    echo  [BLOCKED] Large staged file: %%f
    set HAS_BIG_FILE=1
)
if exist bigfiles_list.tmp del bigfiles_list.tmp
if exist bigfiles_check.tmp del bigfiles_check.tmp

if "%HAS_BIG_FILE%"=="1" (
    echo.
    echo  [ERROR] Push will be rejected by GitHub file-size limit.
    pause
    exit /b 1
)

echo  → git commit
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo  [ERROR] git commit failed!
    pause
    exit /b 1
)

echo  → git push
for /f "delims=" %%b in ('git branch --show-current') do set BRANCH=%%b

echo  → git pull --rebase origin %BRANCH%
git pull --rebase origin %BRANCH%

git push -u origin %BRANCH%
if errorlevel 1 (
    echo.
    echo  [ERROR] Push failed! Possible causes:
    echo    - No internet connection
    echo    - Authentication required (run: gh auth login)
    echo    - Still has conflicts after pull (resolve manually)
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║  ✅ Successfully pushed to GitHub!        ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Latest commit:
git log --oneline -1
echo.

pause
