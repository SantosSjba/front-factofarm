import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotifyService } from '../services/notify.service';
import { environment } from '../../../environments/environment';

/** Manejo global 403 y errores API estandarizados. */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotifyService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      if (
        err.status === 401 &&
        environment.apiBaseUrl &&
        req.url.startsWith(environment.apiBaseUrl) &&
        !req.url.includes('/auth/')
      ) {
        return throwError(() => err);
      }

      if (err.status === 403) {
        notify.error('Acceso denegado', 'No tiene permisos para esta operación.');
        void router.navigate(['/dashboard']);
      }

      return throwError(() => err);
    }),
  );
};
