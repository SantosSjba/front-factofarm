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
  selector: 'app-farmaceutico-titular',
  standalone: true,
  imports: [
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Usuarios & Establecimientos' }, { label: 'Farmacéutico titular' }]" />
    <app-component-card title="Licencias farmacéuticas (CQP)" [loading]="listQuery.isPending()">
      <div class="mb-6 grid gap-4 md:grid-cols-3">
        <app-input-field placeholder="CQP" [value]="colegiatura()" (valueChange)="colegiatura.set($event + '')" />
        <app-input-field placeholder="Nombre completo" [value]="fullName()" (valueChange)="fullName.set($event + '')" />
        <app-input-field placeholder="Vigencia YYYY-MM-DD" [value]="vigencia()" (valueChange)="vigencia.set($event + '')" />
      </div>
      <app-button [disabled]="createMutation.isPending()" [loading]="createMutation.isPending()" (btnClick)="create()">Registrar licencia</app-button>

      <div class="mt-6 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b text-left text-gray-500">
              <th class="py-2 pr-4">CQP</th>
              <th class="py-2 pr-4">Nombre</th>
              <th class="py-2 pr-4">Vigencia</th>
              <th class="py-2">Establecimientos</th>
            </tr>
          </thead>
          <tbody>
            @for (row of listQuery.data() ?? []; track row.id) {
              <tr class="border-b border-gray-100">
                <td class="py-2 pr-4">{{ row.colegiaturaCqp }}</td>
                <td class="py-2 pr-4">{{ row.fullName }}</td>
                <td class="py-2 pr-4">{{ row.vigenciaHasta ?? '—' }}</td>
                <td class="py-2">{{ (row.titularEstablishments ?? []).map((e) => e.nombre).join(', ') }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </app-component-card>
  `,
})
export class FarmaceuticoTitularComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly colegiatura = signal('');
  protected readonly fullName = signal('');
  protected readonly vigencia = signal('');

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['compliance', 'pharmacist-licenses'] as const,
    queryFn: () => firstValueFrom(this.api.listPharmacistLicenses(true)),
  }));

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createPharmacistLicense({
          colegiaturaCqp: this.colegiatura(),
          fullName: this.fullName(),
          vigenciaHasta: this.vigencia() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Licencia registrada');
      this.colegiatura.set('');
      this.fullName.set('');
      this.vigencia.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'pharmacist-licenses'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la licencia')),
  }));

  protected create() {
    if (!this.colegiatura().trim() || !this.fullName().trim()) {
      this.notify.warning('Complete CQP y nombre');
      return;
    }
    this.createMutation.mutate();
  }
}
