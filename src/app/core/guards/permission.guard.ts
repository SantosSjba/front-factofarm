import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Exige al menos uno de los permisos en `route.data['permissions']`. */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['permissions'] as string[] | undefined;

  if (!auth.isAuthenticated()) {
    void router.navigate(['/auth/signin']);
    return false;
  }

  if (!required?.length) {
    return true;
  }

  const allowed = required.some((code) => auth.hasPermission(code));
  if (!allowed) {
    void router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
