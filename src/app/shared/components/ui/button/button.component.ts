import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';
import { TooltipDirective } from '../../../directives/tooltip.directive';

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
  `,
})
export class ButtonComponent {
  @Input() size: 'sm' | 'md' = 'md';
  @Input() variant: 'primary' | 'outline' | 'danger' | 'ghost' = 'primary';
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

  @Output() btnClick = new EventEmitter<Event>();

  get isDisabled(): boolean {
    return this.disabled || this.loading;
  }

  get sizeClasses(): string {
    if (this.iconOnly) {
      return this.size === 'sm' ? 'p-2' : 'p-2.5';
    }
    return this.size === 'sm' ? 'px-3.5 py-2 text-sm' : 'px-4 py-2.5 text-sm';
  }

  get iconSizeClass(): string {
    return this.size === 'sm' ? 'size-4' : 'size-[1.125rem]';
  }

  get spinnerSize(): 'xs' | 'sm' {
    return this.size === 'sm' ? 'xs' : 'sm';
  }

  get variantClasses(): string {
    switch (this.variant) {
      case 'danger':
        return 'bg-error-50 text-error-600 ring-1 ring-inset ring-error-100 hover:bg-error-100 dark:bg-error-500/15 dark:text-error-400 dark:ring-error-500/20 dark:hover:bg-error-500/25';
      case 'ghost':
        return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10 dark:hover:bg-white/10';
      case 'outline':
        return 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-gray-200 dark:ring-white/15 dark:hover:bg-white/10 dark:hover:text-white';
      default:
        return 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300';
    }
  }

  get disabledClasses(): string {
    return this.isDisabled ? 'cursor-not-allowed opacity-50' : '';
  }

  onClick(event: Event) {
    if (!this.isDisabled) {
      this.btnClick.emit(event);
    }
  }
}
