include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-lan-analyzer
PKG_VERSION:=0.1.0
PKG_RELEASE:=1

LUCI_TITLE:=LAN Analyzer
LUCI_DEPENDS:=+luci-base +rpcd +jsonfilter +conntrack +iptables-nft +kmod-sched-core +tc-full +dnsmasq
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
