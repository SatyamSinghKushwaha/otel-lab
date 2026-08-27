import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import { ApiService } from '../../core/api.service';
import { ServiceMap } from '../../core/models';
import { fmtDuration } from '../../core/format.util';

// Cavisson's own transaction-service-map is built on JSPlumb Toolkit, a
// commercial diagramming library we don't have a license for. Cytoscape.js
// is the free/open-source equivalent used here -- same idea (nodes = services,
// edges = calls between them, laid out hierarchically), different engine.
@Component({
  selector: 'app-service-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-map.component.html',
  styleUrl: './service-map.component.scss',
})
export class ServiceMapComponent implements OnInit, AfterViewInit {
  @ViewChild('graph', { static: true }) graphEl!: ElementRef<HTMLDivElement>;

  service = '';
  data: ServiceMap | null = null;
  loading = true;
  cy: Core | null = null;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.service = this.route.parent?.snapshot.paramMap.get('service') || '';
    this.api.getServiceMap(this.service).subscribe((data) => {
      this.data = data;
      this.loading = false;
      this.render();
    });
  }

  ngAfterViewInit(): void {
    if (this.data) this.render();
  }

  private render(): void {
    if (!this.data || !this.graphEl || this.data.nodes.length === 0) return;

    const elements: ElementDefinition[] = [
      ...this.data.nodes.map((n) => ({
        data: { id: n.service, label: `${n.service} (${n.spanCount})` },
      })),
      ...this.data.edges.map((e) => ({
        data: {
          id: `${e.from}=>${e.to}`,
          source: e.from,
          target: e.to,
          label: `${e.count}x, avg ${fmtDuration(e.avgDurationMs)}`,
        },
      })),
    ];

    this.cy?.destroy();
    this.cy = cytoscape({
      container: this.graphEl.nativeElement,
      elements,
      layout: { name: 'breadthfirst', directed: true, padding: 30, spacingFactor: 1.4 },
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#171a21',
            'border-color': '#5b9cff',
            'border-width': 1.5,
            shape: 'round-rectangle',
            color: '#e6e8eb',
            'font-size': 11,
            'text-valign': 'center',
            'text-halign': 'center',
            padding: '10px',
            width: 'label',
            height: 30,
          },
        },
        {
          selector: 'edge',
          style: {
            label: 'data(label)',
            'font-size': 10,
            color: '#9aa2ad',
            'line-color': '#9aa2ad',
            'target-arrow-color': '#9aa2ad',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            width: 1.5,
          },
        },
      ],
    });
  }
}
