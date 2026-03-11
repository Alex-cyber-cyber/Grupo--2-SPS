import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
  runTransaction,
} from '@angular/fire/firestore';
import { ExamDifficulty, GeneratedExam } from './open-router.service';

export type ExamDoc = {
  id: string;
  uid: string;
  name: string;
  topic: string;
  difficulty: ExamDifficulty;
  subjectId: string | null;
  exam: GeneratedExam;
  createdAt: Date;
  updatedAt: Date;
  results?: ExamResults;
  completedAttempts?: number;
  completedHistory?: Date[];
  completedDurations?: number[];
};

export type ExamResults = {
  completed: boolean;
  score: number;
  totalPoints: number;
  answers: Record<string, { selected: string | number; correct: boolean }>;
  completedAt?: Date;
};

export type CreateExamPayload = {
  name: string;
  topic: string;
  difficulty: ExamDifficulty;
  subjectId?: string;
  exam: GeneratedExam;
};

@Injectable({ providedIn: 'root' })
export class ExamsService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
  ) {}

  private getCurrentUserOrThrow() {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    return user;
  }

  private normalizeBaseName(subjectName: string): string {
    const value = String(subjectName ?? '').trim();
    return value || 'Examen';
  }

  private formatSequentialName(baseName: string, sequence: number): string {
    const safeSequence = Math.max(1, Math.floor(Number(sequence) || 1));
    return `${baseName} ${String(safeSequence).padStart(2, '0')}`;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async getExistingMaxExamSequence(subjectId: string, subjectName: string): Promise<number> {
    const user = this.getCurrentUserOrThrow();
    const baseName = this.normalizeBaseName(subjectName);
    const rx = new RegExp(`^${this.escapeRegex(baseName)}\\s+(\\d+)$`);

    const ref = collection(this.firestore, 'exams');
    const q = query(ref, where('uid', '==', user.uid));
    const snapshot = await getDocs(q);

    let max = 0;

    snapshot.docs.forEach((d) => {
      const data = d.data();
      const currentSubjectId = data['subjectId'] ?? null;
      if (currentSubjectId !== subjectId) return;

      const name = String(data['name'] ?? '').trim();
      const match = name.match(rx);
      if (!match) return;

      const current = Number.parseInt(match[1], 10);
      if (Number.isFinite(current) && current > max) {
        max = current;
      }
    });

    return max;
  }

  async getNextExamNamePreview(subjectId: string, subjectName: string): Promise<string> {
    this.getCurrentUserOrThrow();

    const baseName = this.normalizeBaseName(subjectName);
    const subjectRef = doc(this.firestore, 'subjects', subjectId);
    const subjectSnap = await getDoc(subjectRef);

    let currentSequence = 0;

    if (subjectSnap.exists()) {
      const data = subjectSnap.data() as any;
      currentSequence = Number(data?.examSequence ?? 0);
    }

    if (!Number.isFinite(currentSequence) || currentSequence < 0) {
      currentSequence = 0;
    }

    if (currentSequence === 0) {
      currentSequence = await this.getExistingMaxExamSequence(subjectId, subjectName);
    }

    return this.formatSequentialName(baseName, currentSequence + 1);
  }

  async reserveNextExamName(subjectId: string, subjectName: string): Promise<string> {
    this.getCurrentUserOrThrow();

    const baseName = this.normalizeBaseName(subjectName);
    const existingMax = await this.getExistingMaxExamSequence(subjectId, subjectName);
    const subjectRef = doc(this.firestore, 'subjects', subjectId);

    const nextSequence = await runTransaction(this.firestore, async (transaction) => {
      const subjectSnap = await transaction.get(subjectRef);

      let currentSequence = 0;

      if (subjectSnap.exists()) {
        const data = subjectSnap.data() as any;
        currentSequence = Number(data?.examSequence ?? 0);
      }

      if (!Number.isFinite(currentSequence) || currentSequence < 0) {
        currentSequence = 0;
      }

      if (existingMax > currentSequence) {
        currentSequence = existingMax;
      }

      const next = currentSequence + 1;

      transaction.set(
        subjectRef,
        {
          examSequence: next,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      return next;
    });

    return this.formatSequentialName(baseName, nextSequence);
  }

  async createExam(payload: CreateExamPayload): Promise<string> {
    const user = this.getCurrentUserOrThrow();

    const name = (payload.name || '').trim();
    if (!name) throw new Error('name requerido');
    if (!payload.exam) throw new Error('exam requerido');

    const ref = collection(this.firestore, 'exams');

    const docRef = await addDoc(ref, {
      uid: user.uid,
      name,
      nameLower: name.toLowerCase(),
      topic: (payload.topic || '').trim(),
      difficulty: payload.difficulty || 'intermedio',
      subjectId: payload.subjectId ?? null,
      exam: payload.exam,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async getMyExams(): Promise<ExamDoc[]> {
    const user = this.getCurrentUserOrThrow();

    const ref = collection(this.firestore, 'exams');
    const q = query(ref, where('uid', '==', user.uid));
    const snapshot = await getDocs(q);

    const exams = snapshot.docs.map((d) => {
      const data = d.data();
      const completedHistoryRaw = Array.isArray(data['completedHistory'])
        ? (data['completedHistory'] as unknown[])
        : [];
      const completedHistory = completedHistoryRaw
        .map((x) => this.toDate(x))
        .filter((x): x is Date => x instanceof Date);

      const completedDurationsRaw = Array.isArray(data['completedDurations'])
        ? (data['completedDurations'] as unknown[])
        : [];
      const completedDurations = completedDurationsRaw
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x) && x > 0);

      return {
        id: d.id,
        uid: data['uid'],
        name: data['name'],
        topic: data['topic'] || '',
        difficulty: data['difficulty'] || 'intermedio',
        subjectId: data['subjectId'] ?? null,
        exam: data['exam'] as GeneratedExam,
        createdAt: (data['createdAt'] as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data['updatedAt'] as Timestamp)?.toDate() ?? new Date(),
        results: data['results'] ?? undefined,
        completedAttempts: Number(data['completedAttempts']) || 0,
        completedHistory,
        completedDurations,
      };
    });

    exams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return exams;
  }

  async getExam(id: string): Promise<ExamDoc | null> {
    const user = this.getCurrentUserOrThrow();

    const docRef = doc(this.firestore, 'exams', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    if (data['uid'] !== user.uid) return null;

    const completedHistoryRaw = Array.isArray(data['completedHistory'])
      ? (data['completedHistory'] as unknown[])
      : [];
    const completedHistory = completedHistoryRaw
      .map((x) => this.toDate(x))
      .filter((x): x is Date => x instanceof Date);

    const completedDurationsRaw = Array.isArray(data['completedDurations'])
      ? (data['completedDurations'] as unknown[])
      : [];
    const completedDurations = completedDurationsRaw
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);

    return {
      id: snap.id,
      uid: data['uid'],
      name: data['name'],
      topic: data['topic'] || '',
      difficulty: data['difficulty'] || 'intermedio',
      subjectId: data['subjectId'] ?? null,
      exam: data['exam'] as GeneratedExam,
      createdAt: (data['createdAt'] as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data['updatedAt'] as Timestamp)?.toDate() ?? new Date(),
      results: data['results'] ?? undefined,
      completedAttempts: Number(data['completedAttempts']) || 0,
      completedHistory,
      completedDurations,
    };
  }

  async saveResults(examId: string, results: ExamResults, attemptDurationMinutes?: number): Promise<void> {
    const user = this.getCurrentUserOrThrow();

    const docRef = doc(this.firestore, 'exams', examId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Examen no encontrado');
    if (snap.data()['uid'] !== user.uid) throw new Error('No autorizado');

    const data = snap.data();
    const rawHistory = Array.isArray(data['completedHistory']) ? (data['completedHistory'] as unknown[]) : [];
    const history = rawHistory
      .map((x) => this.toDate(x))
      .filter((x): x is Date => x instanceof Date)
      .map((x) => x.toISOString());

    const rawDurations = Array.isArray(data['completedDurations']) ? (data['completedDurations'] as unknown[]) : [];
    const durations = rawDurations
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);

    const safeDuration = Math.max(1, Math.round(Number(attemptDurationMinutes) || 0));
    history.push(new Date().toISOString());
    durations.push(safeDuration);

    await updateDoc(docRef, {
      results,
      completedAttempts: history.length,
      completedHistory: history,
      completedDurations: durations,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteExam(id: string): Promise<void> {
    const user = this.getCurrentUserOrThrow();

    const docRef = doc(this.firestore, 'exams', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Examen no encontrado');
    if (snap.data()['uid'] !== user.uid) throw new Error('No autorizado');

    await deleteDoc(docRef);
  }

  private toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;

    if (typeof value === 'string') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const maybeTs = value as { toDate?: () => Date };
    if (typeof maybeTs.toDate === 'function') {
      const d = maybeTs.toDate();
      return d instanceof Date ? d : null;
    }

    return null;
  }
}