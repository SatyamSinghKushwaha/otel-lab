const { getTrace } = require("./traces");

// Nests one trace's spans into a call tree by parent_span_id -- this is our
// take on Cavisson's Method Calling Tree (there: PrimeNG TreeTable fed by
// their own DDR request service; here: the same free PrimeNG TreeTable fed
// by this endpoint instead).
async function getCallTree(traceId) {
  const spans = await getTrace(traceId);
  const bySpanId = new Map(spans.map((s) => [s.spanId, { ...s, children: [] }]));

  const roots = [];
  for (const node of bySpanId.values()) {
    const parent = node.parentSpanId && bySpanId.get(node.parentSpanId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

module.exports = { getCallTree };
