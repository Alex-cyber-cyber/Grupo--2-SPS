import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Principal } from './pages/dashboard/principal/principal';
import { NotAuthenticatedGuard } from './auth/guards/not-authenticated.guard';
import { IsAuthenticatedGuard } from './auth/guards/is-authenticated.guard';
import { Resources } from './pages/dashboard/resources/resources';
import { Subjects } from './pages/dashboard/subjects/subjects';
import { ResourceDetail } from './pages/dashboard/resource-detail/resource-detail';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  { path: 'login', component: Login, canMatch: [NotAuthenticatedGuard] },
  { path: 'register', component: Register, canMatch: [NotAuthenticatedGuard] },

  {
    path: 'dashboard',
    component: Dashboard,
    canMatch: [IsAuthenticatedGuard],
    children: [
    { path: '', component: Principal },
    { path: 'subjects', component: Subjects },   
    { path: 'resources', component: Resources }, 
    { path: 'resources/:id', component: ResourceDetail } 
  ]
  },

  { path: '**', redirectTo: 'login' },
];
