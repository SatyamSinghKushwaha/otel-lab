import { HttpClient } from '@angular/common/http';
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

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getServices(): Observable<string[]> {
    return this.search<{ services: string[] }>('services').pipe(map((r) => r.services));
  }

  getServiceHealth(windowMinutes: number): Observable<ServiceHealth[]> {
    return this.search<{ services: ServiceHealth[] }>('serviceHealth', { windowMinutes }).pipe(map((r) => r.services));
  }

  getTraces(service?: string, limit = 50, windowMinutes?: number): Observable<TraceSummary[]> {
    return this.search<{ traces: TraceSummary[] }>('traces', { service, limit, windowMinutes }).pipe(map((r) => r.traces));
  }

  getTrace(traceId: string): Observable<Span[]> {
    return this.search<{ spans: Span[] }>('trace', { traceId }).pipe(map((r) => r.spans));
  }

  getCallTree(traceId: string): Observable<CallTreeNode[]> {
    return this.search<{ roots: CallTreeNode[] }>('callTree', { traceId }).pipe(map((r) => r.roots));
  }

  getLogs(opts: { service?: string; q?: string; traceId?: string; spanId?: string; limit?: number }): Observable<LogRecord[]> {
    return this.search<{ logs: LogRecord[] }>('logs', opts).pipe(map((r) => r.logs));
  }

  getMethodTiming(service: string, windowMinutes = 60): Observable<MethodTimingRow[]> {
    return this.search<{ methods: MethodTimingRow[] }>('methodTiming', { service, windowMinutes }).pipe(map((r) => r.methods));
  }

  getDbReport(service: string, windowMinutes = 60): Observable<DbReportRow[]> {
    return this.search<{ queries: DbReportRow[] }>('dbReport', { service, windowMinutes }).pipe(map((r) => r.queries));
  }

  getServiceMap(service: string, windowMinutes = 60): Observable<ServiceMap> {
    return this.search<ServiceMap>('serviceMap', { service, windowMinutes });
  }

  getMetricNames(): Observable<string[]> {
    return this.search<{ names: string[] }>('metricNames').pipe(map((r) => r.names));
  }

  getMetricData(name: string, service?: string, limit = 500): Observable<MetricPoint[]> {
    return this.search<{ points: MetricPoint[] }>('metricData', { name, service, limit }).pipe(map((r) => r.points));
  }

  private search<T>(type: string, params: Record<string, unknown> = {}): Observable<T> {
    return this.http.post<T>('/api/search', { type, params });
  }
}
