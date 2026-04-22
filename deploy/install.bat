@echo off
chcp 65001 >nul
echo ==========================================
echo   BOM 系統平台 — 安裝腳本
echo   BOM System Platform — Install Script
echo ==========================================
echo.

REM 檢查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 未安裝，請先安裝 Node.js v18+
    echo         https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] 安裝後端依賴 / Installing backend dependencies...
cd /d "%~dp0server"
call npm install --production
if %errorlevel% neq 0 (
    echo [ERROR] 後端依賴安裝失敗
    pause
    exit /b 1
)

echo [2/4] 產生 Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate 失敗
    pause
    exit /b 1
)

echo [3/4] 同步資料庫結構 / Syncing database schema...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [WARNING] 資料庫同步失敗，請確認 .env 中的 DATABASE_URL
)

echo [4/4] 初始化資料 / Seeding initial data...
call npx tsx src/seed.ts
if %errorlevel% neq 0 (
    echo [WARNING] Seed 執行失敗（可能已有資料）
)

echo.
echo ==========================================
echo   安裝完成！請執行 start.bat 啟動系統
echo   Install complete! Run start.bat to launch
echo ==========================================
pause
