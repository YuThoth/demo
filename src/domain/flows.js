export function recordFlow(state, flow) {
  state.flows ??= [];
  const record = {
    id: `flow-${state.flows.length + 1}`,
    direction: "download",
    protocol: "tcp",
    bytes: 0,
    startedAt: Date.now(),
    endedAt: Date.now(),
    ...flow
  };
  state.flows.push(record);
  return record;
}

export function getTrafficSummary(state, nowMs = Date.now()) {
  const byDevice = new Map();
  let totalUpBps = 0;
  let totalDownBps = 0;

  for (const flow of state.flows ?? []) {
    const item = byDevice.get(flow.deviceId) ?? {
      deviceId: flow.deviceId,
      uploadBytes: 0,
      downloadBytes: 0,
      uploadBps: 0,
      downloadBps: 0,
      connections: 0,
      activeTargets: []
    };
    const durationSeconds = Math.max(1, ((flow.endedAt ?? nowMs) - (flow.startedAt ?? nowMs - 1000)) / 1000);
    const bps = Math.round((Number(flow.bytes || 0) * 8) / durationSeconds);

    if (flow.direction === "upload") {
      item.uploadBytes += flow.bytes;
      item.uploadBps += bps;
      totalUpBps += bps;
    } else {
      item.downloadBytes += flow.bytes;
      item.downloadBps += bps;
      totalDownBps += bps;
    }

    if ((flow.endedAt ?? 0) >= nowMs - 60000) {
      item.connections += 1;
      item.activeTargets.push({
        ip: flow.destIp,
        port: flow.destPort,
        protocol: flow.protocol,
        country: countryForIp(flow.destIp)
      });
    }
    byDevice.set(flow.deviceId, item);
  }

  return {
    totalUpBps,
    totalDownBps,
    devices: [...byDevice.values()].sort((a, b) => (b.downloadBytes + b.uploadBytes) - (a.downloadBytes + a.uploadBytes))
  };
}

export function countryForIp(ip) {
  if (!ip) return "Unknown";
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.16.")) return "Private";
  if (ip.startsWith("8.8.") || ip.startsWith("1.1.") || ip.startsWith("198.51.")) return "US";
  if (ip.startsWith("203.0.")) return "CN";
  if (ip.startsWith("120.")) return "CN";
  return "Global";
}
