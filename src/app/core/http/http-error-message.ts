import { HttpErrorResponse } from '@angular/common/http';

/** Extrae mensaje legible de errores HTTP de la API Nest (ValidationPipe, etc.). */
export function httpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string | string[] } | null;
    if (body && typeof body.message === 'string') {
      return body.message;
    }
    if (body && Array.isArray(body.message)) {
      return body.message.join(' ');
    }
    if (err.status === 0) {
      return 'No hay conexión con el servidor.';
    }
  }
  return fallback;
}
