const express = require("express");
const { listServices } = require("./queries/services");
const { listRecentTraces, getTrace } = require("./queries/traces");
const { searchLogs } = require("./queries/logs");
const { listMetricNames, getMetricSeries } = require("./queries/metrics");
const { getServiceHealth } = require("./queries/serviceHealth");
const { getMethodTiming } = require("./queries/methodTiming");
const { getDbReport } = require("./queries/dbReport");
const { getServiceMap } = require("./queries/serviceMap");
const { getCallTree } = require("./queries/callTree");

const router = express.Router();

function handle(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

router.get(
  "/services",
  handle(async () => ({ services: await listServices() }))
);

router.get(
  "/service-health",
  handle(async (req) => ({
    services: await getServiceHealth({ windowMinutes: parseInt(req.query.windowMinutes) || 15 }),
  }))
);

router.get(
  "/traces",
  handle(async (req) => ({
    traces: await listRecentTraces({
      service: req.query.service,
      limit: Math.min(parseInt(req.query.limit) || 50, 200),
    }),
  }))
);

router.get(
  "/traces/:traceId",
  handle(async (req) => ({ spans: await getTrace(req.params.traceId) }))
);

router.get(
  "/traces/:traceId/call-tree",
  handle(async (req) => ({ roots: await getCallTree(req.params.traceId) }))
);

router.get(
  "/logs",
  handle(async (req) => ({
    logs: await searchLogs({
      service: req.query.service,
      q: req.query.q,
      traceId: req.query.traceId,
      spanId: req.query.spanId,
      limit: Math.min(parseInt(req.query.limit) || 100, 500),
    }),
  }))
);

router.get(
  "/method-timing",
  handle(async (req) => ({
    methods: await getMethodTiming({
      service: req.query.service,
      windowMinutes: parseInt(req.query.windowMinutes) || 60,
    }),
  }))
);

router.get(
  "/db-report",
  handle(async (req) => ({
    queries: await getDbReport({
      service: req.query.service,
      windowMinutes: parseInt(req.query.windowMinutes) || 60,
    }),
  }))
);

router.get(
  "/service-map",
  handle(async (req) => getServiceMap({
    service: req.query.service,
    windowMinutes: parseInt(req.query.windowMinutes) || 60,
  }))
);

router.get(
  "/metrics/names",
  handle(async () => ({ names: await listMetricNames() }))
);

router.get(
  "/metrics/data",
  handle(async (req) => {
    if (!req.query.name) throw new Error("name is required");
    return {
      name: req.query.name,
      points: await getMetricSeries({
        name: req.query.name,
        service: req.query.service,
        limit: Math.min(parseInt(req.query.limit) || 500, 2000),
      }),
    };
  })
);

module.exports = router;
