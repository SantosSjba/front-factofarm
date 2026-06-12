import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/** Adjunta Bearer token y renueva sesión ante 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const base = environment.apiBaseUrl;

  const withAuth =
    base && req.url.startsWith(base) && auth.getAccessToken()
      ? req.clone({ setHeaders: { Authorization: `Bearer ${auth.getAccessToken()}` } })
      : req;

  return next(withAuth).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      const isAuthRoute =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/logout');

      if (isAuthRoute) {
        return throwError(() => err);
      }

      return auth.refreshSession().pipe(
        switchMap((ok) => {
          if (!ok) {
            auth.clearSession();
            void router.navigate(['/auth/signin']);
            return throwError(() => err);
          }
          const token = auth.getAccessToken();
          const retry = req.clone({
            setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
          });
          return next(retry);
        }),
        catchError(() => {
          auth.clearSession();
          void router.navigate(['/auth/signin']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
