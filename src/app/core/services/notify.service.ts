import { Injectable } from '@angular/core';
import { toast, type ExternalToast } from 'ngx-sonner';

const base = (): ExternalToast => ({
  duration: 4_000,
});

/**
 * Avisos globales (ngx-sonner). Usar en lugar de `alert` / `console` para feedback al usuario.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  success(message: string, description?: string) {
    toast.success(message, { ...base(), description });
  }

  error(message: string, description?: string) {
    toast.error(message, { ...base(), description, duration: 6_000 });
  }

  warning(message: string, description?: string) {
    toast.warning(message, { ...base(), description });
  }

  info(message: string, description?: string) {
    toast.info(message, { ...base(), description });
  }
}
