import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-button',
  imports: [
    CommonModule,
    SafeHtmlPipe,
    IconComponent,
  ],
  templateUrl: './button.component.html',
  styles: ``,
  host: {

  },
})
export class ButtonComponent {

  @Input() size: 'sm' | 'md' = 'md';
  @Input() variant: 'primary' | 'outline' = 'primary';
  @Input() disabled = false;
  @Input() className = '';
  @Input() startIcon?: string; // SVG or icon class, or use ng-content for more flexibility
  @Input() endIcon?: string;
  @Input() startIconName?: string;
  @Input() endIconName?: string;

  @Output() btnClick = new EventEmitter<Event>();

  get sizeClasses(): string {
    return this.size === 'sm'
      ? 'px-3.5 py-2 text-sm'
      : 'px-4 py-2.5 text-sm';
  }

  get iconSizeClass(): string {
    return this.size === 'sm' ? 'size-4' : 'size-[1.125rem]';
  }

  get variantClasses(): string {
    return this.variant === 'primary'
      ? 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300'
      : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-gray-200 dark:ring-white/15 dark:hover:bg-white/10 dark:hover:text-white';
  }

  get disabledClasses(): string {
    return this.disabled ? 'cursor-not-allowed opacity-50' : '';
  }

  onClick(event: Event) {
    if (!this.disabled) {
      this.btnClick.emit(event);
    }
  }
}
