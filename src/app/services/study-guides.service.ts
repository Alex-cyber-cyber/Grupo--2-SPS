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
  Timestamp,
} from '@angular/fire/firestore';

export type CreateStudyGuidePayload = {
  name: string;
  text: string;
  subjectId?: string;
  topic?: string;
};

export type StudyGuideDoc = {
  id: string;
  uid: string;
  name: string;
  text: string;
  subjectId: string | null;
  topic: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable({ providedIn: 'root' })
export class StudyGuidesService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
  ) {}

  async createStudyGuide(payload: CreateStudyGuidePayload): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const name = (payload.name || '').trim();
    const text = (payload.text || '').trim();

    if (!name) throw new Error('name requerido');
    if (!text) throw new Error('text requerido');

    const ref = collection(this.firestore, 'studyGuides');

    const docRef = await addDoc(ref, {
      uid: user.uid,
      name,
      text,
      subjectId: payload.subjectId ?? null,
      topic: payload.topic ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async getMyStudyGuides(): Promise<StudyGuideDoc[]> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const ref = collection(this.firestore, 'studyGuides');
    const q = query(ref, where('uid', '==', user.uid));
    const snapshot = await getDocs(q);

    const guides = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid: data['uid'],
        name: data['name'],
        text: data['text'],
        subjectId: data['subjectId'] ?? null,
        topic: data['topic'] ?? null,
        createdAt: (data['createdAt'] as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data['updatedAt'] as Timestamp)?.toDate() ?? new Date(),
      };
    });

    guides.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return guides;
  }

  async getStudyGuide(id: string): Promise<StudyGuideDoc | null> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const docRef = doc(this.firestore, 'studyGuides', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    if (data['uid'] !== user.uid) return null;

    return {
      id: snap.id,
      uid: data['uid'],
      name: data['name'],
      text: data['text'],
      subjectId: data['subjectId'] ?? null,
      topic: data['topic'] ?? null,
      createdAt: (data['createdAt'] as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data['updatedAt'] as Timestamp)?.toDate() ?? new Date(),
    };
  }

  async deleteStudyGuide(id: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const docRef = doc(this.firestore, 'studyGuides', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Guía no encontrada');
    if (snap.data()['uid'] !== user.uid) throw new Error('No autorizado');

    await deleteDoc(docRef);
  }
}
