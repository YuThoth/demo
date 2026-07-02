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
