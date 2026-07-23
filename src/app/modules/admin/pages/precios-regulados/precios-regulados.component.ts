import { Component, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { NotifyService } from '../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-precios-regulados',
  standalone: true,
  imports: [
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Productos' }, { label: 'Precios regulados DIGEMED' }]" />
    <app-component-card title="Catálogo precios máximos" [loading]="listQuery.isPending()">
      <div class="mb-6 grid gap-4 md:grid-cols-4">
        <app-input-field placeholder="Código DIGEMID" [value]="codigo()" (valueChange)="codigo.set($event + '')" />
        <app-input-field placeholder="Nombre" [value]="nombre()" (valueChange)="nombre.set($event + '')" />
        <app-input-field placeholder="Precio máximo" [value]="precio()" (valueChange)="precio.set($event + '')" />
        <app-button class="mt-6" [disabled]="saveMutation.isPending()" [loading]="saveMutation.isPending()" (btnClick)="save()">Guardar</app-button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b text-left text-gray-500">
              <th class="py-2 pr-4">Código</th>
              <th class="py-2 pr-4">Nombre</th>
              <th class="py-2">Precio máximo</th>
            </tr>
          </thead>
          <tbody>
            @for (row of listQuery.data() ?? []; track row.id) {
              <tr class="border-b border-gray-100">
                <td class="py-2 pr-4">{{ row.codigoDigemid ?? '—' }}</td>
                <td class="py-2 pr-4">{{ row.nombre }}</td>
                <td class="py-2">S/ {{ row.precioMaximo }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </app-component-card>
  `,
})
export class PreciosReguladosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly codigo = signal('');
  protected readonly nombre = signal('');
  protected readonly precio = signal('');

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['compliance', 'regulated-prices'] as const,
    queryFn: () => firstValueFrom(this.api.listRegulatedPrices()),
  }));

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.upsertRegulatedPrice({
          codigoDigemid: this.codigo() || undefined,
          nombre: this.nombre(),
          precioMaximo: Number(this.precio()),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Precio regulado guardado');
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'regulated-prices'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar')),
  }));

  protected save() {
    if (!this.nombre().trim() || !this.precio().trim()) {
      this.notify.warning('Complete nombre y precio');
      return;
    }
    this.saveMutation.mutate();
  }
}
