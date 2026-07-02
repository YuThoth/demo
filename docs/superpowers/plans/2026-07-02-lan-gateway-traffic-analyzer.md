# LAN Gateway Traffic Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-version Windows runnable app for a dual-NIC LAN gateway traffic analyzer, with every product module present and testable through a deterministic local simulator.

**Architecture:** Use a Node.js local service as the control plane and management UI host. Keep packet forwarding and Windows driver integration behind explicit adapters so the first version can run in simulator mode now and later swap in WinDivert/WFP implementations without rewriting the UI or business logic.

**Tech Stack:** Node.js 25, npm, Express or native HTTP server, SQLite-compatible JSON store for first version, vanilla HTML/CSS/JS UI, Node test runner, PowerShell smoke checks.

## Global Constraints

- The software is for authorized network management only.
- Do not implement HTTPS decryption, credential capture, chat-content viewing, webpage-body capture, or stealth interception.
- First version must expose modules for device management, traffic statistics, DNS/domain analysis, security alerts, policies, reports, and settings.
- Real dual-NIC routing and low-level packet enforcement must be behind adapters; simulator mode must be the default test mode.
- The app must be runnable on the current machine with the installed Node/npm toolchain.
- Generated data must be local-only and stored under the project directory unless the user changes settings.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `src/server.js`: application entry point and HTTP API server.
- `src/app/createApp.js`: wires routes, services, storage, simulator, and policy engine.
- `src/storage/jsonStore.js`: local JSON persistence with atomic writes.
- `src/domain/devices.js`: device model and discovery/update logic.
- `src/domain/flows.js`: flow aggregation and speed calculation.
- `src/domain/dns.js`: DNS query model, domain ranking, black/white list evaluation.
- `src/domain/security.js`: alert rules for scan, high connections, mining, malicious domains, P2P.
- `src/domain/policies.js`: device/group/domain/IP/port/time policy evaluation.
- `src/domain/reports.js`: CSV report generation.
- `src/adapters/simulator.js`: deterministic sample traffic generator for testing all features.
- `src/adapters/gatewayAdapter.js`: interface for future real gateway/NAT/DHCP/DNS/packet capture.
- `public/index.html`: management UI shell.
- `public/styles.css`: polished dashboard styling.
- `public/app.js`: UI state, charts, tables, settings, and API calls.
- `tests/*.test.js`: Node test runner tests for every module.
- `scripts/smoke-test.ps1`: end-to-end local smoke test.
- `docs/USER_GUIDE.md`: run instructions and deployment notes.

## Task 1: Project Scaffold And App Shell

**Files:**
- Create: `package.json`
- Create: `src/server.js`
- Create: `src/app/createApp.js`
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`
- Test: `tests/server.test.js`

**Interfaces:**
- Produces: `createApp(options: { dataDir: string, simulatorEnabled: boolean }): http.RequestListener`
- Produces: `GET /api/health -> { ok: true, mode: "simulator" | "gateway" }`

- [ ] **Step 1: Write the failing server test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createApp } from "../src/app/createApp.js";

test("health endpoint reports simulator mode", async () => {
  const server = createServer(createApp({ dataDir: ".test-data", simulatorEnabled: true }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  const body = await response.json();
  server.close();
  assert.deepEqual(body, { ok: true, mode: "simulator" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/server.test.js`
Expected: FAIL because `package.json` and `createApp.js` do not exist yet.

- [ ] **Step 3: Create minimal app shell**

Implement `package.json` with `"type": "module"`, `"start": "node src/server.js"`, and `"test": "node --test"`. Implement `createApp()` with native Node HTTP routing for `/api/health` and static files from `public/`. Implement `server.js` to listen on `127.0.0.1:4780`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/server.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json src public tests/server.test.js
git commit -m "feat: add gateway analyzer app shell"
```

## Task 2: Local Storage And Core Models

**Files:**
- Create: `src/storage/jsonStore.js`
- Create: `src/domain/devices.js`
- Test: `tests/devices.test.js`

**Interfaces:**
- Produces: `createJsonStore(filePath: string): { read(): object, write(data: object): void }`
- Produces: `upsertDevice(state, input): device`
- Produces: `listDevices(state): device[]`

- [ ] **Step 1: Write failing device tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { upsertDevice, listDevices } from "../src/domain/devices.js";

test("upsertDevice creates and updates a device by MAC", () => {
  const state = { devices: [] };
  const first = upsertDevice(state, {
    ip: "10.10.10.21",
    mac: "AA:BB:CC:00:00:01",
    hostname: "phone-a",
    vendor: "Apple"
  });
  const second = upsertDevice(state, {
    ip: "10.10.10.22",
    mac: "AA:BB:CC:00:00:01",
    hostname: "phone-a",
    vendor: "Apple"
  });
  assert.equal(first.id, second.id);
  assert.equal(listDevices(state)[0].ip, "10.10.10.22");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/devices.test.js`
