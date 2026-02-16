import { Injectable } from '@angular/core';
import { Auth, updateProfile, User } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
import { Observable } from 'rxjs';

export interface UserProfile {
  uid: string;
  email: string | null;

  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;

  photoURL?: string | null;

  createdAt?: any;
  updatedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(
    private fs: Firestore,
    private storage: Storage,
    private auth: Auth
  ) {}

  profile$(uid: string): Observable<UserProfile> {
    return docData(doc(this.fs, `users/${uid}`)) as Observable<UserProfile>;
  }

  async ensureProfileFromAuth(u: User) {
    const refDoc = doc(this.fs, `users/${u.uid}`);

    // Crea si no existe (sin sobreescribir campos si ya existe)
    await setDoc(
      refDoc,
      {
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        photoURL: u.photoURL ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async updateProfileData(uid: string, data: Partial<UserProfile>) {
    // Nunca permitimos cambiar email/uid
    const { email, uid: _uid, createdAt, ...safe } = data as any;

    await updateDoc(doc(this.fs, `users/${uid}`), {
      ...safe,
      updatedAt: serverTimestamp(),
    });
  }

  async uploadAvatar(uid: string, file: File): Promise<string> {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) throw new Error('Solo PNG/JPG/WEBP');

    const path = `users/${uid}/avatar`;
    const storageRef = ref(this.storage, path);

    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    const url = await getDownloadURL(storageRef);

    // Guarda en Firestore
    await this.updateProfileData(uid, { photoURL: url });

    // Opcional: actualiza photoURL en Firebase Auth también
    const current = this.auth.currentUser;
    if (current && current.uid === uid) {
      await updateProfile(current, { photoURL: url });
    }

    return url;
  }
}
