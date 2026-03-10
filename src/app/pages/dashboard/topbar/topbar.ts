import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { User } from '@angular/fire/auth';
import { Unsubscribe } from 'firebase/firestore';

import { AuthService } from '../../../auth/services/auth.service';
import { UiService } from '../../../services/ui.service';
import {
  NotificationsService,
  AppNotification,
} from '../../../services/notifications.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class TopbarComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly auth = inject(AuthService);

  user$: Observable<User | null> = this.auth.user$;

  showNotifications = false;
  notifications: AppNotification[] = [];
  unreadCount = 0;

  private authSub?: Subscription;
  private notificationsUnsub?: Unsubscribe;
  private currentUid = '';
  private bootstrapped = false;
  private knownIds = new Set<string>();

  ngOnInit(): void {
    this.authSub = this.user$.subscribe((user) => {
      const uid = user?.uid ?? '';

      if (uid === this.currentUid) return;

      this.currentUid = uid;
      this.notifications = [];
      this.unreadCount = 0;
      this.bootstrapped = false;
      this.knownIds.clear();

      if (this.notificationsUnsub) {
        this.notificationsUnsub();
        this.notificationsUnsub = undefined;
      }

      if (!uid) return;

      this.notificationsUnsub = this.notificationsService.observeUserNotifications(
        uid,
        (items) => {
          const newItems = items.filter((item) => !this.knownIds.has(item.id));

          this.notifications = items;
          this.unreadCount = items.filter((item) => !item.read).length;
          this.knownIds = new Set(items.map((item) => item.id));

          if (this.bootstrapped && newItems.length > 0) {
            void this.notificationsService.playTone(newItems[0].type);
          }

          this.bootstrapped = true;
        },
        () => {
          this.notifications = [];
          this.unreadCount = 0;
        },
      );
    });
  }

  ngOnDestroy(): void {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }

    if (this.notificationsUnsub) {
      this.notificationsUnsub();
    }
  }

  toggleSidebar(): void {
    this.ui.toggleSidebar();
  }

  async toggleNotifications(): Promise<void> {
    this.showNotifications = !this.showNotifications;

    if (this.showNotifications && this.currentUid) {
      await this.notificationsService.markAllAsRead(this.currentUid);
    }
  }

  @HostListener('document:click', ['$event'])
  closeNotifications(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.notification-container')) {
      this.showNotifications = false;
    }
  }
}