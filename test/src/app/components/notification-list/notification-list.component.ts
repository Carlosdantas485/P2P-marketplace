import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { Notification, NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class NotificationListComponent implements OnInit, OnDestroy {
  @Input() notifications$!: Observable<Notification[]>;
  notifications: Notification[] = [];
  private notificationsSubscription: Subscription | undefined;

  constructor(private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.notificationsSubscription = this.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
  }

  ngOnDestroy(): void {
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }

  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
}
