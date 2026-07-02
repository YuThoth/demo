function normalizedDomain(domain) {
  return String(domain || "").trim().toLowerCase();
}

export function recordDnsQuery(state, query) {
  state.dnsQueries ??= [];
  const record = {
    id: `dns-${state.dnsQueries.length + 1}`,
    action: evaluateDomainPolicy(state, query.domain),
    ...query,
    domain: normalizedDomain(query.domain)
  };
  state.dnsQueries.push(record);
  return record;
}

export function rankDomains(state, limit = 10) {
  const counts = new Map();
  for (const query of state.dnsQueries ?? []) {
    counts.set(query.domain, (counts.get(query.domain) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, limit);
}

export function evaluateDomainPolicy(state, domain) {
  const value = normalizedDomain(domain);
  const policies = (state.policies ?? []).filter((policy) => policy.enabled !== false);
  if (policies.some((policy) => policy.type === "domain-allow" && normalizedDomain(policy.value) === value)) return "allow";
  if (policies.some((policy) => policy.type === "domain-block" && normalizedDomain(policy.value) === value)) return "block";
  return "allow";
}
