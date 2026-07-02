# LAN Gateway Traffic Analyzer User Guide

## Current Version

This is the first runnable management build. It runs in simulator mode by default so every product module can be tested on a normal Windows computer without changing the live network.

The current build includes:

- Device inventory
- Per-device traffic totals and connection counts
- Domain and DNS ranking
- Target IP, port, protocol, and basic country tagging
- Security alerts for scan behavior, malicious IPs, mining domains, and P2P ports
- Policy listing for limits, blocks, and allow rules
- CSV traffic report export
- Modern local web management UI

It does not decrypt HTTPS, read chat content, capture passwords, or inspect webpage bodies.

## Run Locally

```powershell
npm install
npm start
```

Open:

```text
http://127.0.0.1:4780
```

## Test

```powershell
npm test
npm run smoke
```

## Package

```powershell
npm run package:win
```

The package is created at:

```text
outputs/lan-gateway-analyzer.zip
```

## Target Dual-NIC Topology

The intended real deployment is:

```text
Upstream router LAN
  -> Windows PC NIC 1, WAN side
  -> Gateway Analyzer service
  -> Windows PC NIC 2, LAN side
  -> Switch / AP / user devices
```

Only devices behind the LAN-side NIC can be fully measured and controlled.

## Real Gateway Adapter Status

The Node build keeps real packet forwarding behind `src/adapters/gatewayAdapter.js`. That adapter currently reports that real forwarding is not enabled. A production enforcement build should add one of these Windows packet-control integrations:

- Windows Filtering Platform
- WinDivert
- Npcap plus a separate enforcement component

Those integrations require administrator privileges and driver installation. The current simulator mode is intentionally safe for development and UI validation.

