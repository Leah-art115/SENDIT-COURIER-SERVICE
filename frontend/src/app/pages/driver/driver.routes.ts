import { Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { DriverLayoutComponent } from './driver-layout/driver-layout.component';

export const driverRoutes: Routes = [
  {
    path: '',
    component: DriverLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./driver-dashboard/driver-dashboard.component').then(m => m.DriverDashboardComponent)
      },
      {
        path: 'parcels',
        loadComponent: () =>
          import('./driver-parcels/driver-parcels.component').then(m => m.DriverParcelsComponent)
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./driver-history/driver-history.component').then(m => m.DriverHistoryComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./driver-profile/driver-profile.component').then(m => m.DriverProfileComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
