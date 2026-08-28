import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../core/api.service';
import { TimeService } from '../../core/time.service';
import { Span, TraceSummary } from '../../core/models';
import { fmtDuration, fmtTime } from '../../core/format.util';
import { DrilldownStateService } from '../service-drilldown/drilldown-state.service';
import { McIDialogComponent } from '../mci-dialog/mci-dialog.component';

@Component({
  selector: 'app-flowpath',
  standalone: true,
  imports: [CommonModule, TableModule, McIDialogComponent],
  templateUrl: './flowpath.component.html',
  styleUrl: './flowpath.component.scss',
})
export class FlowpathComponent implements OnInit {
  service = '';
  traces: TraceSummary[] = [];
  loading = true;
  spans: Span[] = [];
  activeTraceId: string | null = null;

  mciSpan: Span | null = null;
  mciTraceId: string | null = null;

  fmtDuration = fmtDuration;
  fmtTime = fmtTime;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    public drilldown: DrilldownStateService,
    private time: TimeService,
  ) {}


  ngOnDestroy(): void {
    if (this.timeSub) this.timeSub.unsubscribe?.();
  }

  ngOnInit(): void {
    this.service = this.route.parent?.snapshot.paramMap.get('service') || '';
    this.timeSub = this.time.getWindow$().subscribe((minutes) => {
      this.loading = true;
      this.api.getTraces(this.service, 50, minutes).subscribe((traces) => {
        this.traces = traces;
        this.loading = false;
      });
    });
  }

  timeSub: any;

  selectTrace(traceId: string): void {
    this.activeTraceId = traceId;
    this.drilldown.selectedTraceId.set(traceId);
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

  openMci(span: Span): void {
    this.mciSpan = span;
    this.mciTraceId = this.activeTraceId;
  }

  closeMci(): void {
    this.mciSpan = null;
  }
}
