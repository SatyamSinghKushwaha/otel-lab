import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../core/api.service';
import { DbReportRow } from '../../core/models';
import { fmtDuration } from '../../core/format.util';

@Component({
  selector: 'app-db-report',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './db-report.component.html',
})
export class DbReportComponent implements OnInit {
  queries: DbReportRow[] = [];
  loading = true;

  fmtDuration = fmtDuration;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const service = this.route.parent?.snapshot.paramMap.get('service') || '';
    this.api.getDbReport(service).subscribe((queries) => {
      this.queries = queries;
      this.loading = false;
    });
  }
}
