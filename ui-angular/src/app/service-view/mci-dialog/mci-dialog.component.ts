import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ApiService } from '../../core/api.service';
import { LogRecord, Span } from '../../core/models';
import { fmtDuration, fmtTime } from '../../core/format.util';

// MCI = Method Call Info: full detail for one span (attributes, self time,
// status) plus any log records correlated to it via trace_id+span_id.
@Component({
  selector: 'app-mci-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  templateUrl: './mci-dialog.component.html',
  styleUrl: './mci-dialog.component.scss',
})
export class McIDialogComponent implements OnChanges {
  @Input() span: Span | null = null;
  @Input() traceId: string | null = null;
  @Output() closed = new EventEmitter<void>();

  logs: LogRecord[] = [];
  attrEntries: [string, unknown][] = [];

  fmtDuration = fmtDuration;
  fmtTime = fmtTime;

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['span'] && this.span && this.traceId) {
      this.attrEntries = Object.entries(this.span.attributes || {});
      this.api.getLogs({ traceId: this.traceId, spanId: this.span.spanId }).subscribe((logs) => (this.logs = logs));
    }
  }

  get visible(): boolean {
    return this.span !== null;
  }

  onHide(): void {
    this.closed.emit();
  }
}
