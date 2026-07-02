$ErrorActionPreference = "Stop"

npm test

$port = 4781
$env:PORT = "$port"
$proc = Start-Process -FilePath "node" -ArgumentList "src/server.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

try {
  $baseUrl = "http://127.0.0.1:$port"
  $health = Invoke-RestMethod "$baseUrl/api/health"
  if (-not $health.ok) { throw "Health check failed" }

  $devices = Invoke-RestMethod "$baseUrl/api/devices"
  if ($devices.Count -lt 3) { throw "Expected at least 3 devices" }

  $traffic = Invoke-RestMethod "$baseUrl/api/traffic"
  if ($traffic.devices.Count -lt 3) { throw "Expected traffic for at least 3 devices" }

  $dns = Invoke-RestMethod "$baseUrl/api/dns"
  if ($dns.ranking.Count -lt 1) { throw "Expected DNS ranking" }

  $alerts = Invoke-RestMethod "$baseUrl/api/security"
  if ($alerts.Count -lt 1) { throw "Expected security alerts" }

  $report = Invoke-WebRequest "$baseUrl/api/reports/traffic.csv" -UseBasicParsing
  if ($report.Content -notmatch "hostname,ip,mac,downloadBytes,uploadBytes,connections") {
    throw "Expected traffic CSV header"
  }

  Write-Output "Smoke test passed"
} finally {
  Remove-Item Env:PORT -ErrorAction SilentlyContinue
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
