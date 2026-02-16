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

  async createExam(payload: CreateExamPayload): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const name = (payload.name || '').trim();
    if (!name) throw new Error('name requerido');
    if (!payload.exam) throw new Error('exam requerido');

    const ref = collection(this.firestore, 'exams');

    const docRef = await addDoc(ref, {
      uid: user.uid,
      name,
      topic: payload.topic || '',
      difficulty: payload.difficulty || 'intermedio',
      subjectId: payload.subjectId ?? null,
      exam: payload.exam,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async getMyExams(): Promise<ExamDoc[]> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const ref = collection(this.firestore, 'exams');
    const q = query(ref, where('uid', '==', user.uid));
    const snapshot = await getDocs(q);

    const exams = snapshot.docs.map((d) => {
      const data = d.data();
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
      };
    });

    exams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return exams;
  }

  async getExam(id: string): Promise<ExamDoc | null> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const docRef = doc(this.firestore, 'exams', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    if (data['uid'] !== user.uid) return null;

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
    };
  }

  async saveResults(examId: string, results: ExamResults): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const docRef = doc(this.firestore, 'exams', examId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Examen no encontrado');
    if (snap.data()['uid'] !== user.uid) throw new Error('No autorizado');

    await updateDoc(docRef, {
      results,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteExam(id: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const docRef = doc(this.firestore, 'exams', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Examen no encontrado');
    if (snap.data()['uid'] !== user.uid) throw new Error('No autorizado');

    await deleteDoc(docRef);
  }
}
