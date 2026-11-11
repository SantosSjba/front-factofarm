import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';
import { ExcelIconComponent } from '../../../icons/excel-icon.component';

/**
 * Selector de archivo. `variant="field"`: campo con botón nativo.
 * `variant="button"`: botón FactoFarm que abre el diálogo (importaciones Excel, imágenes).
 */
@Component({
  selector: 'app-file-input',
  imports: [IconComponent, ExcelIconComponent],
  template: `
    @if (variant === 'button') {
      <label
        class="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-transparent bg-brand-500 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-white shadow-theme-xs transition-all select-none hover:bg-brand-600 focus-within:ring-3 focus-within:ring-brand-500/20"
        [class.opacity-50]="disabled"
        [class.cursor-not-allowed]="disabled"
      >
        @if (icon === 'excel') {
          <span class="flex rounded bg-white p-0.5"><app-excel-icon [size]="16" /></span>
        } @else {
          <app-icon [name]="icon" iconClass="size-5" />
        }
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
          'h-11 w-full min-w-0 cursor-pointer overflow-hidden rounded-[10px] border border-gray-300 bg-transparent text-sm text-gray-500 shadow-theme-xs transition-colors file:me-4 file:h-full file:cursor-pointer file:border-0 file:border-e file:border-solid file:border-gray-200 file:bg-gray-50 file:px-3.5 file:py-2.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100/50 disabled:text-gray-400 disabled:shadow-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:file:border-gray-800 dark:file:bg-white/5 dark:file:text-gray-300 dark:hover:file:bg-white/10 dark:focus:border-brand-500/40 dark:disabled:border-gray-800 dark:disabled:bg-gray-800/50 ' + className
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
  /** Icono iconify, o «excel» para el ícono de Excel del proyecto (importaciones). */
  @Input() icon = 'mdi:paperclip';
  @Output() fileChange = new EventEmitter<Event>();

  onChange(event: Event) {
    this.fileChange.emit(event);
  }
}
