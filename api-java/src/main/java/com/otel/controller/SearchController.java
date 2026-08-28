package com.otel.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.otel.service.QueryHubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class SearchController {

    @Autowired
    private QueryHubService queryHubService;

    @PostMapping(path = "/api/search", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Object search(@RequestBody JsonNode body) throws Exception {
        String type = body.has("type") ? body.get("type").asText() : null;
        JsonNode params = body.has("params") ? body.get("params") : null;
        if (type == null) throw new IllegalArgumentException("type is required");

        switch (type) {
            case "services":
                return Map.of("services", queryHubService.listServices());
            case "serviceHealth":
                return Map.of("services", queryHubService.getServiceHealth(params));
            case "traces":
                return Map.of("traces", queryHubService.listRecentTraces(params));
            case "trace":
                if (params == null || !params.has("traceId")) throw new IllegalArgumentException("traceId is required for trace");
                return Map.of("spans", queryHubService.getTrace(params.get("traceId").asText()));
            case "callTree":
                if (params == null || !params.has("traceId")) throw new IllegalArgumentException("traceId is required for callTree");
                return Map.of("roots", queryHubService.getCallTree(params.get("traceId").asText()));
            case "logs":
                return Map.of("logs", queryHubService.searchLogs(params));
            case "methodTiming":
                return Map.of("methods", queryHubService.getMethodTiming(params));
            case "dbReport":
                return Map.of("queries", queryHubService.getDbReport(params));
            case "serviceMap":
                return queryHubService.getServiceMap(params);
            case "metricNames":
                return Map.of("names", queryHubService.listMetricNames());
            case "metricData":
                if (params == null || !params.has("name")) throw new IllegalArgumentException("name is required for metricData");
                return Map.of("name", params.get("name").asText(), "points", queryHubService.getMetricSeries(params));
            default:
                throw new IllegalArgumentException("unknown search type: " + type);
        }
    }
}
