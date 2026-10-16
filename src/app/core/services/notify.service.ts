import { Injectable } from '@angular/core';
import { toast, type ExternalToast } from 'ngx-sonner';

const base = (): ExternalToast => ({
  duration: 4_000,
});

/** Ventana en la que un mismo texto de error no se repite. */
const DEDUPE_MS = 2_500;

/**
 * Avisos globales (ngx-sonner). Usar en lugar de `alert` / `console` para feedback al usuario.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly recentErrors = new Map<string, number>();

  success(message: string, description?: string) {
    toast.success(message, { ...base(), description });
  }

  /**
   * El interceptor HTTP ya avisa los 403/5xx/sin conexión con el mensaje del backend;
   * si el componente vuelve a mostrar el mismo texto, se omite el duplicado.
   */
  error(message: string, description?: string) {
    if (this.isDuplicate(message, description)) return;
    toast.error(message, { ...base(), description, duration: 6_000 });
  }

  warning(message: string, description?: string) {
    toast.warning(message, { ...base(), description });
  }

  info(message: string, description?: string) {
    toast.info(message, { ...base(), description });
  }

  private isDuplicate(message: string, description?: string): boolean {
    const now = Date.now();
    for (const [text, at] of this.recentErrors) {
      if (now - at > DEDUPE_MS) this.recentErrors.delete(text);
    }
    const texts = [message, description].filter((t): t is string => !!t?.trim());
    const duplicate = texts.some((t) => this.recentErrors.has(t));
    for (const t of texts) this.recentErrors.set(t, now);
    return duplicate;
  }
}
