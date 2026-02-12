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
  getDocFromServer 

} from '@angular/fire/firestore';

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface SubjectScheduleRow {
  days: WeekdayKey[];
  start: string;
  end: string;
  room?: string;
}

export interface CreateSubjectPayload {
  name: string;
  module: string;
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

  async getSubjectsForUser(uid: string, forceServer = false): Promise<any[]> {

  const relationsQuery = query(
    collection(this.firestore, 'userSubjects'),
    where('uid', '==', uid)
  );

  const relationsSnap = forceServer
    ? await getDocsFromServer(relationsQuery)
    : await getDocs(relationsQuery);

  if (relationsSnap.empty) return [];

  const userSubjects = relationsSnap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  const ids: string[] = userSubjects
    .map((us: any) => us.subjectId)
    .filter((id: string) => !!id);

  const subjectPromises = ids.map((id: string) => {
    const ref = doc(this.firestore, `subjects/${id}`);
    return forceServer
      ? getDocFromServer(ref)
      : getDoc(ref);
  });

  const subjectSnaps = await Promise.all(subjectPromises);

  const relBySubjectId = new Map<string, any>();
  userSubjects.forEach((us: any) =>
    relBySubjectId.set(us.subjectId, us)
  );

  const merged = subjectSnaps
    .map((snap: any) => {
      if (!snap.exists()) return null;

      const rel = relBySubjectId.get(snap.id) || {};

      return {
        id: snap.id,
        ...snap.data(),
        _archived: !!rel.archived,
        _archivedAt: rel.archivedAt || null,
      };
    })
    .filter(Boolean);

  return merged;
}


  async createSubjectForUser(uid: string, payload: CreateSubjectPayload): Promise<string> {
    const subjectsRef = collection(this.firestore, 'subjects');

    const clean = {
      ...payload,
      name: payload.name.trim(),
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(subjectsRef, clean);

    await setDoc(
      doc(this.firestore, `userSubjects/${this.userSubjectDocId(uid, docRef.id)}`),
      {
        uid,
        subjectId: docRef.id,
        createdAt: serverTimestamp(),
      }
    );

    return docRef.id;
  }

  async updateSubject(subjectId: string, data: any): Promise<void> {
    const ref = doc(this.firestore, `subjects/${subjectId}`);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  async deleteSubjectCompletely(uid: string, subjectId: string): Promise<void> {
    const userDocId = this.userSubjectDocId(uid, subjectId);

    await deleteDoc(doc(this.firestore, `userSubjects/${userDocId}`));
    await deleteDoc(doc(this.firestore, `subjects/${subjectId}`));
  }
}
