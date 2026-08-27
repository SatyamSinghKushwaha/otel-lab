export interface ServiceHealth {
  service: string;
  requestCount: number;
  requestsPerMin: number;
  errorRate: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
}

export interface TraceSummary {
  traceId: string;
  service: string;
  rootName: string;
  startTime: number;
  endTime: number;
  spanCount: number;
  hasError: boolean;
  durationMs: number;
}

export interface SpanStatus {
  code?: string;
  message?: string;
}

export interface Span {
  spanId: string;
  parentSpanId: string | null;
  name: string;
  kind: string;
  service: string;
  startTime: number;
  durationMs: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  selfTimeMs?: number;
}

export interface LogRecord {
  timestamp: number;
  severity: string;
  service: string;
  body: string;
  traceId: string | null;
  spanId: string | null;
  attributes: Record<string, unknown>;
}

export interface MethodTimingRow {
  name: string;
  count: number;
  avgSelfTimeMs: number;
  totalSelfTimeMs: number;
  percentOfTotal: number;
}

export interface DbReportRow {
  query: string;
  dbSystem: string | null;
  count: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
}

export interface ServiceMapNode {
  service: string;
  spanCount: number;
}

export interface ServiceMapEdge {
  from: string;
  to: string;
  count: number;
  avgDurationMs: number;
}

export interface ServiceMap {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
}

export interface MetricPoint {
  timestamp: number;
  value: number;
  service: string;
  attributes: Record<string, unknown>;
}

export interface CallTreeNode {
  spanId: string;
  name: string;
  service: string;
  durationMs: number;
  selfTimeMs: number;
  status: SpanStatus;
  children: CallTreeNode[];
}