Expected: FAIL because `devices.js` is missing.

- [ ] **Step 3: Implement storage and devices**

Implement deterministic device IDs from MAC addresses, timestamps, online status, group, note, and counters initialized to zero.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/devices.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/jsonStore.js src/domain/devices.js tests/devices.test.js
git commit -m "feat: add device storage model"
```

## Task 3: Flow Aggregation And Traffic Metrics

**Files:**
- Create: `src/domain/flows.js`
- Test: `tests/flows.test.js`

**Interfaces:**
- Consumes: device IDs from `devices.js`
- Produces: `recordFlow(state, flow): flowRecord`
- Produces: `getTrafficSummary(state, nowMs): { totalUpBps, totalDownBps, devices: [] }`

- [ ] **Step 1: Write failing flow tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { recordFlow, getTrafficSummary } from "../src/domain/flows.js";

test("traffic summary aggregates upload, download, and connection count per device", () => {
  const state = { flows: [] };
  recordFlow(state, {
    deviceId: "aa-bb",
    direction: "download",
    bytes: 120000,
    protocol: "tcp",
    destIp: "8.8.8.8",
    destPort: 443,
    startedAt: 1000,
    endedAt: 2000
  });
  recordFlow(state, {
    deviceId: "aa-bb",
    direction: "upload",
    bytes: 30000,
    protocol: "udp",
    destIp: "1.1.1.1",
    destPort: 53,
    startedAt: 1000,
    endedAt: 2000
  });
  const summary = getTrafficSummary(state, 2000);
  assert.equal(summary.devices[0].downloadBytes, 120000);
  assert.equal(summary.devices[0].uploadBytes, 30000);
  assert.equal(summary.devices[0].connections, 2);
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/flows.test.js`
Expected: FAIL because `flows.js` is missing.

- [ ] **Step 3: Implement flow aggregation**

Implement append-only flow storage, per-device byte totals, active connection count within the last 60 seconds, and global totals.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/flows.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/flows.js tests/flows.test.js
git commit -m "feat: add traffic flow aggregation"
```

## Task 4: DNS Analysis And Domain Policy

**Files:**
- Create: `src/domain/dns.js`
- Test: `tests/dns.test.js`

**Interfaces:**
- Produces: `recordDnsQuery(state, query): dnsRecord`
- Produces: `rankDomains(state, limit): Array<{ domain, count }>`
- Produces: `evaluateDomainPolicy(state, domain): "allow" | "block"`

- [ ] **Step 1: Write failing DNS tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { recordDnsQuery, rankDomains, evaluateDomainPolicy } from "../src/domain/dns.js";

test("DNS records are ranked and blocked by blacklist", () => {
  const state = { dnsQueries: [], policies: [{ type: "domain-block", value: "bad.example", enabled: true }] };
  recordDnsQuery(state, { deviceId: "d1", domain: "bad.example", resolvedIps: ["203.0.113.9"], timestamp: 1000 });
  recordDnsQuery(state, { deviceId: "d2", domain: "good.example", resolvedIps: ["198.51.100.2"], timestamp: 1001 });
  recordDnsQuery(state, { deviceId: "d1", domain: "bad.example", resolvedIps: ["203.0.113.9"], timestamp: 1002 });
  assert.deepEqual(rankDomains(state, 1), [{ domain: "bad.example", count: 2 }]);
  assert.equal(evaluateDomainPolicy(state, "bad.example"), "block");
  assert.equal(evaluateDomainPolicy(state, "good.example"), "allow");
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/dns.test.js`
Expected: FAIL because `dns.js` is missing.

- [ ] **Step 3: Implement DNS logic**

