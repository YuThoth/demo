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
