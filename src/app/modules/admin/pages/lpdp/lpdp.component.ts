import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-lpdp',
  standalone: true,
  imports: [BreadcrumbInlineComponent, ComponentCardComponent],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Usuarios & Establecimientos' }, { label: 'LPDP / ARCO' }]" />
    <app-component-card title="Matriz de tratamiento LPDP" [loading]="matrixQuery.isPending()">
      @if (matrixQuery.data(); as matrix) {
        <p class="mb-4 text-sm text-gray-600">Versión {{ matrix.version }} · Cifrado salud: {{ matrix.encryptionEnabled ? 'activo' : 'no configurado' }}</p>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-left text-gray-500">
                <th class="py-2 pr-4">Proceso</th>
                <th class="py-2 pr-4">Finalidad</th>
                <th class="py-2 pr-4">Base legal</th>
                <th class="py-2">Retención</th>
              </tr>
            </thead>
            <tbody>
              @for (row of matrix.rows; track row.proceso) {
                <tr class="border-b border-gray-100">
                  <td class="py-2 pr-4 font-medium">{{ row.proceso }}</td>
                  <td class="py-2 pr-4">{{ row.finalidad }}</td>
                  <td class="py-2 pr-4">{{ row.baseLegal }}</td>
                  <td class="py-2">{{ row.retencion }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </app-component-card>

    <app-component-card class="mt-6" title="Solicitudes ARCO" [loading]="arcoQuery.isPending()">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b text-left text-gray-500">
              <th class="py-2 pr-4">Cliente</th>
              <th class="py-2 pr-4">Tipo</th>
              <th class="py-2 pr-4">Estado</th>
              <th class="py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            @for (row of arcoQuery.data() ?? []; track row.id) {
              <tr class="border-b border-gray-100">
                <td class="py-2 pr-4">{{ row.customer?.nombre }} ({{ row.customer?.numeroDocumento }})</td>
                <td class="py-2 pr-4">{{ row.requestType }}</td>
                <td class="py-2 pr-4">{{ row.status }}</td>
                <td class="py-2">{{ row.createdAt }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </app-component-card>

    <app-component-card class="mt-6" title="Retención programada" [loading]="retentionQuery.isPending()">
      @if (retentionQuery.data(); as retention) {
        <p class="mb-3 text-sm text-gray-600">{{ retention.policy }}</p>
        <ul class="space-y-2 text-sm">
          @for (c of retention.candidates; track c.id) {
            <li>{{ c.nombre }} · {{ c.numeroDocumento }} · actualizado {{ c.updatedAt }}</li>
          } @empty {
            <li class="text-gray-500">Sin candidatos en este corte.</li>
          }
        </ul>
      }
    </app-component-card>
  `,
})
export class LpdpComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly matrixQuery = injectQuery(() => ({
    queryKey: ['compliance', 'lpdp-matrix'] as const,
    queryFn: () => firstValueFrom(this.api.getLpdpTreatmentMatrix()),
  }));

  protected readonly arcoQuery = injectQuery(() => ({
    queryKey: ['compliance', 'arco'] as const,
    queryFn: () => firstValueFrom(this.api.listArcoRequests()),
  }));

  protected readonly retentionQuery = injectQuery(() => ({
    queryKey: ['compliance', 'retention'] as const,
    queryFn: () => firstValueFrom(this.api.getLpdpRetentionCandidates()),
  }));
}
