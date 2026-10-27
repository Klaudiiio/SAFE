$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root "backend"

Write-Host "Starting SAFE app, admin web, and backend..."

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; .\.venv\Scripts\Activate.ps1; python manage.py runserver 0.0.0.0:8000" -WorkingDirectory $root
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm run dev" -WorkingDirectory $root
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm run dev:web" -WorkingDirectory $root

Write-Host "SAFE services started."
Write-Host "SAFE APP: http://localhost:5173"
Write-Host "Admin web: http://localhost:5174"
Write-Host "Backend: http://127.0.0.1:8000/api/health/ (also available to devices on your local network)"
