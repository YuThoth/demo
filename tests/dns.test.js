import test from "node:test";
import assert from "node:assert/strict";
import { recordDnsQuery, rankDomains, evaluateDomainPolicy } from "../src/domain/dns.js";

test("DNS records are ranked and blocked by blacklist", () => {
  const state = { dnsQueries: [], policies: [{ type: "domain-block", value: "bad.example", enabled: true }] };
  recordDnsQuery(state, { deviceId: "d1", domain: "bad.example", resolvedIps: ["203.0.113.9"], timestamp: 1000 });
  recordDnsQuery(state, { deviceId: "d2", domain: "good.example", resolvedIps: ["198.51.100.2"], timestamp: 1001 });
  recordDnsQuery(state, { deviceId: "d1", domain: "bad.example", resolvedIps: ["203.0.113.9"], timestamp: 1002 });
  assert.deepEqual(rankDomains(state, 1), [{ domain: "bad.example", count: 2 }]);
  assert.equal(evaluateDomainPolicy(state, "bad.example"), "block");
  assert.equal(evaluateDomainPolicy(state, "good.example"), "allow");
});
