#!/bin/sh

LEASES=/tmp/dhcp.leases
REPORT_DIR=/tmp/lan-analyzer

json_escape() {
	printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

status_json() {
	local uptime
	uptime="$(cut -d. -f1 /proc/uptime 2>/dev/null || echo 0)"
	printf '{"mode":"openwrt","service":{"status":"running","uptimeSeconds":%s},"system":{"hostname":"%s","kernel":"%s","arch":"%s"},"network":{"lanInterface":"%s"},"counts":{"devices":%s,"connections":%s}}\n' \
		"$uptime" \
		"$(json_escape "$(uci -q get system.@system[0].hostname || hostname)")" \
		"$(json_escape "$(uname -r)")" \
		"$(json_escape "$(uname -m)")" \
		"$(json_escape "$(uci -q get lan-analyzer.main.interface || echo lan)")" \
		"$(device_count)" \
		"$(connection_count)"
}

device_count() {
	[ -f "$LEASES" ] && wc -l < "$LEASES" | tr -d ' ' || echo 0
}

connection_count() {
	conntrack -L 2>/dev/null | wc -l | tr -d ' '
}

devices_json() {
	printf '['
	local first=1
	if [ -f "$LEASES" ]; then
		while read -r expires mac ip hostname clientid; do
			[ -n "$ip" ] || continue
			[ "$first" -eq 1 ] || printf ','
			first=0
			printf '{"ip":"%s","mac":"%s","hostname":"%s","clientId":"%s","online":true}' \
				"$(json_escape "$ip")" \
				"$(json_escape "$mac")" \
				"$(json_escape "${hostname:--}")" \
				"$(json_escape "${clientid:-}")"
		done < "$LEASES"
	fi
	printf ']\n'
}

traffic_json() {
	local rx tx iface
	iface="$(uci -q get lan-analyzer.main.interface || echo br-lan)"
	rx="$(cat "/sys/class/net/$iface/statistics/rx_bytes" 2>/dev/null || echo 0)"
	tx="$(cat "/sys/class/net/$iface/statistics/tx_bytes" 2>/dev/null || echo 0)"
	printf '{"interface":"%s","rxBytes":%s,"txBytes":%s,"connections":%s}\n' \
		"$(json_escape "$iface")" "$rx" "$tx" "$(connection_count)"
}

dns_json() {
	printf '['
	local log="/tmp/dnsmasq.log"
	[ -f "$log" ] || log="/var/log/dnsmasq.log"
	if [ -f "$log" ]; then
		awk '/query\\[[A-Z]+\\]/ {print $0}' "$log" | tail -n 50 | while read -r line; do
			domain="$(printf '%s\n' "$line" | awk '{print $6}')"
			src="$(printf '%s\n' "$line" | awk '{print $8}')"
			[ -n "$domain" ] || continue
			[ "${first_dns:-1}" = 1 ] || printf ','
			first_dns=0
			printf '{"domain":"%s","source":"%s","action":"allow"}' "$(json_escape "$domain")" "$(json_escape "$src")"
		done
	fi
	printf ']\n'
}

alerts_json() {
	local connections
	connections="$(connection_count)"
	if [ "$connections" -gt 1000 ] 2>/dev/null; then
		printf '[{"severity":"high","type":"high-connections","target":"conntrack","evidence":"%s active connections"}]\n' "$connections"
	else
		printf '[]\n'
	fi
}

policies_json() {
	printf '['
	local first=1
	uci -q show lan-analyzer | grep '=rule' | cut -d. -f2 | cut -d= -f1 | while read -r section; do
		[ -n "$section" ] || continue
		type="$(uci -q get "lan-analyzer.$section.type")"
		value="$(uci -q get "lan-analyzer.$section.value")"
		enabled="$(uci -q get "lan-analyzer.$section.enabled")"
		[ "$first" -eq 1 ] || printf ','
		first=0
		printf '{"section":"%s","type":"%s","value":"%s","enabled":%s}' \
			"$(json_escape "$section")" \
			"$(json_escape "$type")" \
			"$(json_escape "$value")" \
			"${enabled:-1}"
	done
	printf ']\n'
}

report_csv() {
	mkdir -p "$REPORT_DIR"
	local file="$REPORT_DIR/traffic.csv"
	{
		echo "hostname,ip,mac,online"
		if [ -f "$LEASES" ]; then
			while read -r expires mac ip hostname clientid; do
				[ -n "$ip" ] || continue
				printf '%s,%s,%s,true\n' "${hostname:--}" "$ip" "$mac"
			done < "$LEASES"
		fi
	} > "$file"
	cat "$file"
}

daemon_loop() {
	mkdir -p "$REPORT_DIR"
	while true; do
		status_json > "$REPORT_DIR/status.json"
		sleep "$(uci -q get lan-analyzer.main.sample_interval || echo 5)"
	done
}

case "$1" in
	"status") status_json ;;
	"devices") devices_json ;;
	"traffic") traffic_json ;;
	"dns") dns_json ;;
	"alerts") alerts_json ;;
	"policies") policies_json ;;
	"report") report_csv ;;
	"daemon") daemon_loop ;;
	*) printf '{"error":"unknown command"}\n'; exit 1 ;;
esac

