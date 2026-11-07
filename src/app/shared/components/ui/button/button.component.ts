import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';
import { TooltipDirective } from '../../../directives/tooltip.directive';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'danger'
  | 'link'
  | 'link-danger'
  /** Sin apariencia propia: solo las clases de `className`. */
  | 'unstyled';

export type ButtonSize =
  | 'md'
  | 'default'
  | 'xs'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg';

@Component({
  selector: 'app-button',
  imports: [CommonModule, SafeHtmlPipe, IconComponent, SpinnerComponent, TooltipDirective],
  templateUrl: './button.component.html',
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
      line-height: 1;
    }
    /* Permite ocultar con class="hidden" en el host (Tailwind pierde ante :host { display }). */
    :host(.hidden) {
      display: none !important;
    }
    @media (min-width: 640px) {
      :host(.sm\\:hidden) {
        display: none !important;
      }
      /* "hidden sm:inline-flex": oculto en móvil, visible desde sm. */
      :host(.hidden.sm\\:inline-flex) {
        display: inline-flex !important;
      }
    }
    @media (max-width: 639px) {
      :host(.sm\\:inline-flex) {
        display: none !important;
      }
    }
    /* Pantallas táctiles: área mínima de toque de 44 px para botones de solo ícono. */
    @media (pointer: coarse) {
      .ff-icon-btn {
        min-width: 2.75rem;
        min-height: 2.75rem;
      }
    }
  `,
})
export class ButtonComponent {
  @Input() size: ButtonSize = 'md';
  @Input() variant: ButtonVariant = 'primary';
  /** Native button type. Use `submit` inside forms so Enter triggers ngSubmit. */
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  /** Muestra spinner y deshabilita el botón durante la acción. */
  @Input() loading = false;
  @Input() className = '';
  @Input() startIcon?: string;
  @Input() endIcon?: string;
  @Input() startIconName?: string;
  @Input() endIconName?: string;
  /** Botón cuadrado solo con icono (sin texto). */
  @Input() iconOnly = false;
  /** Tooltip / aria-label (recomendado con iconOnly). */
  @Input() tooltip = '';
  /** Nombre accesible sin tooltip visual. */
  @Input() ariaLabel = '';
  /** Estado de un panel que el botón abre o cierra. */
  @Input() ariaExpanded: boolean | null = null;
  @Input() ariaControls = '';
  /** id del <button> interno (p. ej. para devolver el foco tras cerrar un menú). */
  @Input() id = '';

  @Output() btnClick = new EventEmitter<Event>();

  get isDisabled(): boolean {
    return this.disabled || this.loading;
  }

  get iconSizeClass(): string {
    return this.size === 'sm' || this.size === 'xs' ? 'size-4' : 'size-5';
  }

  get spinnerSize(): 'xs' | 'sm' {
    return this.size === 'sm' || this.size === 'xs' ? 'xs' : 'sm';
  }

  /** Tamaño de la plantilla: `md` = default; con `iconOnly`, la variante cuadrada. */
  private get normalizedSize(): string {
    const size = this.size === 'md' ? 'default' : this.size;
    if (!this.iconOnly || size.startsWith('icon')) return size;
    return size === 'default' ? 'icon' : `icon-${size}`;
  }

  /** Clases tal cual `ui/button` de la plantilla TailAdmin. */
  get buttonClasses(): string {
    if (this.variant === 'unstyled') return this.className.trim();

    const baseClasses =
      "group/button inline-flex shrink-0 items-center justify-center border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:outline-hidden active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none aria-invalid:border-error-500 aria-invalid:ring-3 aria-invalid:ring-error-500/20 dark:aria-invalid:border-error-500/50 dark:aria-invalid:ring-error-500/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 cursor-pointer";

    const userClasses = this.className.split(/\s+/).filter(Boolean);
    const textSize = /^(text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|title|heading|left|right|center|justify|start|end))/;
    const hasCustomTextColor = userClasses.some(
      (c) => !c.includes(':') && c.startsWith('text-') && !textSize.test(c),
    );
    const hasCustomDarkTextColor = userClasses.some(
      (c) => c.startsWith('dark:text-') && !textSize.test(c.slice(5)),
    );
    const defaultLinkColors = [
      hasCustomTextColor ? '' : 'text-brand-500',
      hasCustomDarkTextColor ? '' : 'dark:text-brand-400',
    ]
      .filter(Boolean)
      .join(' ');

    const destructive =
      'border-transparent bg-error-500 text-white shadow-theme-xs hover:bg-error-600 focus-visible:ring-3 focus-visible:ring-error-500/20 disabled:bg-error-200 disabled:text-white dark:bg-error-500 dark:hover:bg-error-600 dark:disabled:bg-error-950 dark:disabled:text-error-400';
    const linkBase = 'border-transparent h-auto! p-0! font-normal underline-offset-4 hover:underline';
    const primary =
      'border-transparent bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:bg-brand-200 disabled:text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:disabled:bg-brand-800 dark:disabled:text-brand-400';
    const variantClasses: Record<Exclude<ButtonVariant, 'unstyled'>, string> = {
      default: primary,
      primary,
      outline:
        'border-gray-300 bg-transparent text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 focus-visible:ring-3 focus-visible:ring-gray-300/50 disabled:border-gray-200 disabled:bg-white disabled:text-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-600',
      ghost:
        'border-none bg-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-800 focus-visible:ring-3 focus-visible:ring-gray-300/50 disabled:border-gray-200 disabled:bg-white disabled:text-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-600',
      destructive,
      danger: destructive,
      link: `${linkBase} ${defaultLinkColors}`.trim(),
      'link-danger': `${linkBase} text-error-500 dark:text-error-400`,
    };

    const sizeClasses: Record<string, string> = {
      default:
        'h-10 gap-2 rounded-[10px] px-4 py-2.5 [&:has(>svg:first-child)]:ps-3 [&:has(>svg:last-child)]:pe-3',
      xs: 'h-8 gap-1.5 rounded-lg px-3 py-1.5 in-data-[slot=button-group]:rounded-lg [&:has(>svg:first-child)]:ps-2.5 [&:has(>svg:last-child)]:pe-2.5',
      sm: 'h-9 gap-1.5 rounded-lg px-4 py-2 in-data-[slot=button-group]:rounded-lg [&:has(>svg:first-child)]:ps-3 [&:has(>svg:last-child)]:pe-3',
      lg: 'h-11 gap-2 rounded-[10px] px-5 py-3 [&:has(>svg:first-child)]:ps-4 [&:has(>svg:last-child)]:pe-4',
      icon: 'ff-icon-btn size-10 rounded-[10px]',
      'icon-xs': 'ff-icon-btn size-8 rounded-lg in-data-[slot=button-group]:rounded-lg',
      'icon-sm': 'ff-icon-btn size-9 rounded-lg in-data-[slot=button-group]:rounded-lg',
      'icon-lg': 'ff-icon-btn size-11 rounded-[10px]',
    };

    const hasCustomGap = userClasses.some((c) => /^gap-[\d.]+$/.test(c));
    const hasCustomRadius = userClasses.some((c) => /\brounded(-[\w[\]]+)?\b/.test(c));
    const hasCustomHeight = userClasses.some((c) => /^(h-[\w[\]]+|size-[\w[\]]+)/.test(c));
    const hasCustomPadding = userClasses.some((c) => /^p[xyse-]?-[\w[\]]+/.test(c));
    const hasCustomSize = userClasses.some((c) => /^size-[\w[\]]+/.test(c));

    let sizeClass = sizeClasses[this.normalizedSize] ?? sizeClasses['default'];
    if (hasCustomGap) sizeClass = sizeClass.replace(/\bgap-[\d.]+\b/g, '');
    if (hasCustomRadius) sizeClass = sizeClass.replace(/\brounded(-[\w[\]]+)?\b/g, '');
    if (hasCustomHeight) sizeClass = sizeClass.replace(/\b(h-[\w[\]]+|size-[\w[\]]+)\b/g, '');
    if (hasCustomPadding || hasCustomSize) {
      sizeClass = sizeClass.replace(/\bp[xyse-]?-[\w[\]]+\b/g, '');
      sizeClass = sizeClass.replace(/\[&:has\(>svg:[^\]]+\)\]:p[se]-[\w[\]]+/g, '');
    }

    return `${baseClasses} ${variantClasses[this.variant] ?? primary} ${sizeClass} ${this.className}`
      .replace(/\s+/g, ' ')
      .trim();
  }

  onClick(event: Event) {
    if (!this.isDisabled) {
      this.btnClick.emit(event);
    }
  }
}
