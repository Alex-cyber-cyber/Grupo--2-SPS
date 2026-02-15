import { Injectable } from '@angular/core';
import {
  Auth,
  browserSessionPersistence,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  user,
  User,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import { setPersistence } from 'firebase/auth';
import { Observable } from 'rxjs';

import { ProfileService } from '../../services/profile.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<User | null>;

  constructor(private firebaseAuth: Auth, private profile: ProfileService) {
    this.setSessionStoragePersistence();
    this.user$ = user(this.firebaseAuth);
  }

  private setSessionStoragePersistence(): void {
    setPersistence(this.firebaseAuth, browserSessionPersistence);
  }

  async registerWithEmail(registerUser: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const userCredential = await createUserWithEmailAndPassword(
      this.firebaseAuth,
      registerUser.email,
      registerUser.password
    );

    await updateProfile(userCredential.user, {
      displayName: `${registerUser.firstName} ${registerUser.lastName}`,
    });

    await this.profile.ensureProfileFromAuth(userCredential.user);
    return userCredential;
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const response = await signInWithPopup(this.firebaseAuth, provider);

    await this.profile.ensureProfileFromAuth(response.user);
    return response;
  }

  async login(email: string, password: string) {
    const response = await signInWithEmailAndPassword(this.firebaseAuth, email, password);

    await this.profile.ensureProfileFromAuth(response.user);
    return response;
  }

  async logout(): Promise<void> {
    await signOut(this.firebaseAuth);
    sessionStorage.clear();
  }
}
