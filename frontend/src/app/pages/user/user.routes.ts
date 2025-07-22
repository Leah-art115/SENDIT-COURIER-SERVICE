import { Routes } from '@angular/router';

export const userRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
   {
    path: 'sent',
     loadComponent: () =>
       import('./sent/sent.component').then(m => m.SentComponent),
   },
   {
     path: 'received',
     loadComponent: () =>
       import('./received/received.component').then(m => m.ReceivedComponent),
   },
   {
     path: 'profile',
     loadComponent: () =>
       import('./profile/profile.component').then(m => m.ProfileComponent),
   },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  }
];
