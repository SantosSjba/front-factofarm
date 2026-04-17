import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/auth.guard';

/**
 * Rutas del feature autenticación (páginas contenedoras; la UI compartida sigue en `shared/`).
 * Montadas bajo `path: 'auth'` en `app.routes`.
 */
export const authRoutes: Routes = [
  {
    path: 'signin',
    loadComponent: () =>
      import('./pages/sign-in/sign-in.component').then((m) => m.SignInComponent),
    canActivate: [guestGuard],
    title: 'FactoFarm | Iniciar sesión',
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/sign-up/sign-up.component').then((m) => m.SignUpComponent),
    canActivate: [guestGuard],
    title: 'FactoFarm | Registro',
  },
];
