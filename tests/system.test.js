import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createApp } from "../src/app/createApp.js";

test("system endpoint reports runtime and gateway summary", async () => {
  const server = createServer(createApp({ dataDir: ".test-data-system", simulatorEnabled: true }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const system = await (await fetch(`http://127.0.0.1:${port}/api/system`)).json();
  server.close();

  assert.equal(system.mode, "simulator");
  assert.equal(system.version, "0.1.0");
  assert.equal(system.service.status, "running");
  assert.equal(system.counts.devices, 3);
  assert.equal(system.network.lanCidr, "10.10.10.1/24");
  assert.ok(system.runtime.node.startsWith("v"));
});

test("UI contains system information navigation section", () => {
  const html = readFileSync("public/index.html", "utf8");
  assert.ok(html.includes("系统信息"));
  assert.ok(html.includes("system-info"));
});
