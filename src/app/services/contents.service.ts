import { Injectable } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
} from '@angular/fire/firestore';

import {
  Storage,
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from '@angular/fire/storage';

import { AuthService } from '../auth/services/auth.service';
import { filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface ContentDoc {
  id?: string;

  subjectId: string;
  title: string;
  tags: string[];
  type: 'file' | 'text';

  fileName?: string;
  mimeType?: string;
  size?: number;

  storagePath?: string;
  downloadURL?: string;

  extractedText?: string;

  createdBy: string;
  createdByName?: string | null;
  createdByEmail?: string | null;

  createdAt: any;
  updatedAt: any;
}

@Injectable({ providedIn: 'root' })
export class ContentsService {
  constructor(
    private fs: Firestore,
    private storage: Storage,
    private auth: AuthService
  ) {}

  // ✅ Lista SOLO del usuario logeado + materia
  listMyBySubject(subjectId: string): Observable<ContentDoc[]> {
    return this.auth.user$.pipe(
      filter((u): u is any => !!u),
      switchMap((u) => {
        const q = query(
          collection(this.fs, 'contents'),
          where('subjectId', '==', subjectId),
          where('createdBy', '==', u.uid),
          orderBy('createdAt', 'desc')
        );
        return collectionData(q, { idField: 'id' }) as Observable<ContentDoc[]>;
      })
    );
  }

  async uploadFile(subjectId: string, file: File, title: string, tags: string[]) {
    const user = await new Promise<any>((resolve, reject) => {
      const sub = this.auth.user$.subscribe((u) => {
        sub.unsubscribe();
        if (!u) reject(new Error('No autenticado'));
        else resolve(u);
      });
    });

    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowed.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Usa PDF/DOCX/TXT.');
    }

    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `subjects/${subjectId}/users/${user.uid}/contents/${crypto.randomUUID()}-${safeName}`;
    const storageRef = ref(this.storage, path);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    const docRef = await addDoc(collection(this.fs, 'contents'), {
      subjectId,
      title,
      tags,
      type: 'file',

      fileName: file.name,
      mimeType: file.type,
      size: file.size,

      storagePath: path,
      downloadURL,

      createdBy: user.uid,
      createdByName: user.displayName ?? null,
      createdByEmail: user.email ?? null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef;
  }

  async createFromText(subjectId: string, title: string, tags: string[], extractedText: string) {
    const user = await new Promise<any>((resolve, reject) => {
      const sub = this.auth.user$.subscribe((u) => {
        sub.unsubscribe();
        if (!u) reject(new Error('No autenticado'));
        else resolve(u);
      });
    });

    const docRef = await addDoc(collection(this.fs, 'contents'), {
      subjectId,
      title,
      tags,
      type: 'text',
      extractedText,

      createdBy: user.uid,
      createdByName: user.displayName ?? null,
      createdByEmail: user.email ?? null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef;
  }

  async updateMeta(contentId: string, data: { title?: string; tags?: string[] }) {
    await updateDoc(doc(this.fs, 'contents', contentId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteContent(content: ContentDoc) {
    if (content.storagePath) {
      try {
        await deleteObject(ref(this.storage, content.storagePath));
      } catch (e) {
        console.warn('No se pudo borrar en Storage:', e);
      }
    }
    if (!content.id) throw new Error('Falta id');
    await deleteDoc(doc(this.fs, 'contents', content.id));
  }
}
