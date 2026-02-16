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
  getDocFromServer,
} from '@angular/fire/firestore';

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
    const relationsQuery = query(
      collection(this.firestore, 'userSubjects'),
      where('uid', '==', uid)
    );

    const relationsSnap = forceServer
      ? await getDocsFromServer(relationsQuery)
      : await getDocs(relationsQuery);

    if (relationsSnap.empty) return [];

    const relations = relationsSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    const ids: string[] = relations
      .map((r: any) => r.subjectId as string)
      .filter(Boolean);

    if (!ids.length) return [];

    const subjectPromises = ids.map((id: string) => {
      const ref = doc(this.firestore, `subjects/${id}`);
      return forceServer ? getDocFromServer(ref) : getDoc(ref);
    });

    const subjectSnaps = await Promise.all(subjectPromises);

    const relBySubjectId = new Map<string, any>();
    relations.forEach((r: any) => relBySubjectId.set(r.subjectId, r));

    const merged = subjectSnaps
      .map((snap: any) => {
        if (!snap.exists()) return null;

        const rel = relBySubjectId.get(snap.id) || {};

        return {
          id: snap.id,
          ...snap.data(),
          _archived: !!rel.archived,
          _archivedAt: rel.archivedAt ?? null,
        };
      })
      .filter(Boolean);

    return merged as any[];
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

    const clean: any = {
      ...payload,
      name: (payload.name || '').trim(),
      module: payload.module,
      professor: (payload.professor || '').trim(),
      section: (payload.section || '').trim(),
      university: (payload.university || '').trim(),
      career: (payload.career || '').trim(),
      description: (payload.description || '').trim(),
      color: payload.color || '#2563EB',
      icon: payload.icon || '📚',
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
        archived: false,
        createdAt: serverTimestamp(),
      }
    );

    return docRef.id;
  }

  async updateSubject(subjectId: string, changes: Partial<CreateSubjectPayload>): Promise<void> {
    const ref = doc(this.firestore, `subjects/${subjectId}`);

    const clean: any = {
      ...changes,
      name: changes.name != null ? (changes.name || '').trim() : undefined,
      professor: changes.professor != null ? (changes.professor || '').trim() : undefined,
      section: changes.section != null ? (changes.section || '').trim() : undefined,
      university: changes.university != null ? (changes.university || '').trim() : undefined,
      career: changes.career != null ? (changes.career || '').trim() : undefined,
      description: changes.description != null ? (changes.description || '').trim() : undefined,
      updatedAt: serverTimestamp(),
    };

    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);

    await updateDoc(ref, clean);
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

  async deleteSubjectCompletely(uid: string, subjectId: string): Promise<void> {
    const userDocId = this.userSubjectDocId(uid, subjectId);
    await deleteDoc(doc(this.firestore, `userSubjects/${userDocId}`));
    await deleteDoc(doc(this.firestore, `subjects/${subjectId}`));
  }
}
