netsh advfirewall firewall add rule name="BOM" dir=in action=allow protocol=TCP localport=3001
Write-Host "[OK] Firewall rule added for port 3001"
