package com.otel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class QueryHubService {
    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();
    private final String ES_URL = System.getenv().getOrDefault("ES_URL", "http://elasticsearch:9200");

    public List<String> listServices() throws Exception {
        Map<String, Object> body = Map.of(
                "size", 0,
                "aggs", Map.of("services", Map.of("terms", Map.of("field", "resource.attributes.service.name", "size", 100)))
        );
        JsonNode res = searchIndex("traces-*,logs-*,metrics-*", body);
        // combine buckets across indices if ES returns per-index; simplest: try aggregations
        JsonNode buckets = res.path("aggregations").path("services").path("buckets");
        List<String> names = new ArrayList<>();
        if (buckets.isArray()) {
            for (JsonNode b : buckets) names.add(b.path("key").asText());
        }
        Collections.sort(names);
        return names;
    }

    public List<Map<String, Object>> getServiceHealth(JsonNode params) throws Exception {
        int windowMinutes = params != null && params.has("windowMinutes") ? params.get("windowMinutes").asInt() : 15;
        Map<String, Object> body = Map.of(
                "size", 0,
                "query", Map.of("bool", Map.of("filter", List.of(Map.of("range", Map.of("@timestamp", Map.of("gte", "now-" + windowMinutes + "m")))))),
                "aggs", Map.of("by_service", Map.of("terms", Map.of("field", "resource.attributes.service.name", "size", 50),
                        "aggs", Map.of("latency_percentiles", Map.of("percentiles", Map.of("field", "duration", "percents", List.of(50,95,99))),
                                "errors", Map.of("filter", Map.of("term", Map.of("status.code", "Error"))))))
        );
        JsonNode res = searchIndex("traces-*", body);
        JsonNode buckets = res.path("aggregations").path("by_service").path("buckets");
        List<Map<String,Object>> out = new ArrayList<>();
        if (buckets.isArray()) {
            for (JsonNode b : buckets) {
                int total = b.path("doc_count").asInt();
                int errorCount = b.path("errors").path("doc_count").asInt();
                JsonNode pct = b.path("latency_percentiles").path("values");
                Map<String,Object> row = new LinkedHashMap<>();
                row.put("service", b.path("key").asText());
                row.put("requestCount", total);
                row.put("requestsPerMin", Math.round((total / (double)windowMinutes) * 100.0) / 100.0);
                row.put("errorRate", total==0?0: Math.round(((errorCount/(double)total)*100.0)*100.0)/100.0);
                row.put("p50Ms", nanosToMs(pct.path("50.0").asDouble(0)));
                row.put("p95Ms", nanosToMs(pct.path("95.0").asDouble(0)));
                row.put("p99Ms", nanosToMs(pct.path("99.0").asDouble(0)));
                out.add(row);
            }
        }
        out.sort((a,b)-> ((Integer)b.get("requestCount")).compareTo((Integer)a.get("requestCount")));
        return out;
    }

    private double nanosToMs(double nanos) { return nanos==0?0: Math.round((nanos/1e6)*100.0)/100.0; }

    public List<Map<String,Object>> listRecentTraces(JsonNode params) throws Exception {
        String service = params!=null && params.has("service")? params.get("service").asText(): null;
        int limit = params!=null && params.has("limit")? Math.min(params.get("limit").asInt(),200):50;
        int windowMinutes = params!=null && params.has("windowMinutes")? params.get("windowMinutes").asInt(): 0;
        Map<String,Object> body = new HashMap<>();
        body.put("size", 2000);
        body.put("sort", List.of(Map.of("@timestamp", Map.of("order","desc"))));
        List<Object> filters = new ArrayList<>();
        if (service!=null) filters.add(Map.of("term", Map.of("resource.attributes.service.name", service)));
        if (windowMinutes > 0) filters.add(Map.of("range", Map.of("@timestamp", Map.of("gte", "now-"+windowMinutes+"m"))));
        Map<String,Object> q = Map.of("bool", Map.of("filter", filters));
        body.put("query", q);
        JsonNode res = searchIndex("traces-*", body);
        List<JsonNode> spans = new ArrayList<>();
        for (JsonNode h : res.path("hits").path("hits")) spans.add(h.path("_source"));

        Map<String, Map<String,Object>> traces = new LinkedHashMap<>();
        for (JsonNode span : spans) {
            String id = span.path("trace_id").asText(null);
            if (id==null || id.isEmpty()) continue;
            long start = toMillis(span.path("@timestamp"));
            double durationMs = span.path("duration").asDouble(0)/1e6;
            long end = start + (long)durationMs;
            if (!traces.containsKey(id)) {
                Map<String,Object> t = new LinkedHashMap<>();
                t.put("traceId", id);
                t.put("service", serviceName(span));
                t.put("rootName", span.path("name").asText());
                t.put("startTime", start);
                t.put("endTime", end);
                t.put("spanCount", 0);
                t.put("hasError", false);
                traces.put(id,t);
            }
            Map<String,Object> t = traces.get(id);
            t.put("spanCount", ((Integer)t.get("spanCount")) + 1);
            if (start < (Long)t.get("startTime")){
                t.put("startTime", start);
                t.put("rootName", span.path("name").asText());
                t.put("service", serviceName(span));
            }
            if (end > (Long)t.get("endTime")) t.put("endTime", end);
            if (span.path("status").has("code") && "Error".equals(span.path("status").path("code").asText())) t.put("hasError", true);
        }

        List<Map<String,Object>> out = new ArrayList<>();
        for (Map<String,Object> v : traces.values()) {
            long durationMs = Math.max(0, ((Long)v.get("endTime")) - ((Long)v.get("startTime")));
            v.put("durationMs", durationMs);
            out.add(v);
        }
        out.sort((a,b)-> Long.compare((Long)b.get("startTime"),(Long)a.get("startTime")));
        if (out.size() > limit) out = out.subList(0, limit);
        return out;
    }

    private long toMillis(JsonNode value) { try { return Math.round(Double.parseDouble(value.asText())); } catch(Exception e){return 0;} }

    private String serviceName(JsonNode doc) {
        if (doc.has("resource") && doc.path("resource").has("attributes") && doc.path("resource").path("attributes").has("service.name"))
            return doc.path("resource").path("attributes").path("service.name").asText("unknown");
        return "unknown";
    }

    public List<Map<String,Object>> getTrace(String traceId) throws Exception {
        Map<String,Object> body = Map.of("size",1000, "sort", List.of(Map.of("@timestamp", Map.of("order","asc"))), "query", Map.of("term", Map.of("trace_id", traceId)));
        JsonNode res = searchIndex("traces-*", body);
        List<Map<String,Object>> spans = new ArrayList<>();
        for (JsonNode h : res.path("hits").path("hits")) {
            JsonNode s = h.path("_source");
            Map<String,Object> row = new LinkedHashMap<>();
            row.put("spanId", s.path("span_id").asText());
            row.put("parentSpanId", s.path("parent_span_id").isMissingNode()?null: s.path("parent_span_id").asText(null));
            row.put("name", s.path("name").asText());
            row.put("kind", s.path("kind").asText(null));
            row.put("service", serviceName(s));
            row.put("startTime", toMillis(s.path("@timestamp")));
            row.put("durationMs", s.path("duration").asDouble(0)/1e6);
            row.put("status", s.path("status"));
            row.put("attributes", s.path("attributes"));
            spans.add(row);
        }
        // compute self time
        Map<String, Double> selfTime = computeSelfTime(spans);
        for (Map<String,Object> r : spans) r.put("selfTimeMs", Math.round(selfTime.getOrDefault(r.get("spanId"),0.0)*100.0)/100.0);
        return spans;
    }

    private Map<String, Double> computeSelfTime(List<Map<String,Object>> spans) {
        Map<String, Double> childSum = new HashMap<>();
        for (Map<String,Object> s : spans) {
            String parent = (String)s.get("parentSpanId");
            if (parent==null) continue;
            childSum.put(parent, childSum.getOrDefault(parent,0.0) + ((Number)s.get("durationMs")).doubleValue());
        }
        Map<String, Double> self = new HashMap<>();
        for (Map<String,Object> s : spans) {
            String id = (String)s.get("spanId");
            double dur = ((Number)s.get("durationMs")).doubleValue();
            double child = childSum.getOrDefault(id, 0.0);
            self.put(id, Math.max(0, dur - child));
        }
        return self;
    }

    public List<Map<String,Object>> getCallTree(String traceId) throws Exception {
        List<Map<String,Object>> spans = getTrace(traceId);
        Map<String, Map<String,Object>> byId = new LinkedHashMap<>();
        for (Map<String,Object> s : spans) {
            Map<String,Object> copy = new LinkedHashMap<>(s);
            copy.put("children", new ArrayList<Map<String,Object>>());
            byId.put((String)s.get("spanId"), copy);
        }
        List<Map<String,Object>> roots = new ArrayList<>();
        for (Map<String,Object> node : byId.values()) {
            String parent = (String)node.get("parentSpanId");
            if (parent != null && byId.containsKey(parent)) {
                List<Map<String,Object>> kids = (List<Map<String,Object>>)byId.get(parent).get("children");
                kids.add(node);
            } else roots.add(node);
        }
        return roots;
    }

    public List<Map<String,Object>> searchLogs(JsonNode params) throws Exception {
        String service = params!=null && params.has("service")? params.get("service").asText(): null;
        String q = params!=null && params.has("q")? params.get("q").asText(): null;
        String traceId = params!=null && params.has("traceId")? params.get("traceId").asText(): null;
        String spanId = params!=null && params.has("spanId")? params.get("spanId").asText(): null;
        int limit = params!=null && params.has("limit")? Math.min(params.get("limit").asInt(),500):100;

        List<Object> filter = new ArrayList<>();
        if (service != null) filter.add(Map.of("term", Map.of("resource.attributes.service.name", service)));
        if (traceId != null) filter.add(Map.of("term", Map.of("trace_id", traceId)));
        if (spanId != null) filter.add(Map.of("term", Map.of("span_id", spanId)));
        List<Object> must = q!=null? List.of(Map.of("match", Map.of("body.text", q))): List.of();
        Map<String,Object> body = Map.of(
                "size", limit,
                "sort", List.of(Map.of("@timestamp", Map.of("order","desc"))),
                "query", Map.of("bool", Map.of("filter", filter, "must", must))
        );
        JsonNode res = searchIndex("logs-*", body);
        List<Map<String,Object>> out = new ArrayList<>();
        for (JsonNode h : res.path("hits").path("hits")) {
            JsonNode l = h.path("_source");
            Map<String,Object> row = new LinkedHashMap<>();
            row.put("timestamp", toMillis(l.path("@timestamp")));
            row.put("severity", l.path("severity_text").asText(""));
            row.put("service", serviceName(l));
            row.put("body", l.path("body").has("text")? l.path("body").path("text").asText("") : "");
            row.put("traceId", l.has("trace_id")? l.path("trace_id").asText(null): null);
            row.put("spanId", l.has("span_id")? l.path("span_id").asText(null): null);
            row.put("attributes", l.path("attributes"));
            out.add(row);
        }
        return out;
    }

    public List<Map<String,Object>> getMethodTiming(JsonNode params) throws Exception {
        List<Map<String,Object>> spans = fetchRawSpans(params);
        Map<String, Double> self = new HashMap<>();
        for (Map<String,Object> s : spans) self.put((String)s.get("spanId"), ((Number)s.get("durationMs")).doubleValue());
        // compute child sums
        Map<String, Double> childSum = new HashMap<>();
        for (Map<String,Object> s : spans) {
            String parent = (String)s.get("parentSpanId");
            if (parent==null) continue;
            childSum.put(parent, childSum.getOrDefault(parent,0.0) + ((Number)s.get("durationMs")).doubleValue());
        }
        Map<String, Double> selfTime = new HashMap<>();
        double totalSelf = 0;
        for (Map<String,Object> s : spans) {
            String id = (String)s.get("spanId");
            double dur = ((Number)s.get("durationMs")).doubleValue();
            double st = Math.max(0, dur - childSum.getOrDefault(id,0.0));
            selfTime.put(id, st);
            totalSelf += st;
        }
        Map<String, Map<String,Object>> byName = new HashMap<>();
        for (Map<String,Object> s : spans) {
            String name = (String)s.get("name");
            double t = selfTime.getOrDefault((String)s.get("spanId"),0.0);
            byName.computeIfAbsent(name, k-> new LinkedHashMap<>(Map.of("name",k,"count",0,"selfTimeMs",0.0)));
            Map<String,Object> row = byName.get(name);
            row.put("count", ((Integer)row.get("count")) + 1);
            row.put("selfTimeMs", ((Double)row.get("selfTimeMs")) + t);
        }
        List<Map<String,Object>> out = new ArrayList<>();
        for (Map<String,Object> v : byName.values()) {
            int count = (Integer)v.get("count");
            double total = (Double)v.get("selfTimeMs");
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("name", v.get("name"));
            r.put("count", count);
            r.put("avgSelfTimeMs", Math.round((total/count)*100.0)/100.0);
            r.put("totalSelfTimeMs", Math.round(total*100.0)/100.0);
            r.put("percentOfTotal", totalSelf==0?0: Math.round(((total/totalSelf)*100.0)*100.0)/100.0);
            out.add(r);
        }
        out.sort((a,b)-> Double.compare((Double)b.get("totalSelfTimeMs"),(Double)a.get("totalSelfTimeMs")));
        return out;
    }

    public List<Map<String,Object>> getDbReport(JsonNode params) throws Exception {
        List<Map<String,Object>> spans = fetchRawSpans(params);
        List<Map<String,Object>> dbSpans = new ArrayList<>();
        for (Map<String,Object> s : spans) {
            Map<String,Object> attrs = (Map<String,Object>)s.get("attributes");
            Object dbSystem = attrs!=null? attrs.get("db.system"):null;
            Object dbStmt = attrs!=null? attrs.get("db.statement"):null;
            if (dbSystem!=null || dbStmt!=null) dbSpans.add(s);
        }
        Map<String, Map<String,Object>> byQuery = new HashMap<>();
        for (Map<String,Object> s : dbSpans) {
            Map<String,Object> attrs = (Map<String,Object>)s.get("attributes");
            String key = attrs!=null && attrs.get("db.statement")!=null? attrs.get("db.statement").toString() : ((attrs!=null && attrs.get("db.system")!=null)? attrs.get("db.system"):"db") + ": " + s.get("name");
            byQuery.computeIfAbsent(key, k-> new LinkedHashMap<>(Map.of("query",k,"dbSystem", attrs!=null? attrs.get("db.system"):null, "count",0, "minMs", Double.POSITIVE_INFINITY, "maxMs", 0.0, "totalMs",0.0)));
            Map<String,Object> row = byQuery.get(key);
            row.put("count", ((Integer)row.get("count")) + 1);
            double dur = ((Number)s.get("durationMs")).doubleValue();
            row.put("minMs", Math.min(((Double)row.get("minMs")), dur));
            row.put("maxMs", Math.max(((Double)row.get("maxMs")), dur));
            row.put("totalMs", ((Double)row.get("totalMs")) + dur);
        }
        List<Map<String,Object>> out = new ArrayList<>();
        for (Map<String,Object> v : byQuery.values()) {
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("query", v.get("query"));
            r.put("dbSystem", v.get("dbSystem"));
            int count = (Integer)v.get("count");
            r.put("count", count);
            r.put("minMs", Math.round(((Double)v.get("minMs"))*100.0)/100.0);
            r.put("maxMs", Math.round(((Double)v.get("maxMs"))*100.0)/100.0);
            r.put("avgMs", Math.round((((Double)v.get("totalMs"))/count)*100.0)/100.0);
            out.add(r);
        }
        out.sort((a,b)-> ((Integer)b.get("count")).compareTo((Integer)a.get("count")));
        return out;
    }

    public Map<String,Object> getServiceMap(JsonNode params) throws Exception {
        List<Map<String,Object>> spans = fetchRawSpans(params);
        Map<String, Integer> nodeCounts = new HashMap<>();
        Map<String, Map<String,Object>> edges = new HashMap<>();
        Map<String, Map<String,Object>> byId = new HashMap<>();
        for (Map<String,Object> s : spans) byId.put((String)s.get("spanId"), s);
        for (Map<String,Object> s : spans) {
            String svc = (String)s.get("service");
            nodeCounts.put(svc, nodeCounts.getOrDefault(svc,0)+1);
            String parentId = (String)s.get("parentSpanId");
            if (parentId==null) continue;
            Map<String,Object> parent = byId.get(parentId);
            if (parent==null) continue;
            String psvc = (String)parent.get("service");
            if (psvc.equals(svc)) continue;
            String key = psvc + "=>" + svc;
            edges.computeIfAbsent(key, k-> new LinkedHashMap<>(Map.of("from", psvc, "to", svc, "count",0, "totalMs",0.0)));
            Map<String,Object> e = edges.get(key);
            e.put("count", ((Integer)e.get("count")) + 1);
            e.put("totalMs", ((Double)e.get("totalMs")) + ((Number)s.get("durationMs")).doubleValue());
        }
        List<Map<String,Object>> nodes = new ArrayList<>();
        for (var en : nodeCounts.entrySet()) nodes.add(Map.of("service", en.getKey(), "spanCount", en.getValue()));
        List<Map<String,Object>> edgeList = new ArrayList<>();
        for (var e : edges.values()) edgeList.add(Map.of("from", e.get("from"), "to", e.get("to"), "count", e.get("count"), "avgDurationMs", Math.round((((Double)e.get("totalMs"))/((Integer)e.get("count")))*100.0)/100.0));
        String service = params!=null && params.has("service")? params.get("service").asText(): null;
        if (service != null) {
            Set<String> touching = new HashSet<>(); touching.add(service);
            for (Map<String,Object> e : edgeList) {
                if (service.equals(e.get("from"))) touching.add((String)e.get("to"));
                if (service.equals(e.get("to"))) touching.add((String)e.get("from"));
            }
            nodes.removeIf(n-> !touching.contains(((String)n.get("service"))));
            edgeList.removeIf(e-> !service.equals(e.get("from")) && !service.equals(e.get("to")));
        }
        return Map.of("nodes", nodes, "edges", edgeList);
    }

    public List<String> listMetricNames() throws Exception {
        String url = ES_URL + "/metrics-*/_field_caps?fields=metrics.*";
        JsonNode caps = rest.getForObject(url, JsonNode.class);
        List<String> out = new ArrayList<>();
        JsonNode fields = caps.path("fields");
        Iterator<String> it = fields.fieldNames();
        while (it.hasNext()) {
            String f = it.next();
            if (f.startsWith("metrics.")) {
                JsonNode types = fields.path(f);
                if (!types.has("object")) out.add(f.substring("metrics.".length()));
            }
        }
        Collections.sort(out);
        return out;
    }

    public List<Map<String,Object>> getMetricSeries(JsonNode params) throws Exception {
        String name = params.get("name").asText();
        String service = params.has("service")? params.get("service").asText(): null;
        int limit = params.has("limit")? Math.min(params.get("limit").asInt(),2000):500;
        List<Object> filter = new ArrayList<>();
        filter.add(Map.of("exists", Map.of("field", "metrics." + name)));
        if (service!=null) filter.add(Map.of("term", Map.of("resource.attributes.service.name", service)));
        Map<String,Object> body = Map.of("size", limit, "sort", List.of(Map.of("@timestamp", Map.of("order","asc"))), "_source", List.of("@timestamp", "metrics."+name, "resource.attributes.service.name", "attributes"), "query", Map.of("bool", Map.of("filter", filter)));
        JsonNode res = searchIndex("metrics-*", body);
        List<Map<String,Object>> out = new ArrayList<>();
        for (JsonNode h : res.path("hits").path("hits")) {
            JsonNode m = h.path("_source");
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("timestamp", toMillis(m.path("@timestamp")));
            r.put("value", m.path("metrics").has(name)? m.path("metrics").path(name).asDouble(): null);
            r.put("service", serviceName(m));
            r.put("attributes", m.path("attributes"));
            out.add(r);
        }
        return out;
    }

    public List<Map<String,Object>> fetchRawSpans(JsonNode params) throws Exception {
        String service = params!=null && params.has("service")? params.get("service").asText(): null;
        int windowMinutes = params!=null && params.has("windowMinutes")? params.get("windowMinutes").asInt(): 60;
        int limit = params!=null && params.has("limit")? Math.min(params.get("limit").asInt(),5000):5000;
        List<Object> filter = new ArrayList<>();
        if (service!=null) filter.add(Map.of("term", Map.of("resource.attributes.service.name", service)));
        if (windowMinutes>0) filter.add(Map.of("range", Map.of("@timestamp", Map.of("gte", "now-"+windowMinutes+"m"))));
        Map<String,Object> body = Map.of("size", limit, "sort", List.of(Map.of("@timestamp", Map.of("order","desc"))), "query", Map.of("bool", Map.of("filter", filter)));
        JsonNode res = searchIndex("traces-*", body);
        List<Map<String,Object>> out = new ArrayList<>();
        for (JsonNode h : res.path("hits").path("hits")) {
            JsonNode s = h.path("_source");
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("spanId", s.path("span_id").asText());
            r.put("parentSpanId", s.path("parent_span_id").isMissingNode()?null: s.path("parent_span_id").asText(null));
            r.put("traceId", s.path("trace_id").asText());
            r.put("name", s.path("name").asText());
            r.put("kind", s.path("kind").asText(null));
            r.put("service", serviceName(s));
            r.put("startTime", toMillis(s.path("@timestamp")));
            r.put("durationMs", s.path("duration").asDouble(0)/1e6);
            r.put("status", s.path("status"));
            r.put("attributes", mapper.convertValue(s.path("attributes"), Map.class));
            out.add(r);
        }
        return out;
    }

    private JsonNode searchIndex(String index, Map<String,Object> body) throws Exception {
        String url = ES_URL + "/" + index + "/_search";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> req = new HttpEntity<>(mapper.writeValueAsString(body), headers);
        ResponseEntity<JsonNode> resp = rest.postForEntity(url, req, JsonNode.class);
        return resp.getBody();
    }
}
