import { CommonModule } from '@angular/common';
import { LabelComponent } from '../label/label.component';
import { TextareaDirective } from '../../ui/textarea/textarea.directive';
import { IconComponent } from '../../ui/icon/icon.component';
import { Component, Input, Output, EventEmitter, booleanAttribute } from '@angular/core';


@Component({
  selector: 'app-text-area',
  standalone: true,
  // Un `id="…"` estático también quedaría en el host y el <label for> apuntaría a él, no al <textarea>.
  host: { '[attr.id]': 'null' },
  imports: [CommonModule, LabelComponent, TextareaDirective, IconComponent],
  template: `
    @if (label) {
      <app-label [for]="textareaId" [required]="required" [helpText]="helpText" [compact]="compact">{{ label }}</app-label>
    }
    <div class="relative">
      <textarea
        app-textarea
        unstyled
        [className]="textareaClasses"
        [id]="textareaId"
        [attr.name]="name || null"
        [attr.maxlength]="maxLength ?? null"
        [attr.aria-label]="ariaLabel || null"
        [attr.aria-invalid]="error ? true : null"
        [attr.aria-describedby]="hint ? hintId : null"
        [attr.required]="required ? true : null"
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
        [id]="hintId"
        class="text-xs"
        [class.mt-2]="!compact"
        [class.mt-1]="compact"
        [attr.role]="error ? 'alert' : null"
        [ngClass]="error ? 'text-error-500 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'">
        @if (error) {<app-icon name="mdi:alert-circle-outline" class="me-1 -mt-0.5" iconClass="size-3.5" />}{{ hint }}
      </p>
      }
    </div>
  `,
  styles: ``
})
export class TextAreaComponent {
  private static nextId = 0;
  /** Id propio cuando la página no pasa `id`: así el label siempre queda asociado al campo. */
  private readonly autoId = `ff-textarea-${++TextAreaComponent.nextId}`;
  protected get textareaId(): string {
    return this.id || this.autoId;
  }
  protected get hintId(): string {
    return `${this.textareaId}-hint`;
  }

  @Input() placeholder = '';
  @Input() id = '';
  @Input() name = '';
  @Input() ariaLabel = '';
  @Input() label = '';
  /** Ayuda en tooltip junto al label. */
  @Input() helpText = '';
  @Input() required = false;
  /** Debe coincidir con `@MaxLength` del DTO del backend. */
  @Input() maxLength?: number;
  @Input() rows = 3;
  @Input() value: string | null = '';
  @Input() className = '';
  @Input() disabled = false;
  @Input() error = false;
  @Input() hint = '';
  /** Versión compacta (alto mínimo menor, label 12px). */
  @Input({ transform: booleanAttribute }) compact = false;

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
    const size = this.compact ? 'min-h-16 rounded-lg py-1.5 ps-3 pe-3' : 'min-h-20 rounded-[10px] py-2.5 ps-4 pe-4';
    return `flex ${size} w-full min-w-0 bg-white text-sm font-normal text-gray-800 shadow-theme-xs outline-hidden transition-colors placeholder:text-gray-400 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500 ${state} ${this.className}`.trim();
  }
}
