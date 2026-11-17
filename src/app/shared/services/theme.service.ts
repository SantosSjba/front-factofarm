import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** Clave actual: guarda solo la preferencia explícita del usuario (sin valor = sigue al sistema). */
const STORAGE_KEY = 'color-scheme';
/** Clave anterior; se migra una vez para no cambiarle el tema a quien ya lo tenía elegido. */
const LEGACY_KEY = 'theme';

const parse = (value: string | null): Theme | null => (value === 'light' || value === 'dark' ? value : null);

/**
 * Tema claro/oscuro. La fuente de verdad es `<meta name="color-scheme">`
 * (`light dark` = sistema, `light`/`dark` = elegido por el usuario); el CSS
 * deriva `color-scheme` de esa meta. La clase `.dark` en `<html>` refleja el
 * tema resuelto porque las utilidades `dark:` de Tailwind dependen de ella.
 * El script inline de `index.html` aplica lo mismo antes de pintar (sin parpadeo).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  // Al prerenderizar (build) no existe matchMedia: se asume claro y el navegador lo corrige al cargar.
  private readonly media =
    typeof this.doc.defaultView?.matchMedia === 'function'
      ? this.doc.defaultView.matchMedia('(prefers-color-scheme: dark)')
      : undefined;

  private readonly override = signal<Theme | null>(this.readStored());
  private readonly system = signal<Theme>(this.media?.matches ? 'dark' : 'light');

  /** Tema que se ve en pantalla. */
  readonly theme = computed<Theme>(() => this.override() ?? this.system());

  constructor() {
    effect(() => this.apply(this.override(), this.theme()));

    this.media?.addEventListener('change', (e) => this.system.set(e.matches ? 'dark' : 'light'));
    // Otra pestaña (p. ej. la pantalla del cliente del POS) cambió el tema.
    this.doc.defaultView?.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY || e.key === null) this.override.set(this.readStored());
    });
  }

  /**
   * Pasa al tema opuesto al que se ve. Si coincide con el del sistema se borra
   * la preferencia (vuelve a seguir al sistema) en vez de fijarla.
   */
  toggleTheme(): void {
    const target: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    const next = target === this.system() ? null : target;
    this.override.set(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin acceso a localStorage el tema se aplica igual, solo no se recuerda.
    }
  }

  private readStored(): Theme | null {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current !== null) return parse(current);
      const legacy = parse(localStorage.getItem(LEGACY_KEY));
      if (legacy) localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
      return legacy;
    } catch {
      return null;
    }
  }

  private apply(override: Theme | null, theme: Theme): void {
    const meta = this.doc.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (meta) meta.content = override ?? 'light dark';
    this.doc.documentElement.classList.toggle('dark', theme === 'dark');
  }
}
