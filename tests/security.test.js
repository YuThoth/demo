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
