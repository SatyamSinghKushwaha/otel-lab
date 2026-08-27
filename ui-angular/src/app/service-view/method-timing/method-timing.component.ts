import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../core/api.service';
import { MethodTimingRow } from '../../core/models';
import { fmtDuration, fmtPct } from '../../core/format.util';

@Component({
  selector: 'app-method-timing',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './method-timing.component.html',
})
export class MethodTimingComponent implements OnInit {
  methods: MethodTimingRow[] = [];
  loading = true;

  fmtDuration = fmtDuration;
  fmtPct = fmtPct;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const service = this.route.parent?.snapshot.paramMap.get('service') || '';
    this.api.getMethodTiming(service).subscribe((methods) => {
      this.methods = methods;
      this.loading = false;
    });
  }
}
