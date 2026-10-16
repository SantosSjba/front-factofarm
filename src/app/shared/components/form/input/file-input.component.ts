import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';

/**
 * Selector de archivo. `variant="field"`: campo con botón nativo.
 * `variant="button"`: botón FactoFarm que abre el diálogo (importaciones Excel, imágenes).
 */
@Component({
  selector: 'app-file-input',
  imports: [IconComponent],
  template: `
    @if (variant === 'button') {
      <label
        class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 focus-within:ring-3 focus-within:ring-brand-500/30"
        [class.opacity-50]="disabled"
        [class.cursor-not-allowed]="disabled"
      >
        <app-icon [name]="icon" iconClass="size-[1.125rem]" />
        <span class="min-w-0 truncate">{{ fileName || buttonLabel }}</span>
        <input
          type="file"
          class="sr-only"
          [id]="id || null"
          [attr.accept]="accept || null"
          [attr.capture]="capture || null"
          [attr.aria-label]="buttonLabel"
          [disabled]="disabled"
          (change)="onChange($event)"
        />
      </label>
    } @else {
      <input
        type="file"
        [id]="id || null"
        [attr.accept]="accept || null"
        [attr.capture]="capture || null"
        [attr.aria-label]="ariaLabel || null"
        [disabled]="disabled"
        [class]="
          'focus:border-ring-brand-300 h-11 w-full overflow-hidden rounded-lg border border-gray-300 bg-transparent text-sm text-gray-500 shadow-theme-xs transition-colors file:mr-5 file:border-collapse file:cursor-pointer file:rounded-l-lg file:border-0 file:border-r file:border-solid file:border-gray-200 file:bg-gray-50 file:py-3 file:pl-3.5 file:pr-3 file:text-sm file:text-gray-700 placeholder:text-gray-400 hover:file:bg-gray-100 focus:outline-hidden focus:file:ring-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:text-white/90 dark:file:border-gray-800 dark:file:bg-white/[0.03] dark:file:text-gray-400 dark:placeholder:text-gray-400 ' + className
        "
        (change)="onChange($event)"
      />
    }
  `,
  styles: ``
})
export class FileInputComponent {
  @Input() className: string = '';
  @Input() variant: 'field' | 'button' = 'field';
  @Input() id = '';
  @Input() accept = '';
  @Input() capture = '';
  @Input() ariaLabel = '';
  @Input() disabled = false;
  /** Texto del botón (variant="button") cuando no hay archivo elegido. */
  @Input() buttonLabel = 'Seleccionar archivo';
  /** Nombre del archivo elegido, para mostrarlo en el botón. */
  @Input() fileName = '';
  @Input() icon = 'mdi:paperclip';
  @Output() fileChange = new EventEmitter<Event>();

  onChange(event: Event) {
    this.fileChange.emit(event);
  }
}
