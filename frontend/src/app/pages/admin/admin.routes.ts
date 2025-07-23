import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./admin-users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'parcels',
        loadComponent: () =>
          import('./admin-parcels/admin-parcels.component').then(m => m.AdminParcelsComponent),
      },
      {
        path: 'create-parcel',
        loadComponent: () =>
          import('./admin-create-parcel/admin-create-parcel.component').then(m => m.AdminCreateParcelComponent),
      },
      {
        path: 'drivers', 
        loadComponent: () =>
          import('./admin-drivers/admin-drivers.component').then(m => m.AdminDriversComponent),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  }
];
