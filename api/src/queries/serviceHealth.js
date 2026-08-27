const { search } = require("../es");
const { nanosToMs } = require("../util");

const INDEX = "traces-*";

// Per-service request rate / error rate / latency percentiles over a trailing
// time window. Computed as a single Elasticsearch aggregation (terms by
// service, with percentiles + an error-count sub-agg) rather than pulling raw
// spans and reducing in JS -- the report is a query, not a client-side loop.
//
// This is our take on the kind of per-service timing report Cavisson's own
// diagnostics layer (DDR) produces from its stored transaction data -- same
// shape of report (one row per service: volume, errors, latency), reimplemented
// here from scratch against our own span documents.
async function getServiceHealth({ windowMinutes = 15 } = {}) {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [{ range: { "@timestamp": { gte: `now-${windowMinutes}m` } } }],
      },
    },
    aggs: {
      by_service: {
        terms: { field: "resource.attributes.service.name", size: 50 },
        aggs: {
          latency_percentiles: { percentiles: { field: "duration", percents: [50, 95, 99] } },
          errors: { filter: { term: { "status.code": "Error" } } },
        },
      },
    },
  };
  const result = await search(INDEX, body);
  const buckets = result.aggregations?.by_service?.buckets || [];

  return buckets
    .map((b) => {
      const total = b.doc_count;
      const errorCount = b.errors.doc_count;
      const pct = b.latency_percentiles.values;
      return {
        service: b.key,
        requestCount: total,
        requestsPerMin: +(total / windowMinutes).toFixed(2),
        errorRate: total ? +((errorCount / total) * 100).toFixed(2) : 0,
        p50Ms: nanosToMs(pct["50.0"]),
        p95Ms: nanosToMs(pct["95.0"]),
        p99Ms: nanosToMs(pct["99.0"]),
      };
    })
    .sort((a, b) => b.requestCount - a.requestCount);
}

module.exports = { getServiceHealth };
