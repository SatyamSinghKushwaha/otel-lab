import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TimeService {
  private windowMinutes$ = new BehaviorSubject<number>(60);

  setWindow(minutes: number) {
    this.windowMinutes$.next(minutes);
  }

  getWindow$() {
    return this.windowMinutes$.asObservable();
  }

  getWindow() {
    return this.windowMinutes$.value;
  }
}
