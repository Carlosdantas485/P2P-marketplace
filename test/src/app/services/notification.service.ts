import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface Notification {
  id: string;
  type: 'purchase' | 'sale';
  message: string;
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notifications = new BehaviorSubject<Notification[]>([]);

  readonly notifications$ = this._notifications.asObservable();
  readonly totalNotificationCount$ = this.notifications$.pipe(
    map(notifications => notifications.filter(n => !n.read).length)
  );

  constructor() {
    // Simulate fetching initial notifications
    this.fetchNotifications();
  }

  fetchNotifications(): void {
    // Simulate API call to get a list of notifications
    const simulatedNotifications: Notification[] = [
      {
        id: '1',
        type: 'purchase',
        message: 'Você comprou um item: AK-47 | Redline (Field-Tested)',
        timestamp: new Date(Date.now() - 3600 * 1000),
        read: false,
      },
      {
        id: '2',
        type: 'sale',
        message: 'Você vendeu um item: M4A4 | Asiimov (Well-Worn)',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000),
        read: false,
      },
      {
        id: '3',
        type: 'purchase',
        message: 'Você comprou um item: AWP | Gungnir (Factory New)',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000),
        read: true,
      },
      {
        id: '4',
        type: 'sale',
        message: 'Você vendeu um item: Karambit | Doppler (Factory New)',
        timestamp: new Date(Date.now() - 48 * 3600 * 1000),
        read: false,
      },
    ];

    of(simulatedNotifications).pipe(delay(500)).subscribe(notifications => {
      console.log('NotificationService: Emitting notifications', notifications);
      this._notifications.next(notifications);
    });
  }

  markAsRead(notificationId: string): void {
    const currentNotifications = this._notifications.getValue();
    const updatedNotifications = currentNotifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    this._notifications.next(updatedNotifications);
  }

  markAllAsRead(): void {
    const currentNotifications = this._notifications.getValue();
    const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));
    this._notifications.next(updatedNotifications);
  }

  // In a real application, you would have methods to mark notifications as read,
  // add new notifications, etc.
}
