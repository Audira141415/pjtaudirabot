$scriptPath = Join-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) 'build-and-push-release.cmd'

if (-not (Test-Path $scriptPath)) {
    Write-Host "Wrapper not found: $scriptPath"
    exit 1
}

& $scriptPath @args
exit $LASTEXITCODE
