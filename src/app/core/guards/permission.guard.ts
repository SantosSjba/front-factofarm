import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Exige al menos uno de los permisos en `route.data['permissions']`. */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['permissions'] as string[] | undefined;

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/signin']);
  }

  if (!required?.length) {
    return true;
  }

  const allowed = required.some((code) => auth.hasPermission(code));
  if (!allowed) {
    return router.createUrlTree([auth.defaultHomePath()]);
  }

  return true;
};
