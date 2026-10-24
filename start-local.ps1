$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root "backend"

Write-Host "Starting SAFE local app..."

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; .\.venv\Scripts\Activate.ps1; python manage.py runserver 0.0.0.0:8000" -WorkingDirectory $root
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm run dev" -WorkingDirectory $root

Write-Host "SAFE local app started."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend: http://127.0.0.1:8000/api/health/ (also available to devices on your local network)"
