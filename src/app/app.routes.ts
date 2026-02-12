import { Routes } from '@angular/router';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Principal } from './pages/dashboard/principal/principal';
import { NotAuthenticatedGuard } from './auth/guards/not-authenticated.guard';
import { IsAuthenticatedGuard } from './auth/guards/is-authenticated.guard';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Subjects } from './pages/dashboard/subjects/subjects';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  { path: 'home', component: Home },
  { path: 'login', component: Login, canMatch: [NotAuthenticatedGuard] },
  { path: 'register', component: Register, canMatch: [NotAuthenticatedGuard] },

  {
    path: 'dashboard',
    component: Dashboard,
    canMatch: [IsAuthenticatedGuard],
    children: [
      { path: '', component: Principal },
      { path: 'subjects', component: Subjects },
      {
         path: 'subjects/:subjectId/content',
  loadComponent: () =>
    import('./subject-content/subject-content')
      .then(m => m.SubjectContentComponent),
      },
      { path: '**', redirectTo: '' },
    ],
  },


    {
    path: 'ai/generate',
    loadComponent: () =>
      import('./pages/ai/generate/generate')
        .then(m => m.Generate)
  }
];


