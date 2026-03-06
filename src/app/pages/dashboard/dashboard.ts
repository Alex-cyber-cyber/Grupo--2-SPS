import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';




import { TopbarComponent } from './topbar/topbar';

import { SidebarComponent } from './sidebar/sidebar';

import { EventsService } from '../../services/events/events.service';

import { TopbarComponent } from './topbar/topbar';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly auth = inject(Auth);
  private readonly eventsService = inject(EventsService);

  private uid: string | null = null;
  private authUnsubscribe?: () => void;
  private autoFlushTimer: ReturnType<typeof setInterval> | null = null;

  private sessionStartedAtMs: number | null = null;
  private sessionAccumulatedMs = 0;
  private readonly minFlushSeconds = 60;

  private readonly visibilityHandler = () => {
    if (document.hidden) {
      this.pauseSession();
      this.flushSession(false);
      return;
    }

    this.resumeSession();
  };

  private readonly pageHideHandler = () => {
    this.flushSession(true);
  };

  ngOnInit(): void {
    if (!this.isBrowser) return;

    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('pagehide', this.pageHideHandler);
    window.addEventListener('beforeunload', this.pageHideHandler);

    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      this.uid = user?.uid ?? null;
      if (!this.uid) {
        this.flushSession(true);
        return;
      }
      this.resumeSession();
    });

    this.autoFlushTimer = setInterval(() => {
      this.flushSession(false);
      this.resumeSession();
    }, 60000);
  }

  ngOnDestroy(): void {
    this.flushSession(true);

    this.authUnsubscribe?.();

    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
      this.autoFlushTimer = null;
    }

    if (this.isBrowser) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      window.removeEventListener('pagehide', this.pageHideHandler);
      window.removeEventListener('beforeunload', this.pageHideHandler);
    }
  }

  private resumeSession(): void {
    if (!this.uid) return;
    if (document.hidden) return;
    if (this.sessionStartedAtMs != null) return;

    this.sessionStartedAtMs = Date.now();
  }

  private pauseSession(): void {
    if (this.sessionStartedAtMs == null) return;

    this.sessionAccumulatedMs += Date.now() - this.sessionStartedAtMs;
    this.sessionStartedAtMs = null;
  }

  private flushSession(force: boolean): void {
    if (!this.uid) return;

    this.pauseSession();

    const totalSeconds = Math.floor(this.sessionAccumulatedMs / 1000);
    if (!force && totalSeconds < this.minFlushSeconds) return;
    if (totalSeconds <= 0) return;

    this.sessionAccumulatedMs -= totalSeconds * 1000;
    void this.eventsService.recordSessionStudyTime(totalSeconds, this.uid);
  }
}
