import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ApiService } from '../../core/api.service';
import { ServiceHealth } from '../../core/models';
import { fmtDuration, fmtPct } from '../../core/format.util';

@Component({
  selector: 'app-service-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, DropdownModule],
  templateUrl: './service-overview.component.html',
})
export class ServiceOverviewComponent implements OnInit {
  services: ServiceHealth[] = [];
  loading = true;
  windowMinutes = 15;
  windowOptions = [
    { label: 'last 5 min', value: 5 },
    { label: 'last 15 min', value: 15 },
    { label: 'last 60 min', value: 60 },
    { label: 'last 24 hr', value: 1440 },
  ];

  fmtDuration = fmtDuration;
  fmtPct = fmtPct;

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getServiceHealth(this.windowMinutes).subscribe((services) => {
      this.services = services;
      this.loading = false;
    });
  }

  openService(service: string): void {
    this.router.navigate(['/service-view', service]);
  }
}
