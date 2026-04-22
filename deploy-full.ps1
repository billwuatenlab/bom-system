# ==========================================
# BOM System — Full Deployment Script
# Target: Windows Server with MSSQL
# ==========================================
# Usage: powershell -ExecutionPolicy Bypass -File deploy-full.ps1
# Prerequisites: Node.js v18+, Git, MSSQL instance, BOM database created
# ==========================================

param(
    [string]$RepoUrl = "https://github.com/billwuatenlab/bom-system.git",
    [string]$InstallDir = "C:\BOM",
    [string]$DbInstance = "localhost\ATENLABDBSERVER",
    [string]$DbName = "BOM",
    [string]$DbUser = "BomAdmin",
    [string]$DbPassword = "BomSystem@2026",
    [int]$Port = 3001
)

$ErrorActionPreference = "Continue"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  BOM System — Full Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------
# Step 1: Check prerequisites
# ------------------------------------------
Write-Host "[Step 1/9] Checking prerequisites..." -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "[FAIL] Node.js not installed. Please install Node.js v18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

$gitVersion = git --version 2>$null
if (-not $gitVersion) {
    Write-Host "[FAIL] Git not installed. Please install Git from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}
Write-Host "  Git: $gitVersion" -ForegroundColor Green

# ------------------------------------------
# Step 2: Clone or update repository
# ------------------------------------------
Write-Host "[Step 2/9] Setting up repository..." -ForegroundColor Yellow

if (Test-Path "$InstallDir\.git") {
    Set-Location $InstallDir
    git pull
    Write-Host "  Repository updated" -ForegroundColor Green
} else {
    git clone $RepoUrl $InstallDir
    Set-Location $InstallDir
    Write-Host "  Repository cloned to $InstallDir" -ForegroundColor Green
}

# ------------------------------------------
# Step 3: Create .env
# ------------------------------------------
Write-Host "[Step 3/9] Creating .env configuration..." -ForegroundColor Yellow

$envContent = @(
    "DATABASE_URL=""sqlserver://$DbInstance;database=$DbName;user=$DbUser;password=$DbPassword;encrypt=true;trustServerCertificate=true""",
    "JWT_SECRET=""bom-system-secret-key-production""",
    "PORT=$Port",
    "NODE_ENV=production"
)
$envContent | Out-File -FilePath "$InstallDir\server\.env" -Encoding ascii
Write-Host "  .env created" -ForegroundColor Green

# ------------------------------------------
# Step 4: Install backend dependencies
# ------------------------------------------
Write-Host "[Step 4/9] Installing backend dependencies..." -ForegroundColor Yellow

Set-Location "$InstallDir\server"
npm install 2>&1 | Out-Null
Write-Host "  Backend dependencies installed" -ForegroundColor Green

# ------------------------------------------
# Step 5: Generate Prisma client + push schema
# ------------------------------------------
Write-Host "[Step 5/9] Setting up database..." -ForegroundColor Yellow

npx prisma generate 2>&1 | Out-Null
Write-Host "  Prisma client generated" -ForegroundColor Green

npx prisma db push 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Database schema synced" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Database schema sync failed - check credentials" -ForegroundColor Red
    exit 1
}

# ------------------------------------------
# Step 6: Seed initial data
# ------------------------------------------
Write-Host "[Step 6/9] Seeding initial data..." -ForegroundColor Yellow

npx tsx src/seed.ts 2>&1
Write-Host "  Seed completed (admin@bom.local / admin123)" -ForegroundColor Green

# ------------------------------------------
# Step 7: Build backend + frontend
# ------------------------------------------
Write-Host "[Step 7/9] Building application..." -ForegroundColor Yellow

npm run build 2>&1 | Out-Null
Write-Host "  Backend built" -ForegroundColor Green

Set-Location "$InstallDir\client"
npm install 2>&1 | Out-Null
npm run build 2>&1 | Out-Null
Write-Host "  Frontend built" -ForegroundColor Green

# ------------------------------------------
# Step 8: Configure Windows Firewall
# ------------------------------------------
Write-Host "[Step 8/9] Configuring firewall..." -ForegroundColor Yellow

$rule = netsh advfirewall firewall show rule name="BOM" 2>$null
if ($rule -match "BOM") {
    Write-Host "  Firewall rule already exists" -ForegroundColor Green
} else {
    netsh advfirewall firewall add rule name="BOM" dir=in action=allow protocol=TCP localport=$Port
    Write-Host "  Firewall rule added for port $Port" -ForegroundColor Green
}

# ------------------------------------------
# Step 9: Start with PM2 (background service)
# ------------------------------------------
Write-Host "[Step 9/9] Starting BOM as background service..." -ForegroundColor Yellow

$pm2 = npm list -g pm2 2>$null
if (-not ($pm2 -match "pm2@")) {
    npm install -g pm2 pm2-windows-startup 2>&1 | Out-Null
    Write-Host "  PM2 installed" -ForegroundColor Green
}

Set-Location "$InstallDir\server"
Stop-Process -Name node -Force -ErrorAction SilentlyContinue 2>$null
Start-Sleep 2

pm2 delete bom-system 2>$null
pm2 start dist/index.js --name bom-system
pm2 save
pm2-startup install 2>$null

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  URL:      http://localhost:$Port" -ForegroundColor White
Write-Host "  Account:  admin@bom.local" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "  PM2 Commands:" -ForegroundColor White
Write-Host "    pm2 status       - Check status" -ForegroundColor Gray
Write-Host "    pm2 logs         - View logs" -ForegroundColor Gray
Write-Host "    pm2 restart all  - Restart" -ForegroundColor Gray
Write-Host "    pm2 stop all     - Stop" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan
