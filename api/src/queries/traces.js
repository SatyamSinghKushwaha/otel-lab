const { search } = require("../es");
const { toMillis, serviceName, serviceFilter, computeSelfTime } = require("../util");

const INDEX = "traces-*";

// Recent traces, grouped client-side from their spans (ES has no native
// "group spans into traces" op -- each span is its own document).
async function listRecentTraces({ service, limit = 50 } = {}) {
  const body = {
    size: 2000,
    sort: [{ "@timestamp": "desc" }],
    query: { bool: { filter: serviceFilter(service) } },
  };
  const result = await search(INDEX, body);
  const spans = result.hits.hits.map((h) => h._source);

  const traces = new Map();
  for (const span of spans) {
    const id = span.trace_id;
    if (!id) continue;
    const start = toMillis(span["@timestamp"]);
    const durationMs = (span.duration || 0) / 1e6;
    const end = start + durationMs;
    if (!traces.has(id)) {
      traces.set(id, {
        traceId: id,
        service: serviceName(span),
        rootName: span.name,
        startTime: start,
        endTime: end,
        spanCount: 0,
        hasError: false,
      });
    }
    const t = traces.get(id);
    t.spanCount += 1;
    if (start < t.startTime) {
      t.startTime = start;
      t.rootName = span.name;
      t.service = serviceName(span);
    }
    if (end > t.endTime) t.endTime = end;
    if (span.status?.code === "Error") t.hasError = true;
  }

  return [...traces.values()]
    .map((t) => ({ ...t, durationMs: Math.max(0, t.endTime - t.startTime) }))
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit);
}

// All spans for one trace, shaped for a waterfall view.
async function getTrace(traceId) {
  const body = {
    size: 1000,
    sort: [{ "@timestamp": "asc" }],
    query: { term: { trace_id: traceId } },
  };
  const result = await search(INDEX, body);
  const spans = result.hits.hits.map((h) => h._source).map((s) => ({
    spanId: s.span_id,
    parentSpanId: s.parent_span_id || null,
    name: s.name,
    kind: s.kind,
    service: serviceName(s),
    startTime: toMillis(s["@timestamp"]),
    durationMs: (s.duration || 0) / 1e6,
    status: s.status || {},
    attributes: s.attributes || {},
  }));
  const selfTime = computeSelfTime(spans);
  return spans.map((s) => ({ ...s, selfTimeMs: +selfTime.get(s.spanId).toFixed(2) }));
}

// Shared by reports that need cross-span reasoning (self time, DB grouping,
// service-to-service edges) that a plain ES aggregation can't express.
async function fetchRawSpans({ service, windowMinutes, limit = 5000 } = {}) {
  const filter = [...serviceFilter(service)];
  if (windowMinutes) filter.push({ range: { "@timestamp": { gte: `now-${windowMinutes}m` } } });
  const body = {
    size: limit,
    sort: [{ "@timestamp": "desc" }],
    query: { bool: { filter } },
  };
  const result = await search(INDEX, body);
  return result.hits.hits.map((h) => h._source).map((s) => ({
    spanId: s.span_id,
    parentSpanId: s.parent_span_id || null,
    traceId: s.trace_id,
    name: s.name,
    kind: s.kind,
    service: serviceName(s),
    startTime: toMillis(s["@timestamp"]),
    durationMs: (s.duration || 0) / 1e6,
    status: s.status || {},
    attributes: s.attributes || {},
  }));
}

module.exports = { listRecentTraces, getTrace, fetchRawSpans };
