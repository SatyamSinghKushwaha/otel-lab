import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ApiService } from '../core/api.service';
import { ServiceFilterService } from '../core/service-filter.service';
import { MetricPoint } from '../core/models';
import { fmtTime } from '../core/format.util';

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, ChartModule, TableModule],
  templateUrl: './metrics.component.html',
})
export class MetricsComponent implements OnInit {
  names: string[] = [];
  activeMetric: string | null = null;
  points: MetricPoint[] = [];
  chartData: any = null;
  chartOptions: any = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#9aa2ad' }, grid: { color: '#2a2e37' } },
      y: { ticks: { color: '#9aa2ad' }, grid: { color: '#2a2e37' } },
    },
  };

  fmtTime = fmtTime;

  constructor(
    private api: ApiService,
    public serviceFilter: ServiceFilterService,
  ) {}

  ngOnInit(): void {
    this.api.getMetricNames().subscribe((names) => {
      this.names = names;
      if (names.length) {
        this.activeMetric = names[0];
        this.loadData();
      }
    });
  }

  loadData(): void {
    if (!this.activeMetric) return;
    this.api.getMetricData(this.activeMetric, this.serviceFilter.selected() || undefined).subscribe((points) => {
      this.points = points;
      this.chartData = {
        labels: points.map((p) => new Date(p.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: this.activeMetric,
            data: points.map((p) => p.value),
            borderColor: '#5b9cff',
            backgroundColor: 'transparent',
            tension: 0.2,
          },
        ],
      };
    });
  }

  recentPointsDesc(): MetricPoint[] {
    return this.points.slice().reverse().slice(0, 50);
  }
}
