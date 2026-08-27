const { search } = require("../es");

const INDEX_PATTERNS = ["traces-*", "logs-*", "metrics-*"];

// Distinct service.name values seen across all three signal types.
async function listServices() {
  const body = {
    size: 0,
    aggs: { services: { terms: { field: "resource.attributes.service.name", size: 100 } } },
  };
  const results = await Promise.all(INDEX_PATTERNS.map((idx) => search(idx, body).catch(() => null)));
  const names = new Set();
  for (const result of results) {
    for (const bucket of result?.aggregations?.services?.buckets || []) names.add(bucket.key);
  }
  return [...names].sort();
}

module.exports = { listServices };
