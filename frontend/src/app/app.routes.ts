import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';
import { userRoutes } from './pages/user/user.routes';
import { adminRoutes } from './pages/admin/admin.routes'; 

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/homepage/home.component').then(m => m.HomepageComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [GuestGuard]
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [GuestGuard]
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [GuestGuard]
  },
  {
    path: 'user',
    loadComponent: () =>
      import('./pages/user/layout/user-layout.component').then(m => m.UserLayoutComponent),
    canActivate: [AuthGuard],
    children: userRoutes
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [AuthGuard],
    children: adminRoutes
  },
  {
  path: 'driver',
  loadChildren: () =>
    import('./pages/driver/driver.routes').then(m => m.driverRoutes)
}

];
