const { search } = require("../es");
const { toMillis, serviceName, serviceFilter } = require("../util");

const INDEX = "logs-*";

async function searchLogs({ service, q, traceId, spanId, limit = 100 } = {}) {
  const filter = serviceFilter(service);
  if (traceId) filter.push({ term: { trace_id: traceId } });
  if (spanId) filter.push({ term: { span_id: spanId } });
  const must = q ? [{ match: { "body.text": q } }] : [];
  const body = {
    size: limit,
    sort: [{ "@timestamp": "desc" }],
    query: { bool: { filter, must } },
  };
  const result = await search(INDEX, body);
  return result.hits.hits.map((h) => h._source).map((l) => ({
    timestamp: toMillis(l["@timestamp"]),
    severity: l.severity_text || "",
    service: serviceName(l),
    body: l.body?.text || "",
    traceId: l.trace_id || null,
    spanId: l.span_id || null,
    attributes: l.attributes || {},
  }));
}

module.exports = { searchLogs };
