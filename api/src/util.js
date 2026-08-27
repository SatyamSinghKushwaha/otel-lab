// @timestamp comes back as a plain number (ms) from metrics docs, and as a
// numeric-looking string (e.g. "1735000000000.718") from traces/logs docs.
function toMillis(value) {
  return Math.round(parseFloat(value));
}

function nanosToMs(nanos) {
  return nanos == null ? null : +(nanos / 1e6).toFixed(2);
}

function serviceName(doc) {
  return doc?.resource?.attributes?.["service.name"] || "unknown";
}

function serviceFilter(service) {
  return service ? [{ term: { "resource.attributes.service.name": service } }] : [];
}

// Self time = a span's own duration minus time spent in its direct children.
// Takes [{ spanId, parentSpanId, durationMs }] and returns Map(spanId -> selfTimeMs).
function computeSelfTime(spans) {
  const childDurationSum = new Map();
  for (const s of spans) {
    if (!s.parentSpanId) continue;
    childDurationSum.set(s.parentSpanId, (childDurationSum.get(s.parentSpanId) || 0) + s.durationMs);
  }
  const selfTime = new Map();
  for (const s of spans) {
    const childTime = childDurationSum.get(s.spanId) || 0;
    selfTime.set(s.spanId, Math.max(0, s.durationMs - childTime));
  }
  return selfTime;
}

module.exports = { toMillis, nanosToMs, serviceName, serviceFilter, computeSelfTime };
