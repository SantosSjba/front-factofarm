import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, NgZone, inject, isDevMode } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { markReloading } from '../handlers/stale-chunk';

/** Cada cuánto se revisa si se publicó una versión nueva (además de al volver a la pestaña). */
const CHECK_EVERY_MS = 5 * 60 * 1000;
const MAIN_SCRIPT = /main-[A-Z0-9]+\.js/;

/**
 * Evita el error "Failed to fetch dynamically imported module" tras un deploy.
 *
 * Una pestaña abierta antes del deploy tiene en memoria la versión anterior, que pide las
 * pantallas por su nombre viejo (`chunk-XXXX.js`), y esos archivos ya no existen en el servidor.
 * Este servicio compara el `main-*.js` que se está usando con el que trae hoy `index.html`; si
 * cambió, el siguiente cambio de pantalla se hace como carga completa a esa misma dirección
 * (con la versión nueva) en lugar de pedir un archivo que ya no está.
 *
 * La sesión y el carrito del POS están en local/sessionStorage, así que la recarga no los pierde.
 * Solo en producción: en desarrollo los archivos no llevan hash.
 */
@Injectable({ providedIn: 'root' })
export class AppVersionService {
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly current = this.loadedMainScript();
  private outdated = false;
  private checking = false;

  start(): void {
    if (isDevMode() || !this.current) return;

    const sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart && this.outdated) {
        markReloading();
        location.assign(event.url);
      }
    });

    const onVisible = () => {
      if (this.doc.visibilityState === 'visible') void this.check();
    };
    this.doc.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    // Fuera de la zona de Angular: el temporizador no dispara detección de cambios.
    const timer = this.zone.runOutsideAngular(() => setInterval(() => void this.check(), CHECK_EVERY_MS));

    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this.doc.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      clearInterval(timer);
    });
  }

  /** Lee el index.html publicado (sin caché) y compara su main-*.js con el que está corriendo. */
  private async check(): Promise<void> {
    if (this.outdated || this.checking || !navigator.onLine) return;
    this.checking = true;
    try {
      const res = await fetch('/index.html', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) return;
      const published = (await res.text()).match(MAIN_SCRIPT)?.[0];
      if (published && published !== this.current) this.outdated = true;
    } catch {
      // Sin red o servidor caído: se vuelve a intentar en la próxima revisión.
    } finally {
      this.checking = false;
    }
  }

  private loadedMainScript(): string | null {
    const src = this.doc.querySelector<HTMLScriptElement>('script[src*="main-"]')?.getAttribute('src') ?? '';
    return src.match(MAIN_SCRIPT)?.[0] ?? null;
  }
}
