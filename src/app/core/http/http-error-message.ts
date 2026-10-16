import { HttpErrorResponse } from '@angular/common/http';

type ApiErrorBody = { message?: string | string[]; code?: string } | null;

/** Mensaje por estado cuando la API no envía uno propio (proxy, timeout, etc.). */
function statusMessage(status: number): string | null {
  switch (status) {
    case 0:
      return 'No hay conexión con el servidor. Verifique su internet o intente en unos momentos.';
    case 401:
      return 'Su sesión expiró. Inicie sesión nuevamente.';
    case 403:
      return 'No tiene permisos para realizar esta operación.';
    case 404:
      return 'El recurso solicitado no existe o fue eliminado.';
    case 408:
    case 504:
      return 'El servidor tardó demasiado en responder. Intente nuevamente.';
    case 413:
      return 'El archivo o los datos enviados superan el tamaño permitido.';
    case 429:
      return 'Demasiadas solicitudes. Espere unos segundos e intente nuevamente.';
    case 502:
    case 503:
      return 'El servidor no está disponible en este momento. Intente nuevamente en unos segundos.';
    default:
      return null;
  }
}

/** Extrae mensaje legible de errores HTTP de la API Nest (ValidationPipe, etc.). */
export function httpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiErrorBody;
    if (body && typeof body === 'object') {
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (Array.isArray(body.message) && body.message.length) {
        return body.message.join(' ');
      }
    }
    if (typeof err.error === 'string' && err.error.trim() && !/^\s*</.test(err.error)) {
      return err.error.trim().slice(0, 300);
    }
    return statusMessage(err.status) ?? fallback;
  }
  // `throw new Error('…')` en validaciones propias (p. ej. dentro de mutationFn):
  // mostrar ese texto. Errores de ejecución (TypeError, etc.) no se exponen.
  if (err instanceof Error && err.constructor === Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}
