const { search, fieldCaps } = require("../es");
const { toMillis, serviceName, serviceFilter } = require("../util");

const INDEX = "metrics-*";

// Metric names are dynamic fields (metrics.<name>), so field_caps is the only
// way to discover them -- and it returns the intermediate "object" container
// paths alongside real leaf fields, so those have to be filtered out.
async function listMetricNames() {
  const caps = await fieldCaps(INDEX, "metrics.*");
  return Object.entries(caps.fields || {})
    .filter(([f, types]) => f.startsWith("metrics.") && !("object" in types))
    .map(([f]) => f.slice("metrics.".length))
    .sort();
}

async function getMetricSeries({ name, service, limit = 500 }) {
  const filter = [{ exists: { field: `metrics.${name}` } }, ...serviceFilter(service)];
  const body = {
    size: limit,
    sort: [{ "@timestamp": "asc" }],
    _source: ["@timestamp", `metrics.${name}`, "resource.attributes.service.name", "attributes"],
    query: { bool: { filter } },
  };
  const result = await search(INDEX, body);
  return result.hits.hits.map((h) => h._source).map((m) => ({
    timestamp: toMillis(m["@timestamp"]),
    value: m.metrics?.[name],
    service: serviceName(m),
    attributes: m.attributes || {},
  }));
}

module.exports = { listMetricNames, getMetricSeries };
