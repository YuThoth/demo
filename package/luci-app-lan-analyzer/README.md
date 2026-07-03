# luci-app-lan-analyzer

OpenWrt x86_64 LuCI plugin scaffold for LAN traffic analysis and policy control.

## Features in this scaffold

- LuCI menu entry: `Services -> LAN Analyzer`
- Dashboard, system info, devices, traffic, DNS, security, policy, report, and settings sections
- UCI config at `/etc/config/lan-analyzer`
- procd service at `/etc/init.d/lan-analyzer`
- rpcd ACL for LuCI access
- Backend shell command at `/usr/libexec/lan-analyzer/lan-analyzer.sh`

## Build

Copy `package/luci-app-lan-analyzer` into an OpenWrt source tree or feed, then run:

```sh
make menuconfig
make package/luci-app-lan-analyzer/compile V=s
```

## Runtime

```sh
/etc/init.d/lan-analyzer enable
/etc/init.d/lan-analyzer start
```

The current backend provides lightweight live data from DHCP leases, `ip neigh`,
`conntrack`, and DNS logs when available. Real nftables counters, tc shaping,
and dnsmasq enforcement are the next integration layer.

This plugin does not decrypt HTTPS and does not inspect private message or page content.
