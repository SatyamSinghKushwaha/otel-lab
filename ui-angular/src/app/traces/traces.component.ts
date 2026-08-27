import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ApiService } from '../core/api.service';
import { ServiceFilterService } from '../core/service-filter.service';
import { Span, TraceSummary } from '../core/models';
import { fmtDuration, fmtTime } from '../core/format.util';

@Component({
  selector: 'app-traces',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './traces.component.html',
  styleUrl: './traces.component.scss',
})
export class TracesComponent implements OnInit {
  traces: TraceSummary[] = [];
  loading = true;
  spans: Span[] = [];
  activeTraceId: string | null = null;

  fmtDuration = fmtDuration;
  fmtTime = fmtTime;

  constructor(
    private api: ApiService,
    public serviceFilter: ServiceFilterService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const traceIdFromLogs = this.route.snapshot.queryParamMap.get('traceId');
    this.load(traceIdFromLogs || undefined);
  }

  load(selectAfterLoad?: string): void {
    this.loading = true;
    this.api.getTraces(this.serviceFilter.selected() || undefined).subscribe((traces) => {
      this.traces = traces;
      this.loading = false;
      if (selectAfterLoad) this.selectTrace(selectAfterLoad);
    });
  }

  selectTrace(traceId: string): void {
    this.activeTraceId = traceId;
    this.api.getTrace(traceId).subscribe((spans) => (this.spans = spans));
  }

  waterfallStart(): number {
    return this.spans.length ? Math.min(...this.spans.map((s) => s.startTime)) : 0;
  }

  waterfallTotal(): number {
    if (!this.spans.length) return 1;
    const end = Math.max(...this.spans.map((s) => s.startTime + s.durationMs));
    return Math.max(1, end - this.waterfallStart());
  }

  barLeft(span: Span): number {
    return ((span.startTime - this.waterfallStart()) / this.waterfallTotal()) * 100;
  }

  barWidth(span: Span): number {
    return Math.max(0.3, (span.durationMs / this.waterfallTotal()) * 100);
  }
}
