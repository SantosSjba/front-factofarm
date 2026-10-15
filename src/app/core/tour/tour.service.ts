import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { driver, type DriveStep, type Driver, type PopoverDOM } from 'driver.js';
import { take } from 'rxjs';
import { SidebarService } from '../../shared/services/sidebar.service';
import { AuthService } from '../services/auth.service';
import {
  MENU_LABEL,
  TOURS,
  findTour,
  type TourArea,
  type TourAudience,
  type TourDef,
  type TourId,
  type TourStepDef,
} from './tour.definitions';

/** Mismo corte que el sidebar docked (`xl` / 1280px). */
const DESKTOP_MQ = '(min-width: 1280px)';
/**
 * Momentos para recalcular el resaltado tras abrir/cerrar el sidebar: al terminar su
 * transición (`duration-300`) y al terminar la animación propia de driver.js (~400 ms).
 */
const REFRESH_DELAYS_MS = [320, 480];
const STORAGE_PREFIX = 'ff.tour.v1';

/**
 * Recorridos guiados (tutorial de bienvenida) sobre driver.js.
 *
 * Guarda por usuario qué recorridos ya vio, para lanzar el de bienvenida solo
 * la primera vez; desde "Tu cuenta › Tutoriales" se pueden repetir siempre.
 */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sidebar = inject(SidebarService);

  private instance: Driver | null = null;
  /** Estado del sidebar de escritorio antes del recorrido, para restaurarlo. */
  private restoreExpanded: boolean | null = null;
  private refreshTimers: ReturnType<typeof setTimeout>[] = [];
  private autoStartTimer?: ReturnType<typeof setTimeout>;

  readonly active = signal(false);

  /** Recorridos que aplican al usuario actual (para el menú "Tutoriales"). */
  available(): TourDef[] {
    return TOURS.filter((t) => this.matchesAudience(t.audience));
  }

  /** Lanza el recorrido de bienvenida si el usuario aún no lo ha visto. */
  maybeAutoStart(delayMs = 800): void {
    if (!this.auth.isAuthenticated() || this.auth.isSupportSession()) return;
    const tour = this.available().find((t) => t.autoStart && !this.isSeen(t.id));
    if (!tour) return;
    clearTimeout(this.autoStartTimer);
    this.autoStartTimer = setTimeout(() => {
      if (!this.active()) this.start(tour.id);
    }, delayMs);
  }

  /** Inicia (o reinicia) un recorrido. */
  start(id: TourId): void {
    const tour = findTour(id);
    if (!tour) return;
    this.stop();

    const steps = tour.steps
      .filter((s) => this.isStepAllowed(s) && this.isStepRenderable(s))
      .map((s) => this.toDriveStep(s));
    if (steps.length === 0) return;

    this.instance = driver({
      steps,
      showProgress: steps.length > 1,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      popoverClass: 'ff-tour',
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 10,
      smoothScroll: true,
      allowKeyboardControl: true,
      overlayClickBehavior: () => undefined,
      onDestroyed: () => this.onFinished(tour.id),
    });
    this.active.set(true);
    this.instance.drive();
  }

  stop(): void {
    this.instance?.destroy();
    this.instance = null;
  }

  isSeen(id: TourId): boolean {
    const key = this.storageKey(id);
    if (!key) return true;
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  /** Olvida los recorridos vistos: el de bienvenida vuelve a salir al entrar. */
  resetAll(): void {
    for (const t of TOURS) {
      const key = this.storageKey(t.id);
      if (!key) continue;
      try {
        localStorage.removeItem(key);
      } catch {
        /* almacenamiento no disponible */
      }
    }
  }

  private markSeen(id: TourId): void {
    const key = this.storageKey(id);
    if (!key) return;
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private storageKey(id: TourId): string | null {
    const userId = this.auth.user()?.id;
    return userId ? `${STORAGE_PREFIX}.${id}.${userId}` : null;
  }

  private onFinished(id: TourId): void {
    this.clearRefreshTimers();
    // Cerrar con "Finalizar", Esc o la X cuenta como visto: no se vuelve a lanzar solo.
    this.markSeen(id);
    this.instance = null;
    this.active.set(false);
    if (!this.isDesktop()) this.sidebar.setMobileOpen(false);
    if (this.restoreExpanded !== null) {
      this.sidebar.setExpanded(this.restoreExpanded);
      this.restoreExpanded = null;
    }
  }

  private toDriveStep(def: TourStepDef): DriveStep {
    const nombre = (this.auth.user()?.nombre ?? '').replace(/\s*\(soporte\)\s*$/i, '').split(' ')[0];
    const fill = (text: string) => text.replace(/\{nombre\}/g, nombre || 'te damos la bienvenida');
    const title =
      def.title === MENU_LABEL && def.element
        ? (document.querySelector(def.element)?.getAttribute('data-tour-label') ?? '')
        : fill(def.title);
    return {
      element: def.element,
      onHighlightStarted: () => this.prepareArea(def.area),
      popover: {
        title,
        description: fill(def.description),
        side: def.side,
        align: def.align,
        onPopoverRender: def.action ? (popover) => this.renderAction(popover, def) : undefined,
      },
    };
  }

  /** Agrega el botón de acción extra del paso (ir a una ruta o encadenar otro recorrido). */
  private renderAction(popover: PopoverDOM, def: TourStepDef): void {
    const action = def.action;
    if (!action) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ff-tour-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      this.stop();
      if (action.kind === 'route') {
        void this.router.navigateByUrl(action.route);
      } else {
        setTimeout(() => this.start(action.tourId), 150);
      }
    });
    popover.wrapper.classList.add('ff-tour-has-action');
    popover.description.insertAdjacentElement('afterend', btn);
  }

  /** Deja visible la zona del layout que se va a resaltar. */
  private prepareArea(area: TourArea | undefined): void {
    if (!area) return;
    const desktop = this.isDesktop();
    if (area === 'sidebar') {
      if (desktop) {
        this.sidebar.isExpanded$.pipe(take(1)).subscribe((expanded) => {
          if (expanded) return;
          this.restoreExpanded ??= false;
          this.sidebar.setExpanded(true);
          this.scheduleRefresh();
        });
      } else {
        this.sidebar.setMobileOpen(true);
        this.scheduleRefresh();
      }
    } else if (!desktop) {
      this.sidebar.setMobileOpen(false);
      this.scheduleRefresh();
    }
  }

  /** Recalcula la posición del resaltado cuando termina la animación del sidebar. */
  private scheduleRefresh(): void {
    this.clearRefreshTimers();
    this.refreshTimers = REFRESH_DELAYS_MS.map((ms) => setTimeout(() => this.instance?.refresh(), ms));
  }

  private clearRefreshTimers(): void {
    this.refreshTimers.forEach(clearTimeout);
    this.refreshTimers = [];
  }

  private isStepAllowed(step: TourStepDef): boolean {
    if (step.audience && !this.matchesAudience(step.audience)) return false;
    if (step.permissions?.length) {
      return step.permissions.some((code) => this.auth.hasPermission(code));
    }
    return true;
  }

  /**
   * Omite pasos cuyo elemento no existe o está oculto con `display: none`
   * (p. ej. accesos directos en móvil). El sidebar móvil se abre al llegar.
   */
  private isStepRenderable(step: TourStepDef): boolean {
    if (!step.element) return true;
    const el = document.querySelector(step.element);
    if (!el) return false;
    return step.area === 'sidebar' || el.getClientRects().length > 0;
  }

  private matchesAudience(audience: TourAudience): boolean {
    if (audience === 'all') return true;
    return (audience === 'platform') === this.auth.isPlatformAdmin();
  }

  private isDesktop(): boolean {
    return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;
  }
}
