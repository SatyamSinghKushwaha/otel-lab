import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  template: `
  <div class="landing">
    <h2>Welcome to OTel Lab</h2>
    <p>Use the global time selector above to pick a window, then open the OTel Service View.</p>
    <button pButton type="button" label="Open OTel Service View" (click)="open()"></button>
  </div>
  `,
  styles: [`.landing { padding: 2rem; text-align: center }`]
})
export class LandingComponent {
  constructor(private router: Router) {}
  open() { this.router.navigate(['/service-view']); }
}
