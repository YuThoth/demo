import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { createInitialState, createSimulator } from "../adapters/simulator.js";
import { createGatewayAdapter } from "../adapters/gatewayAdapter.js";
import { listDevices } from "../domain/devices.js";
import { getTrafficSummary } from "../domain/flows.js";
import { rankDomains } from "../domain/dns.js";
import { runSecurityDetections } from "../domain/security.js";
import { createTrafficCsvReport } from "../domain/reports.js";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, value, status = 200) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

function sendText(res, value, contentType = "text/plain; charset=utf-8", status = 200) {
  res.writeHead(status, { "content-type": contentType });
  res.end(value);
}

async function sendStatic(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(process.cwd(), "public", requested.replace(/^\/+/, ""));
  if (!existsSync(filePath)) {
    sendText(res, "Not found", "text/plain; charset=utf-8", 404);
    return;
  }
  const body = await readFile(filePath);
  res.writeHead(200, { "content-type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream" });
  res.end(body);
}

export function createApp(options = {}) {
  const simulatorEnabled = options.simulatorEnabled !== false;
  const state = createInitialState();
  const simulator = createSimulator();
  const gateway = createGatewayAdapter();
  if (simulatorEnabled) simulator.tick(state);

  return async function app(req, res) {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (simulatorEnabled) simulator.tick(state);

      if (url.pathname === "/api/health") {
        sendJson(res, { ok: true, mode: simulatorEnabled ? "simulator" : "gateway" });
        return;
      }
      if (url.pathname === "/api/devices") {
        sendJson(res, listDevices(state));
        return;
      }
      if (url.pathname === "/api/traffic") {
        sendJson(res, getTrafficSummary(state));
        return;
      }
      if (url.pathname === "/api/dns") {
        sendJson(res, { recent: state.dnsQueries.slice(-50).reverse(), ranking: rankDomains(state, 20) });
        return;
      }
      if (url.pathname === "/api/security") {
        sendJson(res, runSecurityDetections(state));
        return;
      }
      if (url.pathname === "/api/policies") {
        sendJson(res, state.policies);
        return;
      }
      if (url.pathname === "/api/settings") {
        sendJson(res, { ...state.settings, gateway: gateway.status() });
        return;
      }
      if (url.pathname === "/api/reports/traffic.csv") {
        sendText(res, createTrafficCsvReport(state, { from: 0, to: Date.now() }), "text/csv; charset=utf-8");
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        sendJson(res, { error: "not_found" }, 404);
        return;
      }
      await sendStatic(req, res);
    } catch (error) {
      sendJson(res, { error: "server_error", message: error.message }, 500);
    }
  };
}
