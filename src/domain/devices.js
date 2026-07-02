function normalizeMac(mac) {
  return String(mac || "unknown").trim().toUpperCase();
}

function deviceIdFromMac(mac) {
  return normalizeMac(mac).replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function upsertDevice(state, input, now = Date.now()) {
  state.devices ??= [];
  const mac = normalizeMac(input.mac);
  const id = deviceIdFromMac(mac);
  let device = state.devices.find((item) => item.id === id);

  if (!device) {
    device = {
      id,
      ip: input.ip,
      mac,
      hostname: input.hostname || "",
      vendor: input.vendor || "Unknown",
      group: input.group || "default",
      note: input.note || "",
      online: true,
      firstSeen: now,
      lastSeen: now
    };
    state.devices.push(device);
    return device;
  }

  device.ip = input.ip || device.ip;
  device.hostname = input.hostname || device.hostname;
  device.vendor = input.vendor || device.vendor;
  device.group = input.group || device.group;
  device.note = input.note ?? device.note;
  device.online = true;
  device.lastSeen = now;
  return device;
}

export function listDevices(state) {
  return [...(state.devices ?? [])].sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}
