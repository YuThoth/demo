function isEnabled(policy) {
  return policy.enabled !== false;
}

function sameTimeWindow(policy, now = new Date()) {
  if (!policy.days && !policy.start && !policy.end) return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value) => {
    const [hours, mins] = String(value || "00:00").split(":").map(Number);
    return hours * 60 + mins;
  };
  const start = toMinutes(policy.start);
  const end = toMinutes(policy.end);
  return start <= end ? minutes >= start && minutes <= end : minutes >= start || minutes <= end;
}

export function evaluateConnectionPolicy(state, context) {
  const policies = (state.policies ?? []).filter(isEnabled);
  const device = (state.devices ?? []).find((item) => item.id === context.deviceId);
  const domain = String(context.domain || "").toLowerCase();

  if (policies.some((policy) => policy.type === "device-allow" && policy.value === context.deviceId)) {
    return { action: "allow", reason: "device allow rule" };
  }
  if (policies.some((policy) => policy.type === "domain-allow" && String(policy.value).toLowerCase() === domain)) {
    return { action: "allow", reason: "domain allow rule" };
  }
  if (policies.some((policy) => policy.type === "ip-allow" && policy.value === context.destIp)) {
    return { action: "allow", reason: "ip allow rule" };
  }
  if (policies.some((policy) => policy.type === "device-block" && policy.value === context.deviceId)) {
    return { action: "block", reason: "device block rule" };
  }
  if (policies.some((policy) => policy.type === "domain-block" && String(policy.value).toLowerCase() === domain)) {
    return { action: "block", reason: "domain block rule" };
  }
  if (policies.some((policy) => policy.type === "ip-block" && policy.value === context.destIp)) {
    return { action: "block", reason: "ip block rule" };
  }
  if (policies.some((policy) => policy.type === "port-block" && Number(policy.value) === Number(context.destPort))) {
    return { action: "block", reason: "port block rule" };
  }
  if (policies.some((policy) => policy.type === "time-block" && (policy.deviceId === context.deviceId || policy.group === device?.group) && sameTimeWindow(policy))) {
    return { action: "block", reason: "time window block rule" };
  }

  const deviceLimit = policies.find((policy) => policy.type === "device-limit" && policy.value === context.deviceId);
  if (deviceLimit) return { action: "limit", reason: "device limit rule", limitKbps: Number(deviceLimit.limitKbps || 0) };

  const groupLimit = policies.find((policy) => policy.type === "group-limit" && policy.value === device?.group);
  if (groupLimit) return { action: "limit", reason: "group limit rule", limitKbps: Number(groupLimit.limitKbps || 0) };

  return { action: "allow", reason: "default allow" };
}
