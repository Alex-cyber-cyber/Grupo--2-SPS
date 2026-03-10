import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';




import { TopbarComponent } from './topbar/topbar';

import { SidebarComponent } from './sidebar/sidebar';

import { EventsService } from '../../services/events/events.service';



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
  private liveSyncTimer: ReturnType<typeof setInterval> | null = null;

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
      const previousUid = this.uid;
      this.uid = user?.uid ?? null;
      if (!this.uid) {
        this.clearLiveSessionPreview(previousUid);
        this.flushSession(true);
        return;
      }
      this.resumeSession();
      this.syncLiveSessionPreview();
    });

    this.autoFlushTimer = setInterval(() => {
      this.flushSession(false);
      this.resumeSession();
    }, 60000);

    this.liveSyncTimer = setInterval(() => {
      this.syncLiveSessionPreview();
    }, 15000);
  }

  ngOnDestroy(): void {
    this.clearLiveSessionPreview(this.uid);
    this.flushSession(true);

    this.authUnsubscribe?.();

    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
      this.autoFlushTimer = null;
    }

    if (this.liveSyncTimer) {
      clearInterval(this.liveSyncTimer);
      this.liveSyncTimer = null;
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
    this.syncLiveSessionPreview();
  }

  private pauseSession(): void {
    if (this.sessionStartedAtMs == null) return;

    this.sessionAccumulatedMs += Date.now() - this.sessionStartedAtMs;
    this.sessionStartedAtMs = null;
    this.syncLiveSessionPreview();
  }

  private flushSession(force: boolean): void {
    if (!this.uid) return;

    this.pauseSession();

    const totalSeconds = Math.floor(this.sessionAccumulatedMs / 1000);
    if (!force && totalSeconds < this.minFlushSeconds) return;
    if (totalSeconds <= 0) return;

    this.sessionAccumulatedMs -= totalSeconds * 1000;
    this.syncLiveSessionPreview();
    void this.eventsService.recordSessionStudyTime(totalSeconds, this.uid);
  }

  private syncLiveSessionPreview(): void {
    if (!this.isBrowser || !this.uid || !window.sessionStorage) return;

    const totalMs =
      this.sessionAccumulatedMs +
      (this.sessionStartedAtMs != null ? Math.max(0, Date.now() - this.sessionStartedAtMs) : 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const dateKey = this.toDateKey(new Date());

    try {
      if (totalSeconds <= 0) {
        window.sessionStorage.removeItem(this.eventsService.getLiveStudyStorageKey(this.uid));
        return;
      }

      window.sessionStorage.setItem(
        this.eventsService.getLiveStudyStorageKey(this.uid),
        JSON.stringify({ [dateKey]: totalSeconds }),
      );
    } catch {}
  }

  private clearLiveSessionPreview(uid: string | null): void {
    if (!this.isBrowser || !window.sessionStorage) return;
    if (!uid) return;

    try {
      window.sessionStorage.removeItem(this.eventsService.getLiveStudyStorageKey(uid));
    } catch {}
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
