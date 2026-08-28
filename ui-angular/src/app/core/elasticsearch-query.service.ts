import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CallTreeNode,
  DbReportRow,
  LogRecord,
  MethodTimingRow,
  MetricPoint,
  ServiceHealth,
  ServiceMap,
  Span,
  TraceSummary,
} from './models';

function params(obj: Record<string, string | number | undefined | null>): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') p = p.set(key, value);
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class ElasticsearchQueryService {
  constructor(private http: HttpClient) {}

  getServices(): Observable<string[]> {
    return this.http.get<{ services: string[] }>('/api/services').pipe(map((r) => r.services));
  }

  getServiceHealth(windowMinutes: number): Observable<ServiceHealth[]> {
    return this.http
      .get<{ services: ServiceHealth[] }>('/api/service-health', { params: params({ windowMinutes }) })
      .pipe(map((r) => r.services));
  }

  getTraces(service?: string, limit = 50): Observable<TraceSummary[]> {
    return this.http
      .get<{ traces: TraceSummary[] }>('/api/traces', { params: params({ service, limit }) })
      .pipe(map((r) => r.traces));
  }

  getTrace(traceId: string): Observable<Span[]> {
    return this.http.get<{ spans: Span[] }>(`/api/traces/${traceId}`).pipe(map((r) => r.spans));
  }

  getCallTree(traceId: string): Observable<CallTreeNode[]> {
    return this.http
      .get<{ roots: CallTreeNode[] }>(`/api/traces/${traceId}/call-tree`)
      .pipe(map((r) => r.roots));
  }

  getLogs(opts: { service?: string; q?: string; traceId?: string; spanId?: string; limit?: number }): Observable<LogRecord[]> {
    return this.http.get<{ logs: LogRecord[] }>('/api/logs', { params: params(opts) }).pipe(map((r) => r.logs));
  }

  getMethodTiming(service: string, windowMinutes = 60): Observable<MethodTimingRow[]> {
    return this.http
      .get<{ methods: MethodTimingRow[] }>('/api/method-timing', { params: params({ service, windowMinutes }) })
      .pipe(map((r) => r.methods));
  }

  getDbReport(service: string, windowMinutes = 60): Observable<DbReportRow[]> {
    return this.http
      .get<{ queries: DbReportRow[] }>('/api/db-report', { params: params({ service, windowMinutes }) })
      .pipe(map((r) => r.queries));
  }

  getServiceMap(service: string, windowMinutes = 60): Observable<ServiceMap> {
    return this.http.get<ServiceMap>('/api/service-map', { params: params({ service, windowMinutes }) });
  }

  getMetricNames(): Observable<string[]> {
    return this.http.get<{ names: string[] }>('/api/metrics/names').pipe(map((r) => r.names));
  }

  getMetricData(name: string, service?: string, limit = 500): Observable<MetricPoint[]> {
    return this.http
      .get<{ points: MetricPoint[] }>('/api/metrics/data', { params: params({ name, service, limit }) })
      .pipe(map((r) => r.points));
  }

  // Centralized search POST wrapper: { type, params }
  search<T = any>(type: string, paramsObj: Record<string, any> = {}): Observable<T> {
    return this.http.post<T>('/api/search', { type, params: paramsObj });
  }
}
