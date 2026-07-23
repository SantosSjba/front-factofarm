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
 * Evita recortes por overflow de cards/tablas.
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
    tip.className =
      'pointer-events-none z-[9999] max-w-xs rounded-lg bg-gray-900 px-2.5 py-1.5 text-center text-theme-xs font-normal leading-snug text-white shadow-theme-lg dark:bg-gray-800';
    tip.textContent = this.text;
    document.body.appendChild(tip);
    this.tipEl = tip;

    this.popper = createPopper(this.el.nativeElement, tip, {
      placement: this.appTooltipPlacement,
      strategy: 'fixed',
      modifiers: [
        { name: 'offset', options: { offset: [0, 8] } },
        {
          name: 'preventOverflow',
          options: { padding: 8, boundary: 'viewport' },
        },
        { name: 'flip', options: { fallbackPlacements: ['bottom', 'top', 'right', 'left'] } },
      ],
    });
  }

  private destroyTip(): void {
    this.popper?.destroy();
    this.popper = null;
    this.tipEl?.remove();
    this.tipEl = null;
  }

  private clearShowTimer(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }
}
