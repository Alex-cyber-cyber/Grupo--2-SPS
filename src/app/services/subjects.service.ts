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
  getDocs,
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class SubjectsService {
  constructor(private firestore: Firestore) {}

  async getActiveSubjects(): Promise<any[]> {
    const ref = query(
      collection(this.firestore, 'subjects'),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(ref);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
  }

  async getUserSubjects(uid: string): Promise<any[]> {
    const ref = query(
      collection(this.firestore, 'userSubjects'),
      where('uid', '==', uid)
    );

    const snapshot = await getDocs(ref);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
  }

  async getSubjectsForUser(uid: string): Promise<any[]> {
    const userSubjects = await this.getUserSubjects(uid);
    const ids = userSubjects.map(us => us.subjectId);

    if (!ids.length) return [];

    const ref = query(
      collection(this.firestore, 'subjects'),
      where('__name__', 'in', ids)
    );

    const snapshot = await getDocs(ref);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
  }

  async addSubjectToUser(uid: string, subjectId: string): Promise<void> {
    const docId = `${uid}_${subjectId}`;
    const ref = doc(this.firestore, `userSubjects/${docId}`);

    await setDoc(ref, {
      uid,
      subjectId,
      createdAt: serverTimestamp(),
    });
  }

  async removeSubjectFromUser(uid: string, subjectId: string): Promise<void> {
    const docId = `${uid}_${subjectId}`;
    const ref = doc(this.firestore, `userSubjects/${docId}`);

    await deleteDoc(ref);
  }
}
