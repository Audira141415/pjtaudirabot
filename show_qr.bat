@echo off
chcp 65001 >nul
title AUDIRA - Scan WhatsApp QR Code
echo ========================================================
echo   MENAMPILKAN QR CODE WHATSAPP BOT DARI SERVER
echo ========================================================
echo.
echo Sedang mengambil QR Code dari kontainer pjtaudi-whatsapp...
echo.
ssh audira@192.168.100.157 "docker logs --tail 200 pjtaudi-whatsapp | grep -v 'Alert fired' | grep -v 'Task completed'"
echo.
echo Jika QR Code terpotong, perbesar layar terminal Anda.
echo Tekan tombol apa saja untuk keluar...
pause >nul
