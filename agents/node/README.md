# Node.js agent (real OpenTelemetry auto-instrumentation)

Unlike Java, there's no separate jar to download -- Node's "agent" is just an
npm package (`@opentelemetry/auto-instrumentations-node`) loaded before your
app's code runs.

## Target: `appagents/SampleTestingApps/nodejs/nsecomm`

Its entry point is `node ./bin/www` (see its `package.json`). To instrument it:

```bash
cd /home/team/git_tree/appagents/SampleTestingApps/nodejs/nsecomm
npm install --save-dev @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node

OTEL_SERVICE_NAME=nsecomm \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
OTEL_TRACES_EXPORTER=otlp \
OTEL_METRICS_EXPORTER=otlp \
OTEL_LOGS_EXPORTER=otlp \
NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register" \
node ./bin/www
```

`--require .../register` is the equivalent of Java's `-javaagent` -- it patches
Node's module loader before `bin/www` imports anything, so common libraries
(http, express, pg, mysql, redis, amqplib, etc. -- nsecomm's `package.json`
uses several of these) get auto-instrumented with no code changes.

Once running, hits against nsecomm's routes will show up in the UI at
http://localhost:3000 under the `nsecomm` service, same as the Java app.

**Node version note:** nsecomm's own dependencies look old (`cluster@0.7.7`,
`express@^5.1.0` mixed with very old transitive deps) -- if `npm install`
fights with the host's default Node (v12, per this machine's `nvm` setup),
try a newer one from `nvm` (`~/.nvm/versions/node/v18.13.0/bin/node` is
available) before concluding the app itself is broken.
