param(
  [string]$Browser = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  [int]$DebugPort = 9224
)
# Run in your normal PowerShell session; the Codex managed sandbox may block browser IPC.
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$profileDir = Join-Path $projectDir 'var\capture-browser-profile'
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
$browserArgs = @('--headless=new', '--disable-gpu', '--no-first-run', "--remote-debugging-port=$DebugPort", "--user-data-dir=`"$profileDir`"", 'about:blank')
$browserProcess = Start-Process -FilePath $Browser -ArgumentList $browserArgs -WindowStyle Hidden -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try { Invoke-RestMethod "http://127.0.0.1:$DebugPort/json/version" | Out-Null; $ready = $true; break } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $ready) { throw 'Browser debugging endpoint did not become ready.' }
  Push-Location $projectDir
  try { node scripts/capture-browser.mjs; if ($LASTEXITCODE -ne 0) { throw 'Browser capture failed; inspect its error.' } }
  finally { Pop-Location }
} finally {
  if (-not $browserProcess.HasExited) { Stop-Process -Id $browserProcess.Id -ErrorAction SilentlyContinue }
}
