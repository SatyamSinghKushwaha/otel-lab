const { fetchRawSpans } = require("./traces");
const { computeSelfTime } = require("../util");

// Groups spans by name (our stand-in for Cavisson's package/class/method --
// generic OTel spans don't carry bytecode-level method identity, just
// whatever name the instrumentation gave the span) and reports self time,
// the metric that actually shows where time is spent independent of what a
// span's children did.
async function getMethodTiming({ service, windowMinutes = 60, limit = 5000 } = {}) {
  const spans = await fetchRawSpans({ service, windowMinutes, limit });
  const selfTime = computeSelfTime(spans);

  const byName = new Map();
  let totalSelfTime = 0;
  for (const s of spans) {
    const t = selfTime.get(s.spanId) || 0;
    totalSelfTime += t;
    if (!byName.has(s.name)) byName.set(s.name, { name: s.name, count: 0, selfTimeMs: 0 });
    const row = byName.get(s.name);
    row.count += 1;
    row.selfTimeMs += t;
  }

  return [...byName.values()]
    .map((row) => ({
      name: row.name,
      count: row.count,
      avgSelfTimeMs: +(row.selfTimeMs / row.count).toFixed(2),
      totalSelfTimeMs: +row.selfTimeMs.toFixed(2),
      percentOfTotal: totalSelfTime ? +((row.selfTimeMs / totalSelfTime) * 100).toFixed(2) : 0,
    }))
    .sort((a, b) => b.totalSelfTimeMs - a.totalSelfTimeMs);
}

module.exports = { getMethodTiming };
