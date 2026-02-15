import { Injectable } from '@angular/core';
import { Auth, User, updateProfile } from '@angular/fire/auth';
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
  uploadBytesResumable,
  getDownloadURL,
} from '@angular/fire/storage';
import { Observable } from 'rxjs';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
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
    await setDoc(
      doc(this.fs, `users/${u.uid}`),
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

  // ✅ Guarda en Firestore + también actualiza Auth (para que el Topbar se actualice)
  async updateProfileData(uid: string, data: Partial<UserProfile>) {
    const { email, uid: _uid, createdAt, ...safe } = data as any; // bloquea email/uid

    // 1) Firestore
    await updateDoc(doc(this.fs, `users/${uid}`), {
      ...safe,
      updatedAt: serverTimestamp(),
    });

    // 2) Auth (displayName/photoURL)
    const current = this.auth.currentUser;
    if (current && current.uid === uid) {
      const payload: any = {};
      if (typeof (safe as any).displayName === 'string') payload.displayName = (safe as any).displayName;
      if (typeof (safe as any).photoURL === 'string') payload.photoURL = (safe as any).photoURL;

      if (Object.keys(payload).length) {
        await updateProfile(current, payload);
        await current.reload();
      }
    }
  }

  // ✅ Subida robusta (no se queda "subiendo" sin darte error)
  async uploadAvatar(uid: string, file: File): Promise<string> {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error('Solo PNG/JPG/WEBP (no HEIC).');
    }

    const storageRef = ref(this.storage, `users/${uid}/avatar`);

    console.log('📤 Subiendo avatar...', file.type, file.size);

    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          console.log(`⏳ progreso: ${pct}%`);
        },
        (err) => {
          console.error('❌ Error Storage:', err);
          reject(err);
        },
        () => resolve()
      );
    });

    console.log('✅ Subida completa, obteniendo URL...');
    const url = await getDownloadURL(storageRef);
    console.log('🔗 URL:', url);

    // Guarda URL en Firestore y Auth
    await this.updateProfileData(uid, { photoURL: url });

    return url;
  }
}
