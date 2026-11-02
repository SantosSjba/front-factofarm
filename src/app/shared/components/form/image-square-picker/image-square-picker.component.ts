import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Observable, map, of, startWith } from 'rxjs';
import { FilesApiService } from '../../../../core/services/files-api.service';

type PreviewState = { src: string | null; failed: boolean };

/** Botón cuadrado con vista previa; emite el archivo elegido (la URL blob la gestiona el padre). */
@Component({
  selector: 'app-image-square-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-square-picker.component.html',
})
export class ImageSquarePickerComponent {
  private readonly files = inject(FilesApiService);

  /** Carga → imagen, o `failed` si el archivo ya no existe (404) para no quedar "cargando" siempre. */
  protected preview$: Observable<PreviewState> = of({ src: null, failed: false });

  private url: string | null = null;
  @Input() set previewUrl(value: string | null) {
    this.url = value;
    this.preview$ = value
      ? this.files.displayUrl(value).pipe(
          map((src) => ({ src, failed: !src })),
          startWith({ src: null, failed: false }),
        )
      : of({ src: null, failed: false });
  }
  get previewUrl(): string | null {
    return this.url;
  }
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
