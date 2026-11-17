import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createPopper, Instance, type Placement } from '@popperjs/core';

/**
 * Tooltip flotante (Popper, strategy fixed) anclado al body.
 * z-index por encima del header sticky (z-99999) para que nunca se recorte.
 *
 * Accesibilidad (WCAG 1.4.13 y guía de tooltips):
 * - El texto queda enlazado desde el inicio: como descripción (`aria-describedby`) si el control
 *   ya tiene nombre distinto, o como nombre (`aria-labelledby`) si no tiene ninguno. Así el lector
 *   de pantalla lo lee sin necesidad de pasar el mouse.
 * - Se puede pasar el mouse sobre el tooltip sin que desaparezca, y Esc lo cierra.
 * (`interestfor` + `popover="hint"` aún no está en Safari ni Firefox: por eso sigue con Popper.)
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnChanges, OnDestroy {
  private static nextId = 0;
  private readonly descId = `ff-tip-${++TooltipDirective.nextId}`;
  private descEl: HTMLElement | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly el = inject(ElementRef<HTMLElement>);
  /** Al prerenderizar páginas públicas (build) no hay mouse, foco ni `document`: no se hace nada. */
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @Input('appTooltip') text = '';
  @Input() appTooltipPlacement: Placement = 'top';

  private tipEl: HTMLElement | null = null;
  private arrowEl: HTMLElement | null = null;
  private popper: Instance | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  /** Cómo se abrió: con mouse se puede pasar el puntero sobre él; con teclado no tapa clics. */
  private openedBy: 'pointer' | 'keyboard' = 'pointer';

  /**
   * Solo con un puntero que "flota" (mouse, lápiz). En teléfono un toque simula mouseenter y nunca
   * llega mouseleave: el tooltip quedaba abierto encima de los ítems del menú y tapaba los toques.
   */
  @HostListener('pointerenter', ['$event'])
  onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.openedBy = 'pointer';
    this.scheduleShow();
  }

  /** Solo foco de teclado (`:focus-visible`): el foco que deja un toque o un clic no lo abre. */
  @HostListener('focusin', ['$event'])
  onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.matches(':focus-visible')) return;
    this.openedBy = 'keyboard';
    this.scheduleShow();
  }

  /** Con el mouse: espera un instante por si va hacia el tooltip (WCAG 1.4.13, "hoverable"). */
  @HostListener('pointerleave', ['$event'])
  onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.clearShowTimer();
    this.hideSoon();
  }

  /** Tocar o hacer clic en el control lo cierra (la acción ya empezó; el tooltip estorba). */
  @HostListener('pointerdown')
  onPointerDown(): void {
    this.clearShowTimer();
    this.destroyTip();
  }

  @HostListener('focusout')
  onHide(): void {
    this.clearShowTimer();
    this.destroyTip();
  }

  ngOnChanges(): void {
    if (!this.isBrowser) return;
    // Tras renderizar el contenido proyectado, para comparar con el nombre visible del control.
    queueMicrotask(() => this.syncA11y());
  }

  /** Esc cierra el tooltip sin mover el foco; si estaba visible, no cierra además el modal. */
  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.tipEl) return;
    event.preventDefault();
    event.stopPropagation();
    this.destroyTip();
  };

  private hideSoon(): void {
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => this.destroyTip(), 150);
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  /**
   * Enlaza el texto del tooltip al control: descripción si ya tiene otro nombre, nombre si no
   * tiene ninguno, nada si el tooltip repite su nombre (se leería dos veces).
   */
  private syncA11y(): void {
    const host = this.el.nativeElement as HTMLElement;
    const text = this.text?.trim() ?? '';
    const ownsDescribed = host.getAttribute('aria-describedby')?.split(' ').includes(this.descId);
    const ownsLabelled = host.getAttribute('aria-labelledby') === this.descId;
    if (ownsDescribed) this.removeIdRef(host, 'aria-describedby');
    if (ownsLabelled) host.removeAttribute('aria-labelledby');
    if (!text) {
      this.descEl?.remove();
      this.descEl = null;
      return;
    }
    const norm = (v: string) => v.replace(/\s+/g, ' ').trim().toLowerCase();
    const name = norm(host.getAttribute('aria-label') ?? host.textContent ?? '');
    if (name === norm(text)) {
      this.descEl?.remove();
      this.descEl = null;
      return;
    }
    const desc = this.ensureDescEl();
    desc.textContent = text;
    if (!name && !host.hasAttribute('aria-labelledby')) {
      host.setAttribute('aria-labelledby', this.descId);
    } else {
      const ids = (host.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
      host.setAttribute('aria-describedby', [...ids, this.descId].join(' '));
    }
  }

  /** Textos ocultos en un contenedor común al final del body: no alteran el layout ni :last-child. */
  private ensureDescEl(): HTMLElement {
    if (this.descEl) return this.descEl;
    let bag = document.getElementById('ff-tooltip-texts');
    if (!bag) {
      bag = document.createElement('div');
      bag.id = 'ff-tooltip-texts';
      bag.hidden = true;
      document.body.appendChild(bag);
    }
    const span = document.createElement('span');
    span.id = this.descId;
    bag.appendChild(span);
    this.descEl = span;
    return span;
  }

  private removeIdRef(host: HTMLElement, attr: string): void {
    const ids = (host.getAttribute(attr) ?? '').split(' ').filter((id) => id && id !== this.descId);
    if (ids.length) host.setAttribute(attr, ids.join(' '));
    else host.removeAttribute(attr);
  }

  private scheduleShow(): void {
    if (!this.text?.trim()) return;
    this.clearHideTimer();
    this.clearShowTimer();
    this.showTimer = setTimeout(() => this.mount(), 80);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    this.clearShowTimer();
    this.destroyTip();
    this.descEl?.remove();
    this.descEl = null;
  }

  private mount(): void {
    if (this.tipEl || !this.text?.trim()) return;
    if (!this.hasRoomBeside()) return;

    const tip = document.createElement('div');
    tip.setAttribute('role', 'tooltip');
    tip.className = 'ff-tooltip';
    tip.textContent = this.text;

    // Estilos inline: no dependen de JIT/Tailwind y superan header sticky (z-99999).
    Object.assign(tip.style, {
      position: 'fixed',
      zIndex: '1000000',
      maxWidth: '18rem',
      padding: '0.4rem 0.65rem',
      borderRadius: '0.5rem',
      background: '#111827',
      color: '#fff',
      fontSize: '0.75rem',
      fontWeight: '400',
      lineHeight: '1.35',
      textAlign: 'center',
      // Con mouse se puede pasar sobre el tooltip; abierto por teclado no intercepta clics.
      pointerEvents: this.openedBy === 'pointer' ? 'auto' : 'none',
      boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
      wordBreak: 'break-word',
    } as CSSStyleDeclaration);

    const arrow = document.createElement('div');
    arrow.setAttribute('data-popper-arrow', '');
    Object.assign(arrow.style, {
      position: 'absolute',
      width: '8px',
      height: '8px',
      background: 'inherit',
      visibility: 'hidden',
    } as CSSStyleDeclaration);
    tip.appendChild(arrow);
    this.arrowEl = arrow;

    // Dentro de un menú (popover) o un <dialog> modal abiertos: fuera quedaría tapado (capa superior) e inerte.
    (this.el.nativeElement.closest('[popover]:popover-open, dialog[open]') ?? document.body).appendChild(tip);
    this.tipEl = tip;
    // Se puede pasar el mouse sobre el tooltip para leerlo (lupa, texto largo).
    tip.addEventListener('mouseenter', () => this.clearHideTimer());
    tip.addEventListener('mouseleave', () => this.hideSoon());
    document.addEventListener('keydown', this.onKeydown, true);

    // Espacio superior por header sticky (+ banner soporte) para forzar flip a bottom.
    const stickyTopPad = this.estimateStickyHeaderPad();

    this.popper = createPopper(this.el.nativeElement, tip, {
      placement: this.appTooltipPlacement,
      strategy: 'fixed',
      modifiers: [
        { name: 'offset', options: { offset: [0, 10] } },
        {
          name: 'preventOverflow',
          options: {
            padding: { top: stickyTopPad, right: 8, bottom: 8, left: 8 },
            boundary: 'clippingParents',
            altAxis: true,
            tether: false,
          },
        },
        {
          name: 'flip',
          options: {
            padding: { top: stickyTopPad, right: 8, bottom: 8, left: 8 },
            fallbackPlacements: ['bottom', 'top', 'right', 'left'],
            boundary: 'clippingParents',
          },
        },
        {
          name: 'computeStyles',
          options: { adaptive: false, gpuAcceleration: false },
        },
      ],
    });
  }

  /**
   * Un tooltip pensado al costado (menú lateral: `right`) que no cabe ahí terminaría encima o
   * debajo, tapando los ítems vecinos (menú lateral en teléfono o ventana angosta). Mejor no mostrarlo.
   */
  private hasRoomBeside(): boolean {
    const side = this.appTooltipPlacement.split('-')[0];
    if (side !== 'right' && side !== 'left') return true;
    const rect = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
    const room = side === 'right' ? window.innerWidth - rect.right : rect.left;
    return room >= 160;
  }

  /** Altura aproximada del header sticky para no dibujar debajo. */
  private estimateStickyHeaderPad(): number {
    const header = document.querySelector<HTMLElement>('header.sticky, header[class*="z-99999"]');
    if (!header) return 80;
    const rect = header.getBoundingClientRect();
    // Si el header está pegado arriba, reservar su alto + margen.
    if (rect.top <= 0 || rect.bottom > 0) {
      return Math.max(80, Math.ceil(rect.bottom) + 12);
    }
    return 80;
  }

  private destroyTip(): void {
    this.clearHideTimer();
    document.removeEventListener('keydown', this.onKeydown, true);
    this.popper?.destroy();
    this.popper = null;
    this.tipEl?.remove();
    this.tipEl = null;
    this.arrowEl = null;
  }

  private clearShowTimer(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }
}
