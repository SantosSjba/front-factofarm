import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { NotifyService } from '../services/notify.service';
import { httpErrorMessage } from '../http/http-error-message';
import { environment } from '../../../environments/environment';

/**
 * Las descargas (`responseType: 'blob'`) reciben el error JSON como Blob y el
 * mensaje del backend se perdería; se convierte a objeto antes de propagarlo.
 */
async function withParsedBlobBody(err: HttpErrorResponse): Promise<HttpErrorResponse> {
  if (!(err.error instanceof Blob)) return err;
  try {
    const text = await err.error.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    return new HttpErrorResponse({
      error: parsed,
      headers: err.headers,
      status: err.status,
      statusText: err.statusText,
      url: err.url ?? undefined,
    });
  } catch {
    return err;
  }
}

/**
 * Manejo global de errores API. No redirige en 403 (evita bucles con el dashboard).
 * Errores de permisos, servidor y conexión se notifican aquí con el mensaje real
 * del backend; NotifyService descarta el aviso repetido que muestre el componente.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotifyService);

  return next(req).pipe(
    catchError((raw: unknown) => {
      if (!(raw instanceof HttpErrorResponse)) {
        return throwError(() => raw);
      }
      return from(withParsedBlobBody(raw)).pipe(
        switchMap((err) => {
          if (
            err.status === 401 &&
            environment.apiBaseUrl &&
            req.url.startsWith(environment.apiBaseUrl) &&
            !req.url.includes('/auth/')
          ) {
            return throwError(() => err);
          }

          if (err.status === 403) {
            notify.error('Acceso denegado', httpErrorMessage(err, 'No tiene permisos para esta operación.'));
          } else if (err.status >= 500) {
            notify.error('Error del servidor', httpErrorMessage(err, 'Intente nuevamente en unos momentos.'));
          } else if (err.status === 0) {
            notify.error('Sin conexión', httpErrorMessage(err, 'Verifique su conexión a internet.'));
          }

          return throwError(() => err);
        }),
      );
    }),
  );
};

/** Estados que el interceptor ya notificó al usuario. */
export function isGloballyNotifiedStatus(status: number): boolean {
  return status === 0 || status === 403 || status >= 500;
}
