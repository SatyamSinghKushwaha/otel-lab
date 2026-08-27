import { Injectable, signal } from '@angular/core';

// Provided at the ServiceDrilldownComponent level (see its @Component providers),
// so it's a fresh instance per service drilled into, and Flowpath/Call Tree --
// both children of the same routed shell -- share the currently selected trace.
@Injectable()
export class DrilldownStateService {
  readonly selectedTraceId = signal<string | null>(null);
}
