'use strict';
'require view';
'require fs';
'require ui';
'require poll';
'require uci';

const helper = '/usr/libexec/lan-analyzer/lan-analyzer.sh';

function parseJson(text, fallback) {
	try {
		return JSON.parse(text || '');
	} catch (e) {
		return fallback;
	}
}

function call(command, fallback) {
	return fs.exec_direct(helper, [ command ]).then(function(text) {
		return parseJson(text, fallback);
	}).catch(function(error) {
		return fallback;
	});
}

function card(title, body) {
	const node = E('div', { 'class': 'cbi-section lan-analyzer-card' }, [
		E('h3', title),
		body
	]);
	return node;
}

function table(headers, rows) {
	return E('table', { 'class': 'table' }, [
		E('tr', headers.map(function(header) {
			return E('th', header);
		})),
		...(rows.length ? rows : [[ '-' ]]).map(function(row) {
			return E('tr', row.map(function(cell) {
				return E('td', cell == null ? '' : String(cell));
			}));
		})
	]);
}

function renderSystem(status) {
	return table([ '项目', '值' ], [
		[ '运行模式', status.mode || 'openwrt' ],
		[ '服务状态', status.service && status.service.status || 'unknown' ],
		[ '运行时长', status.service && status.service.uptimeSeconds || 0 ],
		[ '主机名', status.system && status.system.hostname || '-' ],
		[ '内核', status.system && status.system.kernel || '-' ],
		[ '架构', status.system && status.system.arch || '-' ],
		[ 'LAN 接口', status.network && status.network.lanInterface || '-' ]
	]);
}

function renderDashboard(status, traffic) {
	return E('div', {}, [
		table([ '指标', '值' ], [
			[ '设备数', status.counts && status.counts.devices || 0 ],
			[ '连接数', status.counts && status.counts.connections || 0 ],
			[ '接口 RX', traffic.rxBytes || 0 ],
			[ '接口 TX', traffic.txBytes || 0 ]
		])
	]);
}

function renderView(data) {
	return E('div', { 'class': 'lan-analyzer' }, [
		E('style', `
			.lan-analyzer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
			.lan-analyzer-card{border-radius:8px}
			.lan-analyzer h2{margin-top:0}
		`),
		E('h2', '局域网流量分析'),
		E('p', { 'class': 'cbi-section-descr' }, '合法网络管理插件：统计设备、流量、域名、连接和告警，不解密 HTTPS 内容。'),
		E('div', { 'class': 'lan-analyzer-grid' }, [
			card('仪表盘', renderDashboard(data.status, data.traffic)),
			card('系统信息', renderSystem(data.status)),
			card('设备', table([ '主机名', 'IP', 'MAC', '在线' ], data.devices.map(function(device) {
				return [ device.hostname, device.ip, device.mac, device.online ? '是' : '否' ];
			}))),
			card('流量', table([ '接口', 'RX Bytes', 'TX Bytes', '连接数' ], [[ data.traffic.interface, data.traffic.rxBytes, data.traffic.txBytes, data.traffic.connections ]])),
			card('域名', table([ '域名', '来源', '动作' ], data.dns.map(function(item) {
				return [ item.domain, item.source, item.action ];
			}))),
			card('安全', table([ '等级', '类型', '目标', '证据' ], data.alerts.map(function(alert) {
				return [ alert.severity, alert.type, alert.target, alert.evidence ];
			}))),
			card('策略', table([ '类型', '值', '启用' ], data.policies.map(function(policy) {
				return [ policy.type, policy.value, policy.enabled ? '是' : '否' ];
			}))),
			card('报表', E('button', {
				'class': 'btn cbi-button cbi-button-action',
				'click': ui.createHandlerFn(this, function() {
					return fs.exec_direct(helper, [ 'report' ]).then(function(csv) {
						ui.showModal('CSV 报表', [
							E('textarea', { 'style': 'width:100%;min-height:260px' }, csv),
							E('div', { 'class': 'right' }, [
								E('button', { 'class': 'btn', 'click': ui.hideModal }, '关闭')
							])
						]);
					});
				})
			}, '生成 CSV')),
			card('设置', E('p', '配置文件：/etc/config/lan-analyzer。下一步会加入表单化 UCI 设置。'))
		])
	]);
}

return view.extend({
	load: function() {
		return Promise.all([
			call('status', {}),
			call('devices', []),
			call('traffic', {}),
			call('dns', []),
			call('alerts', []),
			call('policies', [])
		]);
	},

	render: function(results) {
		const data = {
			status: results[0] || {},
			devices: results[1] || [],
			traffic: results[2] || {},
			dns: results[3] || [],
			alerts: results[4] || [],
			policies: results[5] || []
		};

		poll.add(L.bind(function() {
			return this.load().then(L.bind(function(next) {
				const root = document.querySelector('.lan-analyzer');
				if (root)
					root.replaceWith(renderView({
						status: next[0] || {},
						devices: next[1] || [],
						traffic: next[2] || {},
						dns: next[3] || [],
						alerts: next[4] || [],
						policies: next[5] || []
					}));
			}, this));
		}, this), 5);

		return renderView(data);
	}
});

