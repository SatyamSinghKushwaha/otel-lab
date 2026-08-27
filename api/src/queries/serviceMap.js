const { fetchRawSpans } = require("./traces");

// Service dependency map: nodes = services, edges = cross-service parent/child
// span pairs (caller -> callee), with call count + avg latency per edge.
//
// This has to be built from an *unfiltered* span batch -- to know a span's
// caller's service, we need that caller's document too, and it likely belongs
// to a different service.name than the one the caller asked to focus on. The
// requested `service` is only applied as a post-filter on the resulting graph
// (keep nodes/edges touching it), not on the initial Elasticsearch query.
async function getServiceMap({ service, windowMinutes = 60, limit = 5000 } = {}) {
  const spans = await fetchRawSpans({ windowMinutes, limit });
  const byId = new Map(spans.map((s) => [s.spanId, s]));

  const nodeCounts = new Map();
  const edges = new Map();

  for (const s of spans) {
    nodeCounts.set(s.service, (nodeCounts.get(s.service) || 0) + 1);
    const parent = s.parentSpanId && byId.get(s.parentSpanId);
    if (!parent || parent.service === s.service) continue;
    const key = `${parent.service}=>${s.service}`;
    if (!edges.has(key)) edges.set(key, { from: parent.service, to: s.service, count: 0, totalMs: 0 });
    const e = edges.get(key);
    e.count += 1;
    e.totalMs += s.durationMs;
  }

  let nodes = [...nodeCounts.entries()].map(([name, spanCount]) => ({ service: name, spanCount }));
  let edgeList = [...edges.values()].map((e) => ({
    from: e.from,
    to: e.to,
    count: e.count,
    avgDurationMs: +(e.totalMs / e.count).toFixed(2),
  }));

  if (service) {
    const touching = new Set([service]);
    for (const e of edgeList) {
      if (e.from === service) touching.add(e.to);
      if (e.to === service) touching.add(e.from);
    }
    nodes = nodes.filter((n) => touching.has(n.service));
    edgeList = edgeList.filter((e) => e.from === service || e.to === service);
  }

  return { nodes, edges: edgeList };
}

module.exports = { getServiceMap };
