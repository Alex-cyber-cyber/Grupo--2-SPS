import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from '@angular/fire/firestore';

export type AppNotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  read: boolean;
  source?: string;
  createdAt?: unknown;
  createdAtMs?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly firestore = inject(Firestore);
  private audioContext?: AudioContext;

  observeUserNotifications(
    uid: string,
    handler: (items: AppNotification[]) => void,
    errorHandler?: (error: unknown) => void,
  ) {
    const ref = query(
      collection(this.firestore, `users/${uid}/notifications`),
      orderBy('createdAtMs', 'desc'),
      limit(20),
    );

    return onSnapshot(
      ref,
      (snapshot) => {
        const items: AppNotification[] = snapshot.docs.map((d) => {
          const data = d.data() as any;

          return {
            id: d.id,
            title: String(data?.title ?? ''),
            message: String(data?.message ?? ''),
            type: (data?.type ?? 'info') as AppNotificationType,
            read: Boolean(data?.read),
            source: data?.source ? String(data.source) : undefined,
            createdAt: data?.createdAt ?? null,
            createdAtMs: Number(data?.createdAtMs ?? 0),
          };
        });

        handler(items);
      },
      (error) => {
        console.error('No se pudieron leer las notificaciones', error);
        handler([]);
        errorHandler?.(error);
      },
    );
  }

  async createNotification(
    uid: string,
    payload: {
      title: string;
      message: string;
      type?: AppNotificationType;
      source?: string;
    },
  ) {
    try {
      const ref = await addDoc(collection(this.firestore, `users/${uid}/notifications`), {
        title: payload.title,
        message: payload.message,
        type: payload.type ?? 'info',
        read: false,
        source: payload.source ?? 'app',
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });

      return ref.id;
    } catch (error) {
      console.error('No se pudo crear la notificación', { uid, payload, error });
      throw error;
    }
  }

  async markAllAsRead(uid: string) {
    const ref = query(
      collection(this.firestore, `users/${uid}/notifications`),
      where('read', '==', false),
    );

    const snap = await getDocs(ref);
    if (snap.empty) return;

    const batch = writeBatch(this.firestore);

    snap.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });

    await batch.commit();
  }

  async playTone(type: AppNotificationType = 'info') {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtor) return;

    if (!this.audioContext) {
      this.audioContext = new AudioCtor();
    }

    const ctx = this.audioContext;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    oscillator.type = 'sine';

    if (type === 'success') {
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
    } else if (type === 'error') {
      oscillator.frequency.setValueAtTime(280, now);
      oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.18);
    } else {
      oscillator.frequency.setValueAtTime(720, now);
      oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.24);
  }
}