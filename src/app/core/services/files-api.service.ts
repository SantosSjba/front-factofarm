import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Metadatos devueltos por POST /api/files/upload */
export interface UploadedFileResponseDto {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  /** Ruta absoluta desde la raíz del sitio `/api/files/:id` */
  url: string;
}

/** Subida genérica de archivos; el id puede guardarse en `UserProfile.fotoArchivoId` u otras tablas. */
@Injectable({ providedIn: 'root' })
export class FilesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  upload(file: File): Observable<UploadedFileResponseDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<UploadedFileResponseDto>(`${this.base}/files/upload`, body);
  }

  /** URL absoluta para `<img [src]>` cuando `path` es `/api/files/...`. */
  absoluteFileUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const root = this.base.replace(/\/api\/?$/, '');
    return `${root}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
