import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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

  /**
   * Descarga el archivo con Bearer (HttpClient) y devuelve un `blob:` URL
   * usable en `<img [src]>`. Revocar con `URL.revokeObjectURL` al descartar.
   */
  fetchObjectUrl(fileIdOrPath: string): Observable<string> {
    const id = this.extractFileId(fileIdOrPath);
    return this.http
      .get(`${this.base}/files/${id}`, { responseType: 'blob' })
      .pipe(map((blob) => URL.createObjectURL(blob)));
  }

  /** URL absoluta para referencias API (`/api/v1/files/...`). Preferir `fetchObjectUrl` para preview. */
  absoluteFileUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const serverRoot = this.base.replace(/\/api\/v\d+\/?$/, '');
    return `${serverRoot}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private extractFileId(fileIdOrPath: string): string {
    const t = fileIdOrPath.trim();
    const m = t.match(/\/files\/([0-9a-fA-F-]{36})(?:\?|$)/);
    if (m?.[1]) {
      return m[1];
    }
    if (/^[0-9a-fA-F-]{36}$/.test(t)) {
      return t;
    }
    const parts = t.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? t;
  }
}
