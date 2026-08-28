import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  { path: 'landing', loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent) },
  {
    path: 'service-view',
    loadComponent: () =>
      import('./service-view/service-overview/service-overview.component').then((m) => m.ServiceOverviewComponent),
  },
  {
    path: 'service-view/:service',
    loadComponent: () =>
      import('./service-view/service-drilldown/service-drilldown.component').then((m) => m.ServiceDrilldownComponent),
    children: [
      { path: '', redirectTo: 'flowpath', pathMatch: 'full' },
      {
        path: 'flowpath',
        loadComponent: () => import('./service-view/flowpath/flowpath.component').then((m) => m.FlowpathComponent),
      },
      {
        path: 'call-tree',
        loadComponent: () => import('./service-view/call-tree/call-tree.component').then((m) => m.CallTreeComponent),
      },
      {
        path: 'method-timing',
        loadComponent: () =>
          import('./service-view/method-timing/method-timing.component').then((m) => m.MethodTimingComponent),
      },
      {
        path: 'db-report',
        loadComponent: () => import('./service-view/db-report/db-report.component').then((m) => m.DbReportComponent),
      },
      {
        path: 'service-map',
        loadComponent: () =>
          import('./service-view/service-map/service-map.component').then((m) => m.ServiceMapComponent),
      },
    ],
  },
  {
    path: 'traces',
    loadComponent: () => import('./traces/traces.component').then((m) => m.TracesComponent),
  },
  {
    path: 'metrics',
    loadComponent: () => import('./metrics/metrics.component').then((m) => m.MetricsComponent),
  },
  {
    path: 'logs',
    loadComponent: () => import('./logs/logs.component').then((m) => m.LogsComponent),
  },
];
