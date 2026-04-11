@echo off
setlocal enabledelayedexpansion

set "REGISTRY_PREFIX=%~1"
if "%REGISTRY_PREFIX%"=="" goto :usage

set "TAG=%~2"
if "%TAG%"=="" set "TAG=latest"

set "MODE=%~3"
set "SERVER_HOST=%~4"
if "%SERVER_HOST%"=="" set "SERVER_HOST=audira@192.168.100.157"

set "ROOT=%~dp0.."
set "DOCKER_DIR=%ROOT%\docker"
set "RELEASE_ENV=%ROOT%\scripts\release-images.env"
if "%NPM_REGISTRY%"=="" set "NPM_REGISTRY=https://registry.npmmirror.com"

set "API_IMAGE=%REGISTRY_PREFIX%/pjtaudi-api:%TAG%"
set "WHATSAPP_IMAGE=%REGISTRY_PREFIX%/pjtaudi-whatsapp:%TAG%"
set "TELEGRAM_IMAGE=%REGISTRY_PREFIX%/pjtaudi-telegram:%TAG%"

where docker >nul 2>&1 || goto :docker_missing

call :step Build API image
call docker build --build-arg NPM_REGISTRY=%NPM_REGISTRY% -f "%DOCKER_DIR%\Dockerfile.api" -t "%API_IMAGE%" "%ROOT%"
if errorlevel 1 goto :failed

call :step Build WhatsApp image
call docker build --build-arg NPM_REGISTRY=%NPM_REGISTRY% -f "%DOCKER_DIR%\Dockerfile.whatsapp" -t "%WHATSAPP_IMAGE%" "%ROOT%"
if errorlevel 1 goto :failed

call :step Build Telegram image
call docker build --build-arg NPM_REGISTRY=%NPM_REGISTRY% -f "%DOCKER_DIR%\Dockerfile.telegram" -t "%TELEGRAM_IMAGE%" "%ROOT%"
if errorlevel 1 goto :failed

if /I "%MODE%"=="push" (
  call :step Push API image
  call docker push "%API_IMAGE%"
  if errorlevel 1 goto :failed

  call :step Push WhatsApp image
  call docker push "%WHATSAPP_IMAGE%"
  if errorlevel 1 goto :failed

  call :step Push Telegram image
  call docker push "%TELEGRAM_IMAGE%"
  if errorlevel 1 goto :failed
)

call :step Write release env
(
  echo API_IMAGE=%API_IMAGE%
  echo WHATSAPP_IMAGE=%WHATSAPP_IMAGE%
  echo TELEGRAM_IMAGE=%TELEGRAM_IMAGE%
) > "%RELEASE_ENV%"

call :step Upload release env to server
ssh %SERVER_HOST% "mkdir -p ~/.config/pjtaudi"
if errorlevel 1 goto :failed
scp "%RELEASE_ENV%" %SERVER_HOST%:/home/audira/.config/pjtaudi/release-images.env
if errorlevel 1 goto :failed


echo.
echo Done.
echo   API      : %API_IMAGE%
echo   WhatsApp : %WHATSAPP_IMAGE%
echo   Telegram : %TELEGRAM_IMAGE%
echo   Registry : %NPM_REGISTRY%
echo.
echo Next on server: /home/audira/pjtaudirabot/scripts/server-control.sh release-start
exit /b 0

:step
echo.
echo ==> %~1
exit /b 0

:usage
echo Usage: build-and-push-release.cmd ^<registry-prefix^> [tag] [push] [server-host]
echo Example: build-and-push-release.cmd ghcr.io^/your-org latest push audira@192.168.100.157
exit /b 1

:docker_missing
echo ERROR: docker not found in PATH
exit /b 1

:failed
echo ERROR: build/push flow failed
exit /b 1
