import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  inject,
} from '@angular/core';
import { createPopper, Instance, type Placement } from '@popperjs/core';

/**
 * Tooltip flotante (Popper, strategy fixed) anclado al body.
 * z-index por encima del header sticky (z-99999) para que nunca se recorte.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  @Input('appTooltip') text = '';
  @Input() appTooltipPlacement: Placement = 'top';

  private tipEl: HTMLElement | null = null;
  private arrowEl: HTMLElement | null = null;
  private popper: Instance | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.scheduleShow();
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.scheduleShow();
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  onHide(): void {
    this.clearShowTimer();
    this.destroyTip();
  }

  private scheduleShow(): void {
    if (!this.text?.trim()) return;
    this.clearShowTimer();
    this.showTimer = setTimeout(() => this.mount(), 80);
  }

  ngOnDestroy(): void {
    this.clearShowTimer();
    this.destroyTip();
  }

  private mount(): void {
    if (this.tipEl || !this.text?.trim()) return;

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
      pointerEvents: 'none',
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

    document.body.appendChild(tip);
    this.tipEl = tip;

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
