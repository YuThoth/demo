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
