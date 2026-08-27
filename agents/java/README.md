# Java agent (real OpenTelemetry auto-instrumentation)

`opentelemetry-javaagent.jar` here is the real, unmodified
`opentelemetry-java-instrumentation` release
[v2.31.1](https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/tag/v2.31.1)
(verified: valid zip, `Premain-Class: io.opentelemetry.javaagent.OpenTelemetryAgent` in
its manifest, matches the release's published size). It supports Java 8+ runtimes.

This replaces `scripts/send-test-data.sh`'s hand-built OTLP JSON with a real
SDK auto-instrumenting a real app.

## Target: `appagents/SampleTestingApps/java/agentTestingApp`

That app is a Spring Boot app, built with Maven, requiring **JDK 8**, default
port 8080 (see its own `README.md`). Build it first the normal way for that
project (`mvn package` from its own directory), then run the resulting jar/war
with the agent attached and pointed at this stack's collector:

```bash
java \
  -javaagent:/home/team/project/tree/otel-lab/agents/java/opentelemetry-javaagent.jar \
  -Dotel.service.name=agent-testing-app \
  -Dotel.exporter.otlp.endpoint=http://localhost:4318 \
  -Dotel.exporter.otlp.protocol=http/protobuf \
  -Dotel.traces.exporter=otlp \
  -Dotel.metrics.exporter=otlp \
  -Dotel.logs.exporter=otlp \
  -jar agentTestingApp.war
```

(Env vars work identically if you prefer that over `-D` system properties:
`OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`,
`OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`, `OTEL_TRACES_EXPORTER=otlp`, etc.)

Once it's running and you hit its endpoints (see that app's own README for the
list of HTTP/DB/JMS/etc. sample services it exposes), traces/metrics/logs will
flow through `otel-collector` into this stack's Elasticsearch, and show up in
the UI at http://localhost:3000 under the `agent-testing-app` service.

## Other language agents (for later)

- **Node.js** (targeting `appagents/SampleTestingApps/nodejs/nsecomm`): no jar
  to download -- it's an npm package. See `agents/node/README.md`.
- **Python / .NET / PHP**: same idea, each ecosystem's own OTel distro package
  -- ask when you're ready to wire one up, they follow the same pattern
  (install the SDK/auto-instrumentation package, point it at
  `http://localhost:4318`, run the app).
