import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ApiService } from './core/api.service';
import { GlobalTimebarComponent } from './core/global-timebar.component';
import { ServiceFilterService } from './core/service-filter.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    DropdownModule,
    ButtonModule,
    GlobalTimebarComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  services: string[] = [];

  constructor(
    private api: ApiService,
    public serviceFilter: ServiceFilterService,
  ) {}

  ngOnInit(): void {
    this.api.getServices().subscribe((s) => (this.services = s));
  }
}
