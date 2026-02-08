import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

export const IsAuthenticatedGuard: CanMatchFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.authStateReady();
  return auth.currentUser ? true : router.parseUrl('/login');
};
