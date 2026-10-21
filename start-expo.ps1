$ErrorActionPreference = "Stop"

$source = Join-Path $PSScriptRoot "mobile"
$runtime = Join-Path $env:LOCALAPPDATA "SAFE-Mobile-Expo"

New-Item -ItemType Directory -Path $runtime -Force | Out-Null

$runtimeLock = Join-Path $runtime "package-lock.json"
$previousLockHash = if (Test-Path $runtimeLock) { (Get-FileHash $runtimeLock -Algorithm SHA256).Hash } else { "" }

foreach ($file in @("App.js", "app.json", "index.js", "package.json", "package-lock.json")) {
    Copy-Item -Path (Join-Path $source $file) -Destination (Join-Path $runtime $file) -Force
}
Copy-Item -Path (Join-Path $source "assets") -Destination $runtime -Recurse -Force
$currentLockHash = (Get-FileHash $runtimeLock -Algorithm SHA256).Hash

Push-Location $runtime
try {
    if (-not (Test-Path (Join-Path $runtime "node_modules\expo\package.json")) -or $previousLockHash -ne $currentLockHash) {
        npm ci
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    $env:EXPO_NO_METRO_WORKSPACE_ROOT = "1"
    npm exec --yes --package=node@22 -- node ./node_modules/expo/bin/cli start --lan --go --clear --port 8085
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
