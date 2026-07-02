const P2P_PORT_MIN = 6881;
const P2P_PORT_MAX = 6999;

function addAlert(alerts, alert) {
  alerts.push({
    id: `${alert.type}-${alerts.length + 1}`,
    severity: alert.severity || "medium",
    status: "open",
    timestamp: alert.timestamp ?? Date.now(),
    ...alert
  });
}

export function runSecurityDetections(state) {
  const alerts = [];
  const flows = state.flows ?? [];
  const maliciousIps = new Set(state.threatIntel?.maliciousIps ?? []);
  const miningDomains = new Set((state.threatIntel?.miningDomains ?? []).map((domain) => String(domain).toLowerCase()));

  const scanGroups = new Map();
  for (const flow of flows) {
    const key = `${flow.deviceId}:${flow.destPort}`;
    const targets = scanGroups.get(key) ?? new Set();
    targets.add(flow.destIp);
    scanGroups.set(key, targets);

    if (maliciousIps.has(flow.destIp)) {
      addAlert(alerts, {
        type: "malicious-ip",
        severity: "high",
        deviceId: flow.deviceId,
        target: flow.destIp,
        evidence: `Matched malicious IP ${flow.destIp}`
      });
    }

    const port = Number(flow.destPort);
    if (port >= P2P_PORT_MIN && port <= P2P_PORT_MAX) {
      addAlert(alerts, {
        type: "p2p",
        severity: "medium",
        deviceId: flow.deviceId,
        target: `${flow.destIp}:${flow.destPort}`,
        evidence: `Traffic on common P2P port ${flow.destPort}`
      });
    }
  }

  for (const [key, targets] of scanGroups) {
    if (targets.size >= 20) {
      const [deviceId, port] = key.split(":");
      addAlert(alerts, {
        type: "scan",
        severity: "high",
        deviceId,
        target: `port ${port}`,
        evidence: `${targets.size} unique targets on port ${port}`
      });
    }
  }

  for (const query of state.dnsQueries ?? []) {
    const domain = String(query.domain || "").toLowerCase();
    if (miningDomains.has(domain)) {
      addAlert(alerts, {
        type: "mining-domain",
        severity: "high",
        deviceId: query.deviceId,
        target: domain,
        evidence: `Matched mining domain ${domain}`
      });
    }
  }

  state.alerts = alerts;
  return alerts;
}
