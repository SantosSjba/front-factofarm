import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ContactRequestPayload {
  nombre: string;
  farmacia: string;
  telefono: string;
  email: string;
  mensaje?: string;
}

@Injectable({ providedIn: 'root' })
export class PublicContactService {
  private readonly http = inject(HttpClient);

  submit(payload: ContactRequestPayload) {
    return this.http.post<{ ok: true }>(`${environment.apiBaseUrl}/public/contact`, payload);
  }
}