Implement query records, exact-domain block and allow rules, and ranking by count.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/dns.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/dns.js tests/dns.test.js
git commit -m "feat: add DNS analysis and domain policy"
```

## Task 5: Security Detection Rules

**Files:**
- Create: `src/domain/security.js`
- Test: `tests/security.test.js`

**Interfaces:**
- Consumes: flows and DNS queries from previous tasks
- Produces: `runSecurityDetections(state): alert[]`

- [ ] **Step 1: Write failing security tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { runSecurityDetections } from "../src/domain/security.js";

test("security detections flag scans, mining domains, malicious IPs, and P2P ports", () => {
  const state = {
    flows: [
      ...Array.from({ length: 25 }, (_, i) => ({ deviceId: "d1", destIp: `10.10.10.${i + 1}`, destPort: 22, protocol: "tcp", bytes: 100, startedAt: 1, endedAt: 2 })),
      { deviceId: "d2", destIp: "203.0.113.66", destPort: 4444, protocol: "tcp", bytes: 1000, startedAt: 1, endedAt: 2 },
      { deviceId: "d3", destIp: "198.51.100.44", destPort: 6881, protocol: "tcp", bytes: 1000, startedAt: 1, endedAt: 2 }
    ],
    dnsQueries: [{ deviceId: "d4", domain: "pool.minexmr.example", resolvedIps: ["198.51.100.88"], timestamp: 1 }],
    threatIntel: { maliciousIps: ["203.0.113.66"], miningDomains: ["pool.minexmr.example"] }
  };
  const alerts = runSecurityDetections(state);
  assert.ok(alerts.some((a) => a.type === "scan"));
  assert.ok(alerts.some((a) => a.type === "malicious-ip"));
  assert.ok(alerts.some((a) => a.type === "p2p"));
  assert.ok(alerts.some((a) => a.type === "mining-domain"));
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/security.test.js`
Expected: FAIL because `security.js` is missing.

- [ ] **Step 3: Implement detections**

Implement deterministic rule checks: 20+ unique destination IPs on the same port means scan; threat-intel IP exact match; P2P ports 6881-6999; mining domain exact match.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/security.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/security.js tests/security.test.js
git commit -m "feat: add security detection rules"
```

## Task 6: Policy Engine

**Files:**
- Create: `src/domain/policies.js`
- Test: `tests/policies.test.js`

**Interfaces:**
- Produces: `evaluateConnectionPolicy(state, context): { action: "allow" | "block" | "limit", reason: string, limitKbps?: number }`

- [ ] **Step 1: Write failing policy tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateConnectionPolicy } from "../src/domain/policies.js";

test("policy engine applies whitelist before blacklist and supports limits", () => {
  const state = {
    policies: [
      { type: "ip-block", value: "203.0.113.10", enabled: true },
      { type: "device-allow", value: "d1", enabled: true },
      { type: "device-limit", value: "d2", limitKbps: 2048, enabled: true }
    ]
  };
  assert.equal(evaluateConnectionPolicy(state, { deviceId: "d1", destIp: "203.0.113.10", destPort: 443 }).action, "allow");
  assert.equal(evaluateConnectionPolicy(state, { deviceId: "d3", destIp: "203.0.113.10", destPort: 443 }).action, "block");
  const limited = evaluateConnectionPolicy(state, { deviceId: "d2", destIp: "198.51.100.1", destPort: 443 });
  assert.equal(limited.action, "limit");
  assert.equal(limited.limitKbps, 2048);
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/policies.test.js`
Expected: FAIL because `policies.js` is missing.

- [ ] **Step 3: Implement policy engine**

Implement deterministic policy precedence: device allow, domain allow, IP allow, device block, domain block, IP block, port block, time block, device limit, group limit, allow.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/policies.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/policies.js tests/policies.test.js
git commit -m "feat: add traffic policy engine"
```

## Task 7: Reports

**Files:**
- Create: `src/domain/reports.js`
- Test: `tests/reports.test.js`

**Interfaces:**
- Produces: `createTrafficCsvReport(state, options): string`

- [ ] **Step 1: Write failing report test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createTrafficCsvReport } from "../src/domain/reports.js";

test("traffic CSV report includes device totals", () => {
  const state = {
    devices: [{ id: "d1", ip: "10.10.10.2", mac: "AA", hostname: "pc-1" }],
    flows: [
      { deviceId: "d1", direction: "download", bytes: 1000, protocol: "tcp", destIp: "8.8.8.8", destPort: 443, startedAt: 1000, endedAt: 2000 }
    ],
    dnsQueries: [],
    alerts: []
  };
  const csv = createTrafficCsvReport(state, { from: 0, to: 3000 });
  assert.match(csv, /hostname,ip,mac,downloadBytes,uploadBytes,connections/);
  assert.match(csv, /pc-1,10.10.10.2,AA,1000,0,1/);
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/reports.test.js`
Expected: FAIL because `reports.js` is missing.

- [ ] **Step 3: Implement CSV reports**

