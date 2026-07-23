import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotifyService } from '../services/notify.service';
import { environment } from '../../../environments/environment';

/** Manejo global de errores API. No redirige en 403 (evita bucles con el dashboard). */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotifyService);

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
      } else if (err.status >= 500) {
        notify.error('Error del servidor', 'Intente nuevamente en unos momentos.');
      } else if (err.status === 0) {
        notify.error('Sin conexión', 'Verifique su conexión a internet o el estado del API.');
      }

      return throwError(() => err);
    }),
  );
};
