# otel-lab

A minimal, independent OpenTelemetry stack: your own **Collector**, your own
**Elasticsearch**, an **Express API**, and an **Angular + PrimeNG UI** to view
traces, metrics and logs. Nothing here talks to any existing/production
observability setup -- it's a self-contained sandbox for understanding the
flow end to end.

```
 instrumented app (OTel SDK)
        | OTLP (grpc:4317 / http:4318)
        v
 otel-collector-contrib  --(elasticsearchexporter)-->  Elasticsearch
                                                              ^
                                                              | REST queries (_search)
                                                        api (Express, :3000)
                                                              ^
                                                              | /api/* proxied by nginx
                                                        ui-angular (nginx + Angular SPA, :8080)
                                                              ^
                                                              | http:8080
                                                          your browser
```

## Run it

```bash
docker compose up -d --build
```

This starts:
- `elasticsearch` on `:9200` (security disabled, single node, dev-only)
- `otel-collector` on `:4317` (OTLP gRPC), `:4318` (OTLP HTTP), `:13133` (health)
- `api` on `:3000` (Express, JSON only -- handy for `curl`/debugging directly)
- `ui-angular` on `:8080` (nginx serving the built Angular app, proxying `/api/*` to `api`)

Wait for elasticsearch to report healthy (`docker compose ps`), then open
http://localhost:8080.

## Send it some data

Point any OTel SDK at `http://localhost:4318` (HTTP) or `localhost:4317`
(gRPC) as the OTLP endpoint and it'll show up in the UI. There is no synthetic
data generator in this repo -- data comes only from real instrumented apps.
See `agents/java/README.md` (the real OpenTelemetry Java agent jar lives in
`agents/java/`, verified against `appagents/SampleTestingApps/java/agentTestingApp`)
and `agents/node/README.md` (npm-package based setup for `nsecomm`).

## Service View

The default tab. Two levels:

1. **Overview** -- one row per service (requests, error rate, p50/p95/p99),
   computed with a single Elasticsearch percentiles aggregation
   (`api/src/queries/serviceHealth.js`). Click a row to drill in.
2. **Drilldown**, scoped to that service (`/service-view/:service`, own route):
   - **Flowpath** -- recent transactions (traces) for the service; click one
     for its span waterfall. Click any span for **MCI** (Method Call Info): a
     dialog with that span's full attributes, timing/self-time, status, and
     correlated log records (`trace_id`+`span_id` match).
   - **Call Tree** -- the same selected transaction's spans nested by
     `parent_span_id` into a `p-treeTable`, with self time per node. Ported
     from Cavisson's `methodcallingtree` (free PrimeNG `TreeTable` under the
     hood there too -- only the surrounding state/services were stripped).
   - **Method Timing** -- spans grouped by name, with *self time* (a span's
     own duration minus time spent in its children) and % of total.
   - **DB Report** -- spans carrying `db.system`/`db.statement` attributes,
     grouped by statement, with count/min/max/avg duration.
   - **Service Map** -- cross-service call graph, built by matching
     `parent_span_id` across service boundaries (not an ES aggregation --
     needs the actual parent document, which usually belongs to a different
     service, so it's computed by pulling a bounded span batch and reducing
     in JS: `api/src/queries/serviceMap.js`). Rendered with **Cytoscape.js**
     (breadthfirst layout) -- Cavisson's own `transaction-service-map` uses
     JSPlumb Toolkit, a commercial diagramming library we don't have a
     license for, so this is a from-scratch free-tier equivalent, not a port.

This is a from-scratch reimplementation of the *shape* of Cavisson's own DDR
reporting (same report types, same "pick a service, then drill into report
types" flow) against this stack's own Elasticsearch data -- not the same
code, and inherently shallower where OTel's span model can't see what
Cavisson's bytecode-level agent can (e.g. MCI here is attribute-level, not
actual method arguments/return values).

## How data is stored

The collector's `elasticsearchexporter` (`collector/otel-collector-config.yaml`)
uses its default **OTel mapping mode** with dynamic data stream routing, so
each signal lands in its own auto-created data stream:

- `traces-generic.otel-default` -- one document per span (`trace_id`, `span_id`,
  `parent_span_id`, `name`, `kind`, `duration` in ns, `status`, `resource.attributes.*`)
- `logs-generic.otel-default` -- one document per log record (`body.text`,
  `severity_text`, `trace_id`/`span_id` for correlation)
- `metrics-generic.otel-default` -- one document per data point, value under
  `metrics.<metric name>` (this index is a time-series data stream, so it
  only accepts timestamps within a rolling window around "now" -- don't
  backdate test data by more than a couple hours)

The `api` service queries these three index patterns directly over the
Elasticsearch REST API (`api/src/es.js`, `api/src/routes.js`) -- no
intermediate query language, just plain `_search` bodies.

## Layout

```
collector/otel-collector-config.yaml   # OTLP receiver -> batch -> elasticsearch exporter
docker-compose.yml                     # elasticsearch + otel-collector + api + ui-angular

api/src/server.js                      # Express app, /api/* only -- no static frontend
api/src/routes.js                      # thin HTTP layer -- wires routes to queries/*
api/src/es.js                          # thin fetch wrapper around the ES REST API
api/src/util.js                        # toMillis/serviceName/serviceFilter/computeSelfTime
api/src/queries/                       # one file per report, DDR-style: services, traces,
                                        #   logs, metrics, serviceHealth, methodTiming,
                                        #   dbReport, serviceMap, callTree

ui-angular/src/app/core/               # api.service.ts (one method per endpoint, mirrors
                                        #   api/src/queries/*), models.ts, format.util.ts,
                                        #   service-filter.service.ts (header dropdown state)
ui-angular/src/app/service-view/       # service-overview, service-drilldown (shell + subnav,
                                        #   provides DrilldownStateService), flowpath,
                                        #   mci-dialog, call-tree, method-timing, db-report,
                                        #   service-map -- each a standalone routed component,
                                        #   lazy-loaded, fetching only when navigated to
ui-angular/src/app/traces/             # top-level Traces tab (unscoped, header service filter)
ui-angular/src/app/metrics/            # top-level Metrics tab (p-chart wrapping Chart.js)
ui-angular/src/app/logs/               # top-level Logs tab
ui-angular/nginx.conf                  # serves the built SPA, proxies /api/* to the api service
ui-angular/Dockerfile                  # multi-stage: node (ng build) -> nginx

agents/java/opentelemetry-javaagent.jar  # real OTel Java agent (v2.31.1) -- not a stub
agents/java/README.md                    # how to launch agentTestingApp with it
agents/node/README.md                    # equivalent npm-package based setup for nsecomm
```

## Why Angular components fetch on open, not on a timer

Every routed component (`service-overview`, `flowpath`, `method-timing`, etc.)
loads its data in `ngOnInit()` -- i.e. once, when the router activates it --
and nowhere is there a `setInterval` re-fetching in the background. Switching
tabs/subtabs re-triggers `ngOnInit` naturally (Angular router lifecycle), so
data is always fresh when you look at it without ever polling while you're
not. This mirrors Cavisson's own per-route fetch pattern.

## Notes / things to adjust for real use

- Elasticsearch security is disabled for simplicity (`xpack.security.enabled=false`).
  Turn it back on (and add auth to the collector's exporter config and the
  API's ES client) before this ever sees real credentials or leaves localhost.
- Neither the API nor the UI has auth of its own -- both are local dev tools.
- `otel-collector-contrib:0.159.0` was the version this was built and tested
  against; the `elasticsearchexporter`'s metrics support is still early
  (`Development` stability upstream) so behavior may change on upgrade.
