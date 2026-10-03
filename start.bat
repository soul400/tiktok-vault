@echo off
chcp 65001 > nul
title تشغيل منصة AEP TikTok Intelligence
echo ===================================================
echo 🚀 جاري تشغيل منصة AEP TikTok Intelligence
echo ===================================================

cd /d "%~dp0"

echo [1/2] تشغيل سيرفر الـ API على البورت 4000...
start "AEP API Server (Port 4000)" powershell -NoExit -Command "cd '%~dp0'; pnpm run dev:api"

timeout /t 3 /nobreak > nul

echo [2/2] تشغيل لوحة التحكم Dashboard على البورت 3000...
start "AEP Dashboard (Port 3000)" powershell -NoExit -Command "cd '%~dp0'; pnpm run dev:dashboard"

echo.
echo ===================================================
echo ✅ تم بدء تشغيل السيرفر ولوحة التحكم بنجاح!
echo 🌐 افتح المتصفح على: http://localhost:3000
echo ===================================================
timeout /t 5 > nul
start http://localhost:3000
