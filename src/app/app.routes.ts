import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Principal } from './pages/dashboard/principal/principal';
import { NotAuthenticatedGuard } from './auth/guards/not-authenticated.guard';
import { IsAuthenticatedGuard } from './auth/guards/is-authenticated.guard';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Routes } from '@angular/router';
import { Subjects } from './pages/dashboard/subjects/subjects';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  { path: 'login', component: Login, canMatch: [NotAuthenticatedGuard] },
  { path: 'register', component: Register, canMatch: [NotAuthenticatedGuard] },

  {
    path: 'dashboard',
    component: Dashboard,
    canMatch: [IsAuthenticatedGuard],
    children: [{ path: '', component: Principal } ,
      {path: 'subjects', component: Subjects},
      /**{
        path: 'subjects/:subjectId/content',
        component: SubjectContent,
      },**/
    ],
  },
  { path: '**', component: Login },

];
