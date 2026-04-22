@echo off
chcp 65001 >nul
echo ==========================================
echo   BOM 系統平台 — 啟動中...
echo   BOM System Platform — Starting...
echo ==========================================

cd /d "%~dp0server"

echo.
echo   前端 + 後端: http://localhost:3001
echo   (前端已內建在後端中)
echo.
echo   按 Ctrl+C 停止服務 / Press Ctrl+C to stop
echo ==========================================
echo.

node dist/index.js
