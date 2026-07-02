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
