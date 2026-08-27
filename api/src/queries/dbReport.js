const { fetchRawSpans } = require("./traces");

// Groups DB-client spans (identified by the standard OTel db.* semantic
// convention attributes) by statement, reporting call count and min/max/avg
// duration -- our take on Cavisson's DB report.
async function getDbReport({ service, windowMinutes = 60, limit = 5000 } = {}) {
  const spans = await fetchRawSpans({ service, windowMinutes, limit });
  const dbSpans = spans.filter((s) => s.attributes["db.system"] || s.attributes["db.statement"]);

  const byQuery = new Map();
  for (const s of dbSpans) {
    const key = s.attributes["db.statement"] || `${s.attributes["db.system"] || "db"}: ${s.name}`;
    if (!byQuery.has(key)) {
      byQuery.set(key, {
        query: key,
        dbSystem: s.attributes["db.system"] || null,
        count: 0,
        minMs: Infinity,
        maxMs: 0,
        totalMs: 0,
      });
    }
    const row = byQuery.get(key);
    row.count += 1;
    row.minMs = Math.min(row.minMs, s.durationMs);
    row.maxMs = Math.max(row.maxMs, s.durationMs);
    row.totalMs += s.durationMs;
  }

  return [...byQuery.values()]
    .map((row) => ({
      query: row.query,
      dbSystem: row.dbSystem,
      count: row.count,
      minMs: +row.minMs.toFixed(2),
      maxMs: +row.maxMs.toFixed(2),
      avgMs: +(row.totalMs / row.count).toFixed(2),
    }))
    .sort((a, b) => b.count - a.count);
}

module.exports = { getDbReport };
