import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Botón cuadrado con vista previa; emite el archivo elegido (la URL blob la gestiona el padre). */
@Component({
  selector: 'app-image-square-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-square-picker.component.html',
})
export class ImageSquarePickerComponent {
  @Input() previewUrl: string | null = null;
  @Input() sizeClass = 'h-24 w-24';
  @Input() accept = 'image/*';
  @Input() ariaLabel = 'Seleccionar imagen';
  @Output() fileSelected = new EventEmitter<File>();

  protected onChange(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (f) {
      this.fileSelected.emit(f);
    }
    (ev.target as HTMLInputElement).value = '';
  }
}
