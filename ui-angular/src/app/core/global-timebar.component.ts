import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { TimeService } from './time.service';

@Component({
  selector: 'app-global-timebar',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, ButtonModule],
  template: `
  <div class="timebar">
    <p-dropdown [options]="options" [(ngModel)]="selected" (ngModelChange)="onChange($event)"></p-dropdown>
    <button pButton type="button" label="Open Service View" (click)="open()"></button>
  </div>
  `,
  styles: [`.timebar { display:flex; gap:1rem; align-items:center; padding:0.5rem }`]
})
export class GlobalTimebarComponent {
  options = [
    { label: '15 minutes', value: 15 },
    { label: '60 minutes', value: 60 },
    { label: '4 hours', value: 240 },
    { label: '24 hours', value: 1440 },
  ];
  selected = 60;
  constructor(private time: TimeService) {
    this.time.setWindow(this.selected);
  }
  onChange(v: number) { this.time.setWindow(v); }
  open() { window.location.href = '/service-view'; }
}
