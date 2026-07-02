function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

export function createTrafficCsvReport(state, options = {}) {
  const from = options.from ?? 0;
  const to = options.to ?? Number.MAX_SAFE_INTEGER;
  const devices = state.devices ?? [];
  const flows = (state.flows ?? []).filter((flow) => (flow.startedAt ?? 0) >= from && (flow.endedAt ?? 0) <= to);
  const rows = [["hostname", "ip", "mac", "downloadBytes", "uploadBytes", "connections"]];

  for (const device of devices) {
    const deviceFlows = flows.filter((flow) => flow.deviceId === device.id);
    const downloadBytes = deviceFlows.filter((flow) => flow.direction !== "upload").reduce((sum, flow) => sum + Number(flow.bytes || 0), 0);
    const uploadBytes = deviceFlows.filter((flow) => flow.direction === "upload").reduce((sum, flow) => sum + Number(flow.bytes || 0), 0);
    rows.push([device.hostname, device.ip, device.mac, downloadBytes, uploadBytes, deviceFlows.length]);
  }

  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}
