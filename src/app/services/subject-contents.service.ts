import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class ContentService {
  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private auth: Auth
  ) {}

  // ========================
  // 🔹 REFERENCIAS
  // ========================
  private userSubjectRef(subjectId: string) {
    return doc(this.firestore, `userSubjects/${subjectId}`);
  }

  private contentsCollection(subjectId: string) {
    return collection(this.userSubjectRef(subjectId), 'contents');
  }

  private async ensureUserSubject(subjectId: string, uid: string) {
    const ref = this.userSubjectRef(subjectId);
    await setDoc(ref, { uid, subjectId }, { merge: true });
  }

  // ========================
  // 🔹 SUBIR ARCHIVO
  // ========================
  async uploadFile(
    subjectId: string,
    file: File,
    title: string,
    tags: string[] = []
  ): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    await this.ensureUserSubject(subjectId, user.uid);

    const fileRef = ref(this.storage, `contents/${subjectId}/${file.name}`);
    await uploadBytes(fileRef, file);

    const docRef = await addDoc(this.contentsCollection(subjectId), {
      title,
      tags,
      storagePath: fileRef.fullPath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  // ========================
  // 🔹 PEGAR TEXTO
  // ========================
  async pasteText(
    subjectId: string,
    title: string,
    text: string,
    tags: string[] = []
  ): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    await this.ensureUserSubject(subjectId, user.uid);

    const docRef = await addDoc(this.contentsCollection(subjectId), {
      title,
      tags,
      extractedText: text,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  // ========================
  // 🔹 EDITAR TEXTO (NUEVO)
  // ========================
  async updateTextContent(
    subjectId: string,
    contentId: string,
    title: string,
    text: string,
    tags: string[]
  ) {
    const docRef = doc(this.contentsCollection(subjectId), contentId);

    await updateDoc(docRef, {
      title,
      extractedText: text,
      tags,
      updatedAt: serverTimestamp(),
    });
  }

  // ========================
  // 🔹 OBSERVADOR REACTIVO
  // ========================
  observeContents(subjectId: string, callback: (contents: any[]) => void) {
    const q = query(
      this.contentsCollection(subjectId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      callback(items);
    });
  }

  // ========================
  // 🔹 OBTENER URL
  // ========================
  async getFileURL(storagePath: string) {
    return await getDownloadURL(ref(this.storage, storagePath));
  }

  // ========================
  // 🔹 EDITAR META (archivos)
  // ========================
  async editContent(
    subjectId: string,
    contentId: string,
    title: string,
    tags: string[]
  ) {
    const docRef = doc(this.contentsCollection(subjectId), contentId);

    await updateDoc(docRef, {
      title,
      tags,
      updatedAt: serverTimestamp(),
    });
  }

  // ========================
  // 🔹 ELIMINAR
  // ========================
  async deleteContent(subjectId: string, content: any) {
    if (content.storagePath) {
      const fileRef = ref(this.storage, content.storagePath);
      await deleteObject(fileRef).catch(() => {});
    }

    const docRef = doc(this.contentsCollection(subjectId), content.id);
    await deleteDoc(docRef);
  }

  // ========================
  // 🔹 EVENTOS
  // ========================
  async triggerEvent(subjectId: string, contentId: string, event: string) {
    console.log(`Evento: ${event} -> ${subjectId}/${contentId}`);
  }
}
