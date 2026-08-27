import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DrilldownStateService } from './drilldown-state.service';

@Component({
  selector: 'app-service-drilldown',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  providers: [DrilldownStateService],
  templateUrl: './service-drilldown.component.html',
  styleUrl: './service-drilldown.component.scss',
})
export class ServiceDrilldownComponent {
  service: string;

  constructor(route: ActivatedRoute) {
    this.service = route.snapshot.paramMap.get('service') || '';
  }
}
