$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root "dist"
$outputs = Join-Path $root "outputs"
$exe = Join-Path $outputs "lan-gateway-analyzer.exe"
$zip = Join-Path $outputs "lan-gateway-analyzer.zip"
$node = (Get-Command node).Source

New-Item -ItemType Directory -Force $dist, $outputs | Out-Null

npx esbuild src/server.js --bundle --platform=node --format=cjs --outfile=dist/server.cjs

$seaConfig = @{
  main = "dist/server.cjs"
  output = "dist/sea-prep.blob"
  disableExperimentalSEAWarning = $true
} | ConvertTo-Json
Set-Content -Path (Join-Path $root "dist/sea-config.json") -Value $seaConfig -Encoding UTF8

node --experimental-sea-config dist/sea-config.json
Copy-Item -LiteralPath $node -Destination $exe -Force
npx postject $exe NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

Copy-Item -LiteralPath (Join-Path $root "public") -Destination (Join-Path $outputs "public") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "docs") -Destination (Join-Path $outputs "docs") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "scripts") -Destination (Join-Path $outputs "scripts") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "package.json") -Destination (Join-Path $outputs "package.json") -Force

if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $outputs "*") -DestinationPath $zip -Force

Write-Output "Created $exe"
Write-Output "Created $zip"
