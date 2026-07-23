import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protege rutas del panel: exige sesión lógica iniciada. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/signin']);
};

/** Evita mostrar login si ya hay sesión (redirige al home del rol). */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree([auth.defaultHomePath()]);
};

/** SUPER_ADMIN no usa dashboard tenant; va a consola de plataforma. */
export const tenantDashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isPlatformAdmin()) {
    return router.createUrlTree(['/platform/dashboard']);
  }
  return true;
};

/** Operadores FactoSys solo pueden rutas /platform/* (salvo sesión de soporte). */
export const platformOnlyGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isPlatformAdmin()) return true;
  const url = state.url;
  if (url.startsWith('/platform')) return true;
  return router.createUrlTree(['/platform/dashboard']);
};
