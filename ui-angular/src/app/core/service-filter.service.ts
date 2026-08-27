import { Injectable, signal } from '@angular/core';

// The header's service dropdown. Only Traces/Metrics/Logs read this --
// Service View's drilldown scoping comes from its own route param instead.
@Injectable({ providedIn: 'root' })
export class ServiceFilterService {
  readonly selected = signal<string>('');
}
