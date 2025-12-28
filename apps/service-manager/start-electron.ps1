param(
    [string]$AppPath = (Get-Location).Path
)

# Remove trailing backslash if present
$AppPath = $AppPath.TrimEnd('\')

# Validate path exists
if (-not (Test-Path $AppPath)) {
    Write-Error "Path does not exist: $AppPath"
    exit 1
}

$electronPath = Join-Path $AppPath "node_modules\electron\dist\electron.exe"

if (-not (Test-Path $electronPath)) {
    Write-Error "Electron not found: $electronPath"
    exit 1
}

# Start Electron in normal window
Start-Process -FilePath $electronPath -ArgumentList "." -WorkingDirectory $AppPath

