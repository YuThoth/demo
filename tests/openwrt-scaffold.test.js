import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = "package/luci-app-lan-analyzer";

function read(path) {
  return readFileSync(`${root}/${path}`, "utf8");
}

test("OpenWrt LuCI package scaffold has required files", () => {
  for (const file of [
    "Makefile",
    "README.md",
    "root/etc/config/lan-analyzer",
    "root/etc/init.d/lan-analyzer",
    "root/usr/libexec/lan-analyzer/lan-analyzer.sh",
    "root/usr/share/rpcd/acl.d/luci-app-lan-analyzer.json",
    "root/usr/share/luci/menu.d/luci-app-lan-analyzer.json",
    "htdocs/luci-static/resources/view/lan-analyzer/index.js"
  ]) {
    assert.equal(existsSync(`${root}/${file}`), true, `missing ${file}`);
  }
});

test("package Makefile defines luci-app-lan-analyzer metadata", () => {
  const makefile = read("Makefile");
  assert.match(makefile, /PKG_NAME:=luci-app-lan-analyzer/);
  assert.match(makefile, /LUCI_TITLE:=LAN Analyzer/);
  assert.match(makefile, /LUCI_DEPENDS:=\+luci-base \+rpcd \+jsonfilter \+conntrack/);
});

test("LuCI menu and view expose LAN analyzer sections", () => {
  const menu = read("root/usr/share/luci/menu.d/luci-app-lan-analyzer.json");
  const view = read("htdocs/luci-static/resources/view/lan-analyzer/index.js");
  assert.match(menu, /services\/lan-analyzer/);
  assert.match(menu, /局域网流量分析/);
  for (const label of ["仪表盘", "系统信息", "设备", "流量", "域名", "安全", "策略", "报表", "设置"]) {
    assert.ok(view.includes(label), `missing ${label}`);
  }
});

test("backend exposes status devices traffic dns alerts policies and report commands", () => {
  const backend = read("root/usr/libexec/lan-analyzer/lan-analyzer.sh");
  for (const command of ["status", "devices", "traffic", "dns", "alerts", "policies", "report"]) {
    assert.match(backend, new RegExp(`\"${command}\"\\)`), `missing ${command} command`);
  }
  assert.match(backend, /\/tmp\/dhcp\.leases/);
  assert.match(backend, /conntrack/);
});

