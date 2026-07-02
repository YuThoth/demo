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
