import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Principal } from './pages/dashboard/principal/principal';
import { IsAuthenticatedGuard } from '.';
//import { SubjectContent } from './pages/dashboard/subject-content/subject-content';
import { Subject } from 'rxjs';
import { Subjects } from './pages/dashboard/subjects/subjects';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  { path: 'Home', component:Home},

  { path: 'dashboard', component: Dashboard },
  { path: 'Home', component:Home},

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
