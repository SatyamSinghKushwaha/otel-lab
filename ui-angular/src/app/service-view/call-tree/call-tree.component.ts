import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeTableModule } from 'primeng/treetable';
import { TreeNode } from 'primeng/api';
import { ApiService } from '../../core/api.service';
import { CallTreeNode } from '../../core/models';
import { fmtDuration } from '../../core/format.util';
import { DrilldownStateService } from '../service-drilldown/drilldown-state.service';

function toTreeNodes(nodes: CallTreeNode[]): TreeNode[] {
  return nodes.map((n) => ({
    data: n,
    expanded: true,
    children: toTreeNodes(n.children),
  }));
}

@Component({
  selector: 'app-call-tree',
  standalone: true,
  imports: [CommonModule, TreeTableModule],
  templateUrl: './call-tree.component.html',
})
export class CallTreeComponent implements OnInit {
  traceId: string | null = null;
  nodes: TreeNode[] = [];
  loading = false;

  fmtDuration = fmtDuration;

  constructor(
    private api: ApiService,
    public drilldown: DrilldownStateService,
  ) {}

  ngOnInit(): void {
    this.traceId = this.drilldown.selectedTraceId();
    if (!this.traceId) return;
    this.loading = true;
    this.api.getCallTree(this.traceId).subscribe((roots) => {
      this.nodes = toTreeNodes(roots);
      this.loading = false;
    });
  }
}
