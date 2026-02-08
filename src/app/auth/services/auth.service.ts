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
  UserCredential,
} from '@angular/fire/auth';
import { setPersistence } from 'firebase/auth';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<User | null>;

  constructor(private firebaseAuth: Auth) {
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
      registerUser.password,
    );

    await updateProfile(userCredential.user, {
      displayName: `${registerUser.firstName} ${registerUser.lastName}`,
    });

    return userCredential;
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const response = await signInWithPopup(this.firebaseAuth, provider);

    return response;
  }

  async login(email: string, password: string) {
    const response = await signInWithEmailAndPassword(this.firebaseAuth, email, password);

    return response;
  }

  async logout(): Promise<void> {
    await signOut(this.firebaseAuth);
    sessionStorage.clear();
  }
}
