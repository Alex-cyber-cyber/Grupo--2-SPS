import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  increment,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';

type DailyStatsDoc = {
  uid: string;
  dateKey: string;
  studySeconds?: number;
  subjectViews?: Record<string, number>;
};

export type DashboardMetrics = {
  weeklyStudyHours: number[];
  weeklyStudyMinutes: number[];
  topSubjects: Array<{ subjectId: string; consultations: number }>;
  currentStreak: number;
  bestStreak: number;
  studyDateKeys: string[];
};

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private static readonly STREAK_MIN_SECONDS = 10 * 60;
  private static readonly LOCAL_SECONDS_PREFIX = 'jm_study_seconds_';
  private static readonly LIVE_SECONDS_PREFIX = 'jm_live_study_seconds_';

  constructor(
    private firestore: Firestore,
    private auth: Auth,
  ) {}

  track(event: string, data?: unknown): void {
    console.log('[EVENT]', event, data ?? {});
  }

  async trackSubjectOpened(subjectId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid || !subjectId) return;

    const now = new Date();
    const dateKey = this.toDateKey(now);
    const statsRef = doc(this.firestore, 'userDailyStats', `${uid}_${dateKey}`);
    const eventRef = doc(collection(this.firestore, 'studyEvents'));

    try {
      const batch = writeBatch(this.firestore);

      batch.set(eventRef, {
        uid,
        subjectId,
        eventType: 'subject_opened',
        createdAt: serverTimestamp(),
      });

      batch.set(
        statsRef,
        {
          uid,
          dateKey,
          totalConsultations: increment(1),
          [`subjectViews.${subjectId}`]: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();
    } catch (error) {
      console.error('No se pudo registrar subject_opened', { uid, subjectId, error });
    }
  }

  async recordStudyTime(subjectId: string, durationSeconds: number): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid || !subjectId || durationSeconds <= 0) return;

    const now = new Date();
    const dateKey = this.toDateKey(now);
    const statsRef = doc(this.firestore, 'userDailyStats', `${uid}_${dateKey}`);
    const eventRef = doc(collection(this.firestore, 'studyEvents'));

    try {
      const batch = writeBatch(this.firestore);

      batch.set(eventRef, {
        uid,
        subjectId,
        eventType: 'study_time_logged',
        durationSeconds,
        createdAt: serverTimestamp(),
      });

      batch.set(
        statsRef,
        {
          uid,
          dateKey,
          studySeconds: increment(durationSeconds),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();
    } catch (error) {
      console.error('No se pudo registrar study_time_logged', { uid, subjectId, durationSeconds, error });
      this.addLocalStudySeconds(uid, dateKey, durationSeconds);
    }
  }

  async recordSessionStudyTime(durationSeconds: number, uidOverride?: string): Promise<void> {
    const uid = uidOverride || this.auth.currentUser?.uid;
    if (!uid || durationSeconds <= 0) return;

    const now = new Date();
    const dateKey = this.toDateKey(now);
    const statsRef = doc(this.firestore, 'userDailyStats', `${uid}_${dateKey}`);
    const eventRef = doc(collection(this.firestore, 'studyEvents'));

    try {
      const batch = writeBatch(this.firestore);

      batch.set(eventRef, {
        uid,
        eventType: 'session_time_logged',
        durationSeconds,
        createdAt: serverTimestamp(),
      });

      batch.set(
        statsRef,
        {
          uid,
          dateKey,
          studySeconds: increment(durationSeconds),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();
    } catch (error) {
      console.error('No se pudo registrar session_time_logged', { uid, durationSeconds, error });
      this.addLocalStudySeconds(uid, dateKey, durationSeconds);
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      return {
        weeklyStudyHours: new Array(7).fill(0),
        weeklyStudyMinutes: new Array(7).fill(0),
        topSubjects: [],
        currentStreak: 0,
        bestStreak: 0,
        studyDateKeys: [],
      };
    }

    const statsQuery = query(collection(this.firestore, 'userDailyStats'), where('uid', '==', uid));
    let snapshot;
    try {
      snapshot = await getDocsFromServer(statsQuery);
    } catch {
      snapshot = await getDocs(statsQuery);
    }

    const docs: DailyStatsDoc[] = snapshot.docs.map((d) => d.data() as DailyStatsDoc);
    const byDate = new Map<string, DailyStatsDoc>();
    const subjectTotals = new Map<string, number>();

    for (const item of docs) {
      if (!item.dateKey) continue;
      byDate.set(item.dateKey, item);

      const views = item.subjectViews ?? {};
      for (const [subjectId, count] of Object.entries(views)) {
        if (!subjectId) continue;
        const current = subjectTotals.get(subjectId) ?? 0;
        subjectTotals.set(subjectId, current + (Number(count) || 0));
      }
    }

    const localSeconds = this.readLocalStudySeconds(uid);
    for (const [dateKey, seconds] of localSeconds.entries()) {
      const existing = byDate.get(dateKey) ?? { uid, dateKey, studySeconds: 0 };
      const current = Number(existing.studySeconds) || 0;
      existing.studySeconds = current + seconds;
      byDate.set(dateKey, existing);
    }

    const liveSession = this.readLiveStudySeconds(uid);
    for (const [dateKey, seconds] of liveSession.entries()) {
      const existing = byDate.get(dateKey) ?? { uid, dateKey, studySeconds: 0 };
      const current = Number(existing.studySeconds) || 0;
      existing.studySeconds = current + seconds;
      byDate.set(dateKey, existing);
    }

    const { weeklyStudyHours, weeklyStudyMinutes } = this.buildCurrentWeek(byDate);
    const { currentStreak, bestStreak } = this.computeStreaks(byDate);
    const studyDateKeys = [...byDate.entries()]
      .filter(([, item]) => (Number(item.studySeconds) || 0) > 0)
      .map(([dateKey]) => dateKey)
      .sort();
    const topSubjects = [...subjectTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subjectId, consultations]) => ({ subjectId, consultations }));

    return {
      weeklyStudyHours,
      weeklyStudyMinutes,
      topSubjects,
      currentStreak,
      bestStreak,
      studyDateKeys,
    };
  }

  private buildCurrentWeek(byDate: Map<string, DailyStatsDoc>): {
    weeklyStudyHours: number[];
    weeklyStudyMinutes: number[];
  } {
    const now = new Date();
    const monday = this.getMonday(now);
    const weeklyStudyHours: number[] = [];
    const weeklyStudyMinutes: number[] = [];

    for (let i = 0; i < 7; i++) {
      const day = this.addDays(monday, i);
      const dateKey = this.toDateKey(day);
      const studySeconds = byDate.get(dateKey)?.studySeconds ?? 0;
      const minutes = Math.round((Number(studySeconds) || 0) / 60);
      const hours = Math.round(((Number(studySeconds) || 0) / 3600) * 10) / 10;
      weeklyStudyHours.push(hours);
      weeklyStudyMinutes.push(minutes);
    }

    return { weeklyStudyHours, weeklyStudyMinutes };
  }

  private computeStreaks(byDate: Map<string, DailyStatsDoc>): { currentStreak: number; bestStreak: number } {
    const eligibleDateKeys = [...byDate.entries()]
      .filter(([, item]) => (Number(item.studySeconds) || 0) >= EventsService.STREAK_MIN_SECONDS)
      .map(([dateKey]) => dateKey)
      .sort();

    if (!eligibleDateKeys.length) return { currentStreak: 0, bestStreak: 0 };

    const eligibleSet = new Set(eligibleDateKeys);

    let currentStreak = 0;
    let cursor = new Date();
    while (eligibleSet.has(this.toDateKey(cursor))) {
      currentStreak++;
      cursor = this.addDays(cursor, -1);
    }

    let bestStreak = 1;
    let run = 1;
    for (let i = 1; i < eligibleDateKeys.length; i++) {
      const prev = this.fromDateKey(eligibleDateKeys[i - 1]);
      const current = this.fromDateKey(eligibleDateKeys[i]);
      const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) run++;
      else run = 1;
      if (run > bestStreak) bestStreak = run;
    }

    return { currentStreak, bestStreak };
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private fromDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private getMonday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private localKey(uid: string): string {
    return `${EventsService.LOCAL_SECONDS_PREFIX}${uid}`;
  }

  private readLocalStudySeconds(uid: string): Map<string, number> {
    if (typeof window === 'undefined' || !window.localStorage) return new Map<string, number>();

    try {
      const raw = window.localStorage.getItem(this.localKey(uid));
      if (!raw) return new Map<string, number>();
      const parsed = JSON.parse(raw) as Record<string, number>;
      const entries = Object.entries(parsed)
        .map(([k, v]) => [k, Number(v)] as const)
        .filter(([, v]) => Number.isFinite(v) && v > 0);
      return new Map<string, number>(entries);
    } catch {
      return new Map<string, number>();
    }
  }

  private addLocalStudySeconds(uid: string, dateKey: string, seconds: number): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    if (!safeSeconds) return;

    try {
      const current = this.readLocalStudySeconds(uid);
      const prev = current.get(dateKey) ?? 0;
      current.set(dateKey, prev + safeSeconds);

      const asObject: Record<string, number> = {};
      for (const [k, v] of current.entries()) asObject[k] = v;
      window.localStorage.setItem(this.localKey(uid), JSON.stringify(asObject));
    } catch {}
  }


  getLiveStudyStorageKey(uid: string): string {
    return `${EventsService.LIVE_SECONDS_PREFIX}${uid}`;
  }

  private readLiveStudySeconds(uid: string): Map<string, number> {
    if (typeof window === 'undefined' || !window.sessionStorage) return new Map<string, number>();

    try {
      const raw = window.sessionStorage.getItem(this.getLiveStudyStorageKey(uid));
      if (!raw) return new Map<string, number>();
      const parsed = JSON.parse(raw) as Record<string, number>;
      const entries = Object.entries(parsed)
        .map(([k, v]) => [k, Number(v)] as const)
        .filter(([, v]) => Number.isFinite(v) && v > 0);
      return new Map<string, number>(entries);
    } catch {
      return new Map<string, number>();
    }
  }
}

}

