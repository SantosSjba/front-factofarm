import { Pipe, PipeTransform, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FilesApiService } from '../../core/services/files-api.service';

/**
 * Imagen de un archivo del API (requiere Bearer) lista para `<img>`:
 * `<img [src]="url | authFile | async" />`. Acepta id, `/api/v1/files/:id` o URLs normales.
 */
@Pipe({ name: 'authFile', standalone: true })
export class AuthFilePipe implements PipeTransform {
  private readonly files = inject(FilesApiService);

  transform(ref: string | null | undefined): Observable<string | null> {
    return this.files.displayUrl(ref);
  }
}
