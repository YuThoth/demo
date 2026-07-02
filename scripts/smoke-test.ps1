$ErrorActionPreference = "Stop"

npm test

$proc = Start-Process -FilePath "node" -ArgumentList "src/server.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

try {
  $health = Invoke-RestMethod http://127.0.0.1:4780/api/health
  if (-not $health.ok) { throw "Health check failed" }

  $devices = Invoke-RestMethod http://127.0.0.1:4780/api/devices
  if ($devices.Count -lt 3) { throw "Expected at least 3 devices" }

  $traffic = Invoke-RestMethod http://127.0.0.1:4780/api/traffic
  if ($traffic.devices.Count -lt 3) { throw "Expected traffic for at least 3 devices" }

  $dns = Invoke-RestMethod http://127.0.0.1:4780/api/dns
  if ($dns.ranking.Count -lt 1) { throw "Expected DNS ranking" }

  $alerts = Invoke-RestMethod http://127.0.0.1:4780/api/security
  if ($alerts.Count -lt 1) { throw "Expected security alerts" }

  $report = Invoke-WebRequest http://127.0.0.1:4780/api/reports/traffic.csv -UseBasicParsing
  if ($report.Content -notmatch "hostname,ip,mac,downloadBytes,uploadBytes,connections") {
    throw "Expected traffic CSV header"
  }

  Write-Output "Smoke test passed"
} finally {
  Stop-Process -Id $proc.Id -Force
}
