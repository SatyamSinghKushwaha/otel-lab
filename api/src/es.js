const ES_URL = process.env.ES_URL || "http://localhost:9200";

async function esFetch(path, options = {}) {
  const res = await fetch(`${ES_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.reason || body?.error?.type || res.statusText;
    throw new Error(`Elasticsearch ${path} -> ${res.status}: ${reason}`);
  }
  return body;
}

function search(index, query) {
  return esFetch(`/${index}/_search`, { method: "POST", body: JSON.stringify(query) });
}

function fieldCaps(index, fields) {
  return esFetch(`/${index}/_field_caps?fields=${encodeURIComponent(fields)}`, { method: "GET" });
}

module.exports = { esFetch, search, fieldCaps };
