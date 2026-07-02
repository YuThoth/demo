import { upsertDevice } from "../domain/devices.js";
import { recordFlow } from "../domain/flows.js";
import { recordDnsQuery } from "../domain/dns.js";
import { runSecurityDetections } from "../domain/security.js";

export function createInitialState() {
  return {
    devices: [],
    flows: [],
    dnsQueries: [],
    policies: [
      { type: "domain-block", value: "malware.example", enabled: true },
      { type: "ip-block", value: "203.0.113.66", enabled: true },
      { type: "device-limit", value: "aa-bb-cc-00-00-02", limitKbps: 4096, enabled: true }
    ],
    alerts: [],
    threatIntel: {
      maliciousIps: ["203.0.113.66"],
      miningDomains: ["pool.minexmr.example"]
    },
    settings: {
      wanInterface: "Ethernet WAN",
      lanInterface: "Ethernet LAN",
      lanCidr: "10.10.10.1/24",
      dhcpPool: "10.10.10.50-10.10.10.200",
      upstreamDns: ["223.5.5.5", "1.1.1.1"]
    }
  };
}

export function seedSimulator(state, now = Date.now()) {
  if ((state.devices ?? []).length > 0) return state;

  const phone = upsertDevice(state, { ip: "10.10.10.21", mac: "AA:BB:CC:00:00:01", hostname: "frontdesk-phone", vendor: "Apple", group: "staff" }, now);
  const pc = upsertDevice(state, { ip: "10.10.10.22", mac: "AA:BB:CC:00:00:02", hostname: "office-pc", vendor: "Intel", group: "office" }, now);
  const camera = upsertDevice(state, { ip: "10.10.10.23", mac: "AA:BB:CC:00:00:03", hostname: "camera-entrance", vendor: "Hikvision", group: "iot" }, now);

  recordDnsQuery(state, { deviceId: phone.id, domain: "weixin.qq.com", resolvedIps: ["120.232.145.11"], timestamp: now - 50000 });
  recordDnsQuery(state, { deviceId: pc.id, domain: "video.example", resolvedIps: ["198.51.100.20"], timestamp: now - 45000 });
  recordDnsQuery(state, { deviceId: camera.id, domain: "pool.minexmr.example", resolvedIps: ["198.51.100.88"], timestamp: now - 40000 });
  recordDnsQuery(state, { deviceId: pc.id, domain: "malware.example", resolvedIps: ["203.0.113.66"], timestamp: now - 35000 });

  recordFlow(state, { deviceId: phone.id, direction: "download", bytes: 18_000_000, protocol: "tcp", destIp: "120.232.145.11", destPort: 443, startedAt: now - 120000, endedAt: now - 10000 });
  recordFlow(state, { deviceId: phone.id, direction: "upload", bytes: 2_400_000, protocol: "tcp", destIp: "120.232.145.11", destPort: 443, startedAt: now - 120000, endedAt: now - 10000 });
  recordFlow(state, { deviceId: pc.id, direction: "download", bytes: 86_000_000, protocol: "tcp", destIp: "198.51.100.20", destPort: 443, startedAt: now - 90000, endedAt: now - 5000 });
  recordFlow(state, { deviceId: pc.id, direction: "upload", bytes: 9_000_000, protocol: "tcp", destIp: "198.51.100.20", destPort: 443, startedAt: now - 90000, endedAt: now - 5000 });
  recordFlow(state, { deviceId: pc.id, direction: "download", bytes: 5_000_000, protocol: "tcp", destIp: "198.51.100.44", destPort: 6881, startedAt: now - 60000, endedAt: now - 2000 });
  recordFlow(state, { deviceId: camera.id, direction: "upload", bytes: 31_000_000, protocol: "tcp", destIp: "203.0.113.66", destPort: 4444, startedAt: now - 50000, endedAt: now - 1000 });

  for (let i = 1; i <= 25; i += 1) {
    recordFlow(state, { deviceId: camera.id, direction: "upload", bytes: 1000, protocol: "tcp", destIp: `10.10.10.${i}`, destPort: 22, startedAt: now - 30000, endedAt: now - 20000 });
  }

  runSecurityDetections(state);
  return state;
}

export function createSimulator() {
  return {
    tick(state, nowMs = Date.now()) {
      return seedSimulator(state, nowMs);
    }
  };
}
