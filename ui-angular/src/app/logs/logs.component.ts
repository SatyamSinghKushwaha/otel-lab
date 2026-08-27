import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ApiService } from '../core/api.service';
import { ServiceFilterService } from '../core/service-filter.service';
import { LogRecord } from '../core/models';
import { fmtTime } from '../core/format.util';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, ButtonModule],
  templateUrl: './logs.component.html',
})
export class LogsComponent implements OnInit {
  logs: LogRecord[] = [];
  loading = true;
  query = '';

  fmtTime = fmtTime;

  constructor(
    private api: ApiService,
    public serviceFilter: ServiceFilterService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.search();
  }

  search(): void {
    this.loading = true;
    this.api
      .getLogs({ service: this.serviceFilter.selected() || undefined, q: this.query || undefined })
      .subscribe((logs) => {
        this.logs = logs;
        this.loading = false;
      });
  }

  openTrace(traceId: string | null): void {
    if (!traceId) return;
    this.router.navigate(['/traces'], { queryParams: { traceId } });
  }
}
