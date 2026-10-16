import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject, isDevMode } from '@angular/core';
import { NotifyService } from '../services/notify.service';
import { httpErrorMessage } from '../http/http-error-message';
import { isGloballyNotifiedStatus } from '../interceptors/api-error.interceptor';

/** Promesas rechazadas llegan envueltas (`{ rejection }`) por zone.js. */
function unwrap(error: unknown): unknown {
  if (error && typeof error === 'object' && 'rejection' in error) {
    return (error as { rejection: unknown }).rejection;
  }
  return error;
}

/** Errores de extensiones del navegador / DevTools que no deben mostrar toast al usuario. */
function isIgnorableClientNoise(error: unknown): boolean {
  const message = extractMessage(error);
  if (!message) return false;

  const noisePatterns = [
    /Angular DevTools/i,
    /Angular debugging APIs are not available/i,
    /enableProdMode/i,
    /Failed to execute 'clone' on 'Response'/i,
    /Response body is already used/i,
    /ResizeObserver loop/i,
    /Loading chunk [\w-]+ failed/i, // a veces tras deploy; se maneja con reload aparte
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    /safari-extension:\/\//i,
  ];

  if (noisePatterns.some((re) => re.test(message))) {
    return true;
  }

  const stack = error instanceof Error ? error.stack ?? '' : '';
  if (/frame_ant\.js|backend_bundle\.js|chrome-extension:|moz-extension:/i.test(stack)) {
    return true;
  }

  return false;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '';
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notify = inject(NotifyService);

  handleError(raw: unknown): void {
    const error = unwrap(raw);
    if (error instanceof HttpErrorResponse) {
      // Petición sin manejador de error: mostrar el motivo real, no el texto técnico en inglés.
      if (!isGloballyNotifiedStatus(error.status) && error.status !== 401) {
        this.notify.error(httpErrorMessage(error, 'No se pudo completar la operación.'));
      }
      if (isDevMode()) console.error(error);
      return;
    }
    if (isIgnorableClientNoise(error)) {
      if (isDevMode()) {
        console.debug('[ignored client noise]', error);
      }
      return;
    }

    console.error(error);
    const message = extractMessage(error) || 'Error inesperado en la aplicación';
    this.notify.error('Error de aplicación', message);
  }
}
