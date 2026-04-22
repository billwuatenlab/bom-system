chcp 65001
Write-Host "=========================================="
Write-Host "  BOM System - Auto Setup"
Write-Host "=========================================="

Set-Location C:\BOM\server

# Create .env
$envContent = @"
DATABASE_URL="sqlserver://localhost:1433;database=BOM;user=ATENLAB-ERP%5CAdminA1ERP;password=atenlaberpadminpw12345%2A;encrypt=true;trustServerCertificate=true"
JWT_SECRET="bom-system-secret-key-production"
PORT=3001
NODE_ENV=production
"@
$envContent | Out-File -FilePath .env -Encoding ascii
Write-Host "[OK] .env created"

# Install backend
Write-Host "[1/7] Installing backend dependencies..."
npm install 2>&1 | Select-Object -Last 3

Write-Host "[2/7] Generating Prisma client..."
npx prisma generate 2>&1 | Select-Object -Last 2

Write-Host "[3/7] Pushing database schema..."
npx prisma db push 2>&1 | Select-Object -Last 2

Write-Host "[4/7] Seeding data..."
npx tsx src/seed.ts 2>&1

Write-Host "[5/7] Building backend..."
npm run build 2>&1 | Select-Object -Last 2

# Install frontend
Set-Location C:\BOM\client
Write-Host "[6/7] Installing frontend dependencies..."
npm install 2>&1 | Select-Object -Last 3

Write-Host "[7/7] Building frontend..."
npm run build 2>&1 | Select-Object -Last 3

Write-Host ""
Write-Host "=========================================="
Write-Host "  Setup complete!"
Write-Host "  Run this to start: cd C:\BOM\server; node dist/index.js"
Write-Host "  Then open: http://localhost:3001"
Write-Host "=========================================="
