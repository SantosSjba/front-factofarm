import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotifyService } from '../services/notify.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notify = inject(NotifyService);

  handleError(error: unknown): void {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Error inesperado en la aplicación';
    this.notify.error('Error de aplicación', message);
  }
}