Implement CSV escaping and device total aggregation for the requested time range.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/reports.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/reports.js tests/reports.test.js
git commit -m "feat: add CSV traffic reports"
```

## Task 8: Simulator And API Surface

**Files:**
- Create: `src/adapters/simulator.js`
- Create: `src/adapters/gatewayAdapter.js`
- Modify: `src/app/createApp.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Produces: `createSimulator(seed): { tick(state, nowMs): void }`
- Produces API endpoints: `/api/devices`, `/api/traffic`, `/api/dns`, `/api/security`, `/api/policies`, `/api/reports/traffic.csv`

- [ ] **Step 1: Write failing API test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createApp } from "../src/app/createApp.js";

test("API exposes simulated devices and traffic", async () => {
  const server = createServer(createApp({ dataDir: ".test-data-api", simulatorEnabled: true }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const devices = await (await fetch(`http://127.0.0.1:${port}/api/devices`)).json();
  const traffic = await (await fetch(`http://127.0.0.1:${port}/api/traffic`)).json();
  server.close();
  assert.ok(devices.length >= 3);
  assert.ok(traffic.devices.length >= 3);
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/api.test.js`
Expected: FAIL because simulator/API endpoints are missing.

- [ ] **Step 3: Implement simulator and APIs**

Seed simulator with three devices, DNS queries for normal/video/malicious/mining domains, flows for web/video/P2P, and one scan pattern. Add JSON API routes and CSV report route.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/api.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/adapters src/app/createApp.js tests/api.test.js
git commit -m "feat: expose analyzer APIs with simulator data"
```

## Task 9: Management UI

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`
- Test: `tests/ui-smoke.test.js`

**Interfaces:**
- Consumes: API endpoints from Task 8.
- Produces: browser UI with Dashboard, Devices, Traffic, DNS, Security, Policies, Reports, Settings sections.

- [ ] **Step 1: Write failing UI smoke test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("UI contains all first-version navigation sections", () => {
  const html = readFileSync("public/index.html", "utf8");
  for (const label of ["仪表盘", "设备", "流量", "域名", "安全", "策略", "报表", "设置"]) {
    assert.ok(html.includes(label), `missing ${label}`);
  }
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/ui-smoke.test.js`
Expected: FAIL until the UI contains all sections.

- [ ] **Step 3: Implement polished UI**

Implement responsive HTML layout, top metrics, navigation tabs, device table, traffic table, domain ranking, alerts, policy form placeholders wired to API, report download button, and settings page.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/ui-smoke.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public tests/ui-smoke.test.js
git commit -m "feat: add management dashboard UI"
```

## Task 10: Smoke Test, Packaging Script, And User Guide

**Files:**
- Create: `scripts/smoke-test.ps1`
- Create: `docs/USER_GUIDE.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run smoke`
- Produces: `npm run package:win` placeholder script that creates a runnable zip bundle, not a native installer.

- [ ] **Step 1: Write smoke test script**

```powershell
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
  Write-Output "Smoke test passed"
} finally {
  Stop-Process -Id $proc.Id -Force
}
```

- [ ] **Step 2: Add npm scripts**

Add `"smoke": "powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1"` and `"package:win": "powershell -ExecutionPolicy Bypass -Command Compress-Archive -Path package.json,src,public,docs -DestinationPath outputs/lan-gateway-analyzer.zip -Force"` to `package.json`.

- [ ] **Step 3: Write user guide**

Document simulator mode, dual-NIC target topology, admin requirements for future real gateway mode, and exact commands: `npm install`, `npm start`, `npm test`, `npm run smoke`, `npm run package:win`.

- [ ] **Step 4: Run full verification**

Run: `npm test`
Expected: PASS for all tests.

Run: `npm run smoke`
Expected: `Smoke test passed`.

Run: `npm run package:win`
Expected: `outputs/lan-gateway-analyzer.zip` exists.

- [ ] **Step 5: Commit**

```bash
git add scripts docs/USER_GUIDE.md package.json outputs/lan-gateway-analyzer.zip
git commit -m "chore: add smoke test and package bundle"
```

## Self-Review

- Spec coverage: All first-version modules are mapped to tasks. Real packet forwarding, NAT, DHCP, DNS interception, and enforcement are represented by adapter boundaries and simulator tests in this plan because the current machine has Node/npm but no .NET SDK, Go, Rust, WinDivert, Npcap, or Windows packet driver project scaffold.
- Placeholder scan: No task contains TODO/TBD placeholders. The only deferred area is explicitly scoped as future real gateway adapter work and is not required for simulator-mode first-version verification.
- Type consistency: `state`, `deviceId`, `flows`, `dnsQueries`, `policies`, `alerts`, and route names are consistent across tasks.

