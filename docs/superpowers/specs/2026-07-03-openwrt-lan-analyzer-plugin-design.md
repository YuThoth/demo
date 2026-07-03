# OpenWrt 局域网流量分析插件设计

## 目标

将现有 Windows 模拟版流量分析工具重构为 OpenWrt x86_64 插件。插件在 OpenWrt 的 LuCI 管理后台中运行，提供局域网设备识别、流量统计、域名/IP/端口/协议分析、安全告警、策略管控和报表导出。

插件用于合法网络管理和安全运维，不做 HTTPS 解密，不查看聊天内容、网页正文、账号密码或其他私人内容。

## 产品形态

第一版交付为 OpenWrt 包源码，面向 x86_64 OpenWrt。

包结构：

```text
luci-app-lan-analyzer/
  Makefile
  root/etc/config/lan-analyzer
  root/etc/init.d/lan-analyzer
  root/usr/libexec/lan-analyzer/lan-analyzerd
  root/usr/share/rpcd/acl.d/luci-app-lan-analyzer.json
  htdocs/luci-static/resources/view/lan-analyzer/*.js
  luasrc/controller/lan_analyzer.lua

lan-analyzerd/
  Go 后台服务源码
```

LuCI 菜单位置：

```text
服务 -> 局域网流量分析
```

## 架构

```text
LuCI 前端页面
  -> rpcd / ubus API
  -> lan-analyzerd Go 后台服务
  -> conntrack / nftables / tc / dnsmasq / arp / DHCP lease
  -> 本地状态与报表数据
```

核心组件：

- `luci-app-lan-analyzer`：OpenWrt LuCI 插件界面。
- `lan-analyzerd`：Go 后台服务，负责采集、聚合、告警和策略下发。
- `/etc/config/lan-analyzer`：UCI 配置。
- `/etc/init.d/lan-analyzer`：服务启动脚本。
- `rpcd/ubus`：LuCI 与后台服务通信。
- `nftables`：黑白名单、IP/端口阻断和计数。
- `tc`：单设备和分组限速。
- `dnsmasq`：DNS 查询记录、域名黑白名单和 DNS 管控。
- `conntrack`：当前连接、目标 IP、端口和协议统计。

## 页面

### 仪表盘

- 在线设备数。
- 当前总上行/下行速率。
- 当前连接数。
- 今日总流量。
- 安全告警数量。
- Top 设备流量排行。
- 最近告警。

### 设备管理

- 展示 IP、MAC、主机名、厂商、接口、在线状态。
- 支持设备备注和分组。
- 支持快捷操作：限速、拉黑、加入白名单。

### 实时流量

- 每设备上行/下行速率。
- 今日/本月总流量。
- 当前连接数。
- 活跃目标 IP、端口、协议。

### 域名分析

- 基于 dnsmasq 日志统计 DNS 查询。
- 展示设备、域名、解析 IP、时间、动作。
- 域名排行。
- 域名黑名单和白名单。

### 连接分析

- 基于 conntrack 统计当前连接。
- 展示源设备、目标 IP、目标端口、协议、状态。
- 目标国家/地区使用轻量离线 IP 库或可选模块。

### 安全告警

- 端口扫描。
- 异常连接数。
- P2P 端口行为。
- 挖矿域名/IP。
- 恶意 IP 命中。
- 支持确认、忽略、拉黑、限速。

### 策略管理

- 单设备限速。
- 分组限速。
- IP 黑名单/白名单。
- 域名黑名单/白名单。
- 端口封禁。
- 时间段上网控制。
- DNS 上游配置。

### 报表导出

- 用户流量排行。
- 域名排行。
- 协议/端口排行。
- 国家/地区排行。
- 告警报表。
- 支持 CSV 导出。

### 设置

- 启用/停用服务。
- 选择 LAN 接口。
- 配置采样间隔。
- 配置数据保留天数。
- 配置规则库。
- 配置是否启用 DNS 日志。
- 配置是否启用限速与阻断策略。

## 数据来源

设备来源：

- `/tmp/dhcp.leases`
- `ip neigh`
- ARP 表
- 可选：odhcpd lease

流量来源：

- nftables per-host counters
- conntrack 连接表
- 接口统计

域名来源：

- dnsmasq 查询日志
- dnsmasq lease
- 可选：dnsmasq ipset/nftset

策略执行：

- nftables set 管理 IP/端口阻断。
- dnsmasq 配置域名阻断。
- tc qdisc/class/filter 做限速。
- UCI 保存持久化配置。

## 后台服务

`lan-analyzerd` 使用 Go 编写，原因：

- x86_64 OpenWrt 运行性能足够。
- 单二进制部署简单。
- 比 shell 更适合持续采集和聚合。
- 后续可扩展规则库和报表。

服务职责：

- 周期性读取设备、连接、DNS、计数器。
- 聚合实时速率和历史流量。
- 运行安全检测规则。
- 通过 ubus 暴露状态和操作接口。
- 根据 UCI 配置生成并应用 nftables/tc/dnsmasq 策略。

## API

LuCI 页面通过 ubus 调用后台服务：

```text
lan_analyzer.status
lan_analyzer.devices
lan_analyzer.traffic
lan_analyzer.dns
lan_analyzer.connections
lan_analyzer.alerts
lan_analyzer.policies
lan_analyzer.apply_policy
lan_analyzer.export_report
lan_analyzer.settings
```

## 第一版范围

第一版必须做出真实 OpenWrt 插件骨架和可运行页面：

- LuCI 菜单与页面。
- UCI 配置文件。
- init.d 服务。
- 后台服务接口。
- 设备列表。
- 模拟或轻量真实采集的流量摘要。
- DNS 记录页面。
- 告警页面。
- 策略页面。
- CSV 报表导出。
- x86_64 构建说明。

第一版可以先用轻量采集和模拟数据补齐界面，但必须保留真实 nftables/tc/dnsmasq/conntrack 适配层接口。

## 第二版范围

- 接入真实 nftables 计数。
- 接入真实 tc 限速。
- 接入真实 dnsmasq 域名阻断。
- 接入 conntrack 连接分析。
- 完成安全规则库。
- 在 x86_64 OpenWrt 上做端到端测试。

## 合规边界

插件只处理网络元数据：

- 设备。
- IP。
- MAC。
- 域名。
- 端口。
- 协议。
- 流量。
- 连接行为。
- 风险规则命中。

插件不处理：

- HTTPS 解密。
- 聊天内容。
- 网页正文。
- 账号密码。
- 隐蔽监听或绕过用户授权的内容查看。

## 验收标准

- OpenWrt x86_64 构建环境中可以编译包。
- 插件安装后 LuCI 菜单可见。
- `/etc/init.d/lan-analyzer start` 可启动后台服务。
- 页面可读取状态、设备、流量、DNS、告警和策略。
- CSV 报表可下载。
- 禁用服务后不会修改 nftables/tc/dnsmasq 规则。
- 开启策略后，生成的规则可回滚。
- 所有核心逻辑有本地单元测试。

