export function getSystemInfo(state, options = {}) {
  const now = Date.now();
  const startedAt = options.startedAt ?? now;
  const mode = options.simulatorEnabled === false ? "gateway" : "simulator";
  const flows = state.flows ?? [];
  const dnsQueries = state.dnsQueries ?? [];
  const alerts = state.alerts ?? [];

  return {
    mode,
    version: options.version ?? "0.1.0",
    service: {
      status: "running",
      startedAt,
      uptimeSeconds: Math.max(0, Math.floor((now - startedAt) / 1000))
    },
    runtime: {
      node: globalThis.process?.version ?? "unknown",
      platform: globalThis.process?.platform ?? "unknown",
      arch: globalThis.process?.arch ?? "unknown"
    },
    network: {
      wanInterface: state.settings?.wanInterface ?? "",
      lanInterface: state.settings?.lanInterface ?? "",
      lanCidr: state.settings?.lanCidr ?? "",
      dhcpPool: state.settings?.dhcpPool ?? "",
      upstreamDns: state.settings?.upstreamDns ?? []
    },
    counts: {
      devices: (state.devices ?? []).length,
      connections: flows.length,
      dnsQueries: dnsQueries.length,
      alerts: alerts.length,
      policies: (state.policies ?? []).length
    }
  };
}
