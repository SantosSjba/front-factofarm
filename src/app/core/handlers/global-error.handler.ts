import { ErrorHandler, Injectable, inject, isDevMode } from '@angular/core';
import { NotifyService } from '../services/notify.service';

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

  handleError(error: unknown): void {
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
