import { Routes } from '@angular/router';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';

/**
 * Entradas de primer nivel: panel admin (lazy), autenticación (lazy), redirecciones y fallback.
 */
export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./modules/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'signin',
    redirectTo: 'auth/signin',
    pathMatch: 'full',
  },
  {
    path: 'signup',
    redirectTo: 'auth/signup',
    pathMatch: 'full',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'FactoFarm | No encontrado',
  },
];
