import { CommonModule } from '@angular/common';
import { Component, Injectable, inject } from '@angular/core';
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
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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

  async updateProfileData(uid: string, data: Partial<UserProfile>) {
    const { email, uid: _uid, createdAt, ...safe } = data as any;

    await updateDoc(doc(this.fs, `users/${uid}`), {
      ...safe,
      updatedAt: serverTimestamp(),
    });

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

  async uploadAvatar(uid: string, file: File): Promise<string> {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error('Solo PNG/JPG/WEBP (no HEIC).');
    }

    const storageRef = ref(this.storage, `users/${uid}/avatar`);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    await new Promise<void>((resolve, reject) => {
      task.on('state_changed', () => {}, reject, () => resolve());
    });

    const url = await getDownloadURL(storageRef);
    await this.updateProfileData(uid, { photoURL: url });
    return url;
  }
}

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class Profile {
  private auth = inject(Auth);
  private profileSvc = inject(ProfileService);

  // UI state
  msg = '';
  msgType: 'ok' | 'err' | '' = '';
  savingName = false;
  uploading = false;

  name = '';
  selectedFileName = '';

  user$ = of(this.auth.currentUser);

  profile$: Observable<UserProfile | null> = this.user$.pipe(
    switchMap((u) => {
      if (!u) return of(null);
      this.profileSvc.ensureProfileFromAuth(u).catch(() => {});
      return this.profileSvc.profile$(u.uid);
    })
  );

  fillFromCurrent(current: string | null) {
    this.name = current ?? '';
  }

  initials(value: string) {
    const parts = (value ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    const first = parts[0]?.[0] ?? 'U';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return (first + last).toUpperCase();
  }

  private toast(type: 'ok' | 'err', text: string) {
    this.msgType = type;
    this.msg = text;
    // auto-clear suave
    setTimeout(() => {
      this.msg = '';
      this.msgType = '';
    }, 3500);
  }

  async saveName(uid: string) {
    const val = (this.name ?? '').trim();
    if (!val) {
      this.toast('err', 'Escribe un nombre antes de guardar.');
      return;
    }

    try {
      this.savingName = true;
      await this.profileSvc.updateProfileData(uid, { displayName: val });
      this.toast('ok', '✅ Nombre actualizado');
    } catch (e: any) {
      this.toast('err', '❌ Error: ' + (e?.message ?? e));
    } finally {
      this.savingName = false;
    }
  }

  onPickFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    this.selectedFileName = file ? file.name : '';
  }

  async onUpload(ev: Event, uid: string) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      this.uploading = true;
      await this.profileSvc.uploadAvatar(uid, file);
      this.toast('ok', '✅ Foto actualizada');
      input.value = '';
      this.selectedFileName = '';
    } catch (e: any) {
      this.toast('err', '❌ Error: ' + (e?.message ?? e));
    } finally {
      this.uploading = false;
    }
  }
}
