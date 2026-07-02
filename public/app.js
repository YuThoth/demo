const state = {
  devices: [],
  traffic: { devices: [], totalUpBps: 0, totalDownBps: 0 },
  dns: { recent: [], ranking: [] },
  alerts: [],
  policies: [],
  settings: {}
};

function fmtBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes || 0);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function fmtBps(bps) {
  return `${fmtBytes(Number(bps || 0) / 8)}/s`;
}

async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} failed`);
  return response.json();
}

function table(elementId, headers, rows) {
  document.getElementById(elementId).innerHTML = [
    `<thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>`,
    `<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>`
  ].join("");
}

function render() {
  document.getElementById("metric-devices").textContent = state.devices.length;
  document.getElementById("metric-down").textContent = fmtBps(state.traffic.totalDownBps);
  document.getElementById("metric-up").textContent = fmtBps(state.traffic.totalUpBps);
  document.getElementById("metric-alerts").textContent = state.alerts.length;

  document.getElementById("top-devices").innerHTML = state.traffic.devices.slice(0, 6).map((device) => {
    const profile = state.devices.find((item) => item.id === device.deviceId);
    return `<div class="item"><span>${profile?.hostname || device.deviceId}</span><strong>${fmtBytes(device.downloadBytes + device.uploadBytes)}</strong></div>`;
  }).join("");

  document.getElementById("recent-alerts").innerHTML = state.alerts.slice(0, 6).map((alert) => (
    `<div class="item"><span>${alert.type} - ${alert.target}</span><strong class="risk-${alert.severity}">${alert.severity}</strong></div>`
  )).join("");

  table("devices-table", ["主机名", "IP", "MAC", "厂商", "分组", "状态"], state.devices.map((device) => [
    device.hostname, device.ip, device.mac, device.vendor, device.group, device.online ? "在线" : "离线"
  ]));

  table("traffic-table", ["设备", "下载", "上传", "连接", "活跃目标"], state.traffic.devices.map((device) => {
    const profile = state.devices.find((item) => item.id === device.deviceId);
    const target = device.activeTargets[0] ? `${device.activeTargets[0].ip}:${device.activeTargets[0].port}/${device.activeTargets[0].protocol}` : "";
    return [profile?.hostname || device.deviceId, fmtBytes(device.downloadBytes), fmtBytes(device.uploadBytes), device.connections, target];
  }));

  document.getElementById("dns-ranking").innerHTML = state.dns.ranking.map((item) => (
    `<div class="item"><span>${item.domain}</span><strong>${item.count}</strong></div>`
  )).join("");

  table("dns-table", ["设备", "域名", "解析 IP", "动作"], state.dns.recent.slice(0, 20).map((query) => [
    query.deviceId, query.domain, (query.resolvedIps || []).join(" "), query.action
  ]));

  table("alerts-table", ["等级", "类型", "设备", "目标", "证据"], state.alerts.map((alert) => [
    `<span class="risk-${alert.severity}">${alert.severity}</span>`, alert.type, alert.deviceId, alert.target, alert.evidence
  ]));

  table("policies-table", ["类型", "值", "限速", "状态"], state.policies.map((policy) => [
    policy.type, policy.value, policy.limitKbps ? `${policy.limitKbps} Kbps` : "", policy.enabled === false ? "禁用" : "启用"
  ]));

  document.getElementById("settings-list").innerHTML = Object.entries(state.settings)
    .filter(([key]) => key !== "gateway")
    .map(([key, value]) => `<dt>${key}</dt><dd>${Array.isArray(value) ? value.join(", ") : value}</dd>`)
    .join("");
}

async function refresh() {
  const [health, devices, traffic, dns, alerts, policies, settings] = await Promise.all([
    getJson("/api/health"),
    getJson("/api/devices"),
    getJson("/api/traffic"),
    getJson("/api/dns"),
    getJson("/api/security"),
    getJson("/api/policies"),
    getJson("/api/settings")
  ]);
  state.devices = devices;
  state.traffic = traffic;
  state.dns = dns;
  state.alerts = alerts;
  state.policies = policies;
  state.settings = settings;
  document.getElementById("mode").textContent = health.mode === "simulator" ? "模拟模式" : "网关模式";
  render();
}

document.querySelectorAll(".nav").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".section").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.section).classList.add("active");
  });
});

refresh().catch((error) => {
  document.getElementById("mode").textContent = error.message;
});
setInterval(refresh, 5000);
