import { CommonModule } from '@angular/common';
import { LabelComponent } from '../label/label.component';
import { TextareaDirective } from '../../ui/textarea/textarea.directive';
import { Component, Input, Output, EventEmitter } from '@angular/core';


@Component({
  selector: 'app-text-area',
  standalone: true,
  imports: [CommonModule, LabelComponent, TextareaDirective],
  template: `
    @if (label) {
      <app-label [for]="id || undefined" [required]="required">{{ label }}</app-label>
    }
    <div class="relative">
      <textarea
        app-textarea
        unstyled
        [className]="textareaClasses"
        [id]="id"
        [attr.name]="name || null"
        [attr.maxlength]="maxLength ?? null"
        [attr.aria-label]="ariaLabel || null"
        [attr.aria-invalid]="error ? true : null"
        [placeholder]="placeholder"
        [rows]="rows"
        [value]="value"
        (input)="onInput($event)"
        [disabled]="disabled"
      ></textarea>
      @if (maxLength && (value?.length ?? 0) > maxLength * 0.8) {
      <p class="mt-1 text-end text-xs text-gray-400">{{ value?.length ?? 0 }}/{{ maxLength }}</p>
      }
      @if (hint) {
      <p
        class="mt-2 text-xs"
        [attr.role]="error ? 'alert' : null"
        [ngClass]="error ? 'text-error-500 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'">
        {{ hint }}
      </p>
      }
    </div>
  `,
  styles: ``
})
export class TextAreaComponent {

  @Input() placeholder = '';
  @Input() id = '';
  @Input() name = '';
  @Input() ariaLabel = '';
  @Input() label = '';
  @Input() required = false;
  /** Debe coincidir con `@MaxLength` del DTO del backend. */
  @Input() maxLength?: number;
  @Input() rows = 3;
  @Input() value: string | null = '';
  @Input() className = '';
  @Input() disabled = false;
  @Input() error = false;
  @Input() hint = '';

  @Output() valueChange = new EventEmitter<string>();

  onInput(event: Event) {
    const val = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(val);
  }

  /** Clases tal cual `default-textarea` / `error-textarea` de la plantilla TailAdmin. */
  get textareaClasses(): string {
    const state = this.error
      ? 'border border-error-500 ring-3 ring-error-500/20 focus:border-error-500 focus:ring-3 focus:ring-error-500/20 dark:border-error-500/50 dark:ring-error-500/40'
      : 'border border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100/50 disabled:text-gray-400 disabled:shadow-none dark:border-gray-700 dark:focus:border-brand-500/40 dark:disabled:border-gray-800 dark:disabled:bg-gray-800/50';
    return `flex min-h-20 w-full min-w-0 rounded-[10px] bg-white py-2.5 text-sm font-normal text-gray-800 shadow-theme-xs outline-hidden transition-colors placeholder:text-gray-400 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500 ps-4 pe-4 ${state} ${this.className}`.trim();
  }
}
