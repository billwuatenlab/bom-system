Write-Host "=== Installing BOM as Windows Service ==="

Write-Host "[1/3] Installing pm2 globally..."
npm install -g pm2 pm2-windows-startup 2>&1 | Select-Object -Last 3

Write-Host "[2/3] Starting BOM with pm2..."
Set-Location C:\BOM\server
pm2 start dist/index.js --name "bom-system"
pm2 save

Write-Host "[3/3] Setting pm2 to auto-start on boot..."
pm2-startup install

Write-Host ""
Write-Host "=========================================="
Write-Host "  BOM System is now a Windows service!"
Write-Host "  It will auto-start on reboot."
Write-Host ""
Write-Host "  Useful commands:"
Write-Host "    pm2 status        - Check status"
Write-Host "    pm2 logs          - View logs"
Write-Host "    pm2 restart all   - Restart"
Write-Host "    pm2 stop all      - Stop"
Write-Host "=========================================="
