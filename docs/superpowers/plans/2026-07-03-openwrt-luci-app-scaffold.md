# OpenWrt LuCI App Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a first `luci-app-lan-analyzer` OpenWrt package skeleton that can be copied into an OpenWrt feeds/package tree.

**Architecture:** Add a LuCI JavaScript application package with UCI config, init.d service, rpcd ACL, menu entry, view, and a lightweight shell backend script. Keep real nftables/tc/conntrack enforcement as explicit commands and status surfaces for later replacement by the Go daemon.

**Tech Stack:** OpenWrt package Makefile, LuCI JS form/view modules, UCI config, procd init script, POSIX shell backend, Node test runner for repository-level structure tests.

## Global Constraints

- Do not implement HTTPS decryption, credential capture, chat-content viewing, webpage-body capture, or stealth interception.
- Target OpenWrt x86_64 first.
- The package name is `luci-app-lan-analyzer`.
- The LuCI menu entry is `服务 -> 局域网流量分析`.
- First scaffold must expose pages for dashboard/system/devices/traffic/dns/security/policies/reports/settings.
- Real traffic enforcement must remain clearly separated behind backend script interfaces.

---

## Task 1: Scaffold Tests

**Files:**
- Create: `tests/openwrt-scaffold.test.js`

**Interfaces:**
- Produces structure checks for `package/luci-app-lan-analyzer`.

- [ ] Write tests that require package Makefile, UCI config, init.d script, ACL, menu entry, LuCI view, and backend script.
- [ ] Run `node --test tests/openwrt-scaffold.test.js` and verify it fails because package files are missing.

## Task 2: Package Skeleton

**Files:**
- Create: `package/luci-app-lan-analyzer/Makefile`
- Create: `package/luci-app-lan-analyzer/root/etc/config/lan-analyzer`
- Create: `package/luci-app-lan-analyzer/root/etc/init.d/lan-analyzer`
- Create: `package/luci-app-lan-analyzer/root/usr/libexec/lan-analyzer/lan-analyzer.sh`
- Create: `package/luci-app-lan-analyzer/root/usr/share/rpcd/acl.d/luci-app-lan-analyzer.json`
- Create: `package/luci-app-lan-analyzer/root/usr/share/luci/menu.d/luci-app-lan-analyzer.json`
- Create: `package/luci-app-lan-analyzer/htdocs/luci-static/resources/view/lan-analyzer/index.js`
- Create: `package/luci-app-lan-analyzer/README.md`

**Interfaces:**
- Produces OpenWrt package source that installs a LuCI app and backend shell command.

- [ ] Implement the package files.
- [ ] Run `node --test tests/openwrt-scaffold.test.js` and verify it passes.
- [ ] Run full `npm test`.
- [ ] Commit and push.

