Write-Host "=== Checking BOM System ==="

Write-Host "[1] Checking if node is running..."
$proc = Get-Process -Name node -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "[OK] Node is running (PID: $($proc.Id))"
} else {
    Write-Host "[WARN] Node is NOT running"
}

Write-Host "[2] Testing port 3001..."
$conn = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue
Write-Host "Port 3001 open: $($conn.TcpTestSucceeded)"

Write-Host "[3] Checking Windows firewall..."
netsh advfirewall firewall show rule name="BOM" 2>&1

Write-Host "[4] Testing HTTP response..."
try {
    $r = Invoke-WebRequest -Uri http://localhost:3001/api/health -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] Server response: $($r.Content)"
} catch {
    Write-Host "[FAIL] $($_.Exception.Message)"
}

Write-Host ""
Write-Host "If node is not running, starting it now..."
if (-not $proc) {
    Set-Location C:\BOM\server
    Start-Process node -ArgumentList "dist/index.js" -NoNewWindow
    Start-Sleep 3
    Write-Host "[OK] Server started"
}
