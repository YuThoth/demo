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
