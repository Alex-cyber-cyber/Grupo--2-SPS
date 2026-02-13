import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  addDoc,
  getDocs,
  getDocsFromServer,
  updateDoc,
  getDoc,
} from '@angular/fire/firestore';

export type ModuleQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface SubjectScheduleRow {
  days: WeekdayKey[];
  start: string;
  end: string;
  room?: string;
}

export interface CreateSubjectPayload {
  name: string;
  module: ModuleQuarter;

  professor?: string;
  section?: string;

  university?: string;
  career?: string;

  description?: string;

  color?: string;
  icon?: string;

  schedule?: SubjectScheduleRow[];
}

@Injectable({ providedIn: 'root' })
export class SubjectsService {
  constructor(private firestore: Firestore) {}

  private userSubjectDocId(uid: string, subjectId: string) {
    return `${uid}_${subjectId}`;
  }


  async getUserSubjects(uid: string, forceServer = false): Promise<any[]> {
    const ref = query(
      collection(this.firestore, 'userSubjects'),
      where('uid', '==', uid)
    );

    const snapshot = forceServer ? await getDocsFromServer(ref) : await getDocs(ref);

    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
  }


  async getSubjectsForUser(uid: string, forceServer = false): Promise<any[]> {
    const userSubjects = await this.getUserSubjects(uid, forceServer);
    const ids = userSubjects.map(us => us.subjectId).filter(Boolean);

    if (!ids.length) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

    const subjectById = new Map<string, any>();

    for (const chunk of chunks) {
      const ref = query(
        collection(this.firestore, 'subjects'),
        where('__name__', 'in', chunk)
      );

      const snapshot = forceServer ? await getDocsFromServer(ref) : await getDocs(ref);

      snapshot.docs.forEach(d => {
        subjectById.set(d.id, { id: d.id, ...d.data() });
      });
    }

    const relBySubjectId = new Map<string, any>();
    userSubjects.forEach(us => relBySubjectId.set(us.subjectId, us));

    return ids
      .map(id => {
        const s = subjectById.get(id);
        if (!s) return null;

        const rel = relBySubjectId.get(id) || {};
        return {
          ...s,
          _archived: !!rel.archived,
          _archivedAt: rel.archivedAt || null,
        };
      })
      .filter(Boolean);
  }


  async addSubjectToUser(uid: string, subjectId: string): Promise<void> {
    const docId = this.userSubjectDocId(uid, subjectId);
    const ref = doc(this.firestore, `userSubjects/${docId}`);

    await setDoc(ref, {
      uid,
      subjectId,
      archived: false,
      createdAt: serverTimestamp(),
    });
  }

  async archiveSubjectForUser(uid: string, subjectId: string, archived: boolean): Promise<void> {
    const docId = this.userSubjectDocId(uid, subjectId);
    const ref = doc(this.firestore, `userSubjects/${docId}`);

    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        subjectId,
        archived,
        archivedAt: archived ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
      });
      return;
    }

    await updateDoc(ref, {
      archived,
      archivedAt: archived ? serverTimestamp() : null,
    });
  }


  async removeSubjectFromUser(uid: string, subjectId: string): Promise<void> {
    const docId = this.userSubjectDocId(uid, subjectId);
    const ref = doc(this.firestore, `userSubjects/${docId}`);
    await deleteDoc(ref);
  }


  async createSubjectForUser(uid: string, payload: CreateSubjectPayload): Promise<string> {
    const subjectsRef = collection(this.firestore, 'subjects');

    const clean = {
      name: (payload.name || '').trim(),
      module: payload.module,

      professor: (payload.professor || '').trim(),
      section: (payload.section || '').trim(),

      university: (payload.university || '').trim(),
      career: (payload.career || '').trim(),

      description: (payload.description || '').trim(),

      color: payload.color || '#2563EB',
      icon: payload.icon || '📚',

      schedule: payload.schedule || [],

      isActive: true,

      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!clean.name) throw new Error('El nombre de la materia es obligatorio.');

    const docRef = await addDoc(subjectsRef, clean);
    await this.addSubjectToUser(uid, docRef.id);

    return docRef.id;
  }

  
  async updateSubject(subjectId: string, changes: Partial<CreateSubjectPayload>): Promise<void> {
    const ref = doc(this.firestore, `subjects/${subjectId}`);
    await updateDoc(ref, {
      ...changes,
      updatedAt: serverTimestamp(),
    });
  }


  async deleteSubjectEverywhere(subjectId: string): Promise<void> {
   
    const contentsRef = collection(this.firestore, `subjects/${subjectId}/contents`);
    const contentsSnap = await getDocs(contentsRef);
    await Promise.all(contentsSnap.docs.map(d => deleteDoc(d.ref)));

    
    const relQ = query(
      collection(this.firestore, 'userSubjects'),
      where('subjectId', '==', subjectId)
    );
    const relSnap = await getDocs(relQ);
    await Promise.all(relSnap.docs.map(d => deleteDoc(d.ref)));


    const subjectRef = doc(this.firestore, `subjects/${subjectId}`);
    await deleteDoc(subjectRef);
  }
}
