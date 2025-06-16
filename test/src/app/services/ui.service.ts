import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UiService {
  private sidebarOpen = new BehaviorSubject<boolean>(false);
  sidebarOpen$ = this.sidebarOpen.asObservable();

  constructor() { }

  openSidebar(): void {
    this.sidebarOpen.next(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.next(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.next(!this.sidebarOpen.value);
  }
}
