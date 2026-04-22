$lines = @(
    'DATABASE_URL="sqlserver://localhost\ATENLABDBSERVER;database=BOM;user=BomAdmin;password=BomSystem@2026;encrypt=true;trustServerCertificate=true"',
    'JWT_SECRET="bom-system-secret-key-production"',
    'PORT=3001',
    'NODE_ENV=production'
)
$lines | Out-File -FilePath C:\BOM\server\.env -Encoding ascii
Write-Host "[OK] .env updated"
type C:\BOM\server\.env

Set-Location C:\BOM\server
Write-Host "[1/3] Pushing database schema..."
npx prisma db push

Write-Host "[2/3] Seeding data..."
npx tsx src/seed.ts

Write-Host "[3/3] Starting server..."
node dist/index.js
