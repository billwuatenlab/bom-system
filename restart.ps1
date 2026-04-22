Write-Host "=== Restarting BOM Server ==="

Write-Host "[1] Stopping all node processes..."
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep 2

Write-Host "[2] Checking .env..."
Get-Content C:\BOM\server\.env

Write-Host ""
Write-Host "[3] Starting server (showing output)..."
Set-Location C:\BOM\server
node dist/index.js
