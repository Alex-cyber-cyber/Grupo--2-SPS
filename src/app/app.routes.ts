import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Principal } from './pages/dashboard/principal/principal';

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
    children: [
      { path: '', component: Principal }, 
    ],
  },
];
     