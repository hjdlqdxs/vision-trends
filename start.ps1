$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw '请先安装 Node.js 22.13 或更新版本。' }
node scripts/seed.mjs
if ($LASTEXITCODE -ne 0) { throw '初始化数据失败，请查看错误。' }
Write-Host '浏览器访问 http://127.0.0.1:3000，按 Ctrl+C 停止。'
node src/server.mjs
