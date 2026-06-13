import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type ComplaintKind = 'RECLAMO' | 'QUEJA';

export interface ComplaintRequestPayload {
  tipo: ComplaintKind;
  nombresApellidos: string;
  domicilio: string;
  documentoIdentidad: string;
  telefono: string;
  email?: string;
  bienContratado: string;
  montoReclamado?: string;
  detalle: string;
  pedido: string;
}

@Injectable({ providedIn: 'root' })
export class PublicLegalService {
  private readonly http = inject(HttpClient);

  submitComplaint(payload: ComplaintRequestPayload) {
    return this.http.post<{ ok: true; numeroRegistro: string }>(
      `${environment.apiBaseUrl}/public/libro-reclamaciones`,
      payload,
    );
  }
}
