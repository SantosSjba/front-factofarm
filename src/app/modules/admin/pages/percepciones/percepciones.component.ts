import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { NotifyService } from '../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { SunatWithholdingRateDto } from '../../models/directory.models';

@Component({
  selector: 'app-percepciones',
  standalone: true,
  imports: [
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
    FormSelectComponent,
    LabelComponent,
    DatePipe,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Facturación' }, { label: 'Percepciones' }]" />

    <app-component-card title="Percepciones SUNAT" [loading]="recordsQuery.isPending()">
      <div class="mb-4 flex flex-wrap items-end gap-4">
        <app-input-field placeholder="Periodo YYYY-MM" [value]="period()" (valueChange)="period.set($event + '')" />
        <app-button variant="outline" (btnClick)="recordsQuery.refetch()">Actualizar</app-button>
      </div>

      <div class="mb-6 grid gap-4 md:grid-cols-3">
        <app-input-field placeholder="Nombre cliente" [value]="partyNombre()" (valueChange)="partyNombre.set($event + '')" />
        <app-input-field placeholder="Tipo doc (1=DNI, 6=RUC)" [value]="partyDocType()" (valueChange)="partyDocType.set($event + '')" />
        <app-input-field placeholder="Número documento" [value]="partyDocNumber()" (valueChange)="partyDocNumber.set($event + '')" />
        <app-input-field placeholder="Serie comprobante ref." [value]="refSerie()" (valueChange)="refSerie.set($event + '')" />
        <app-input-field placeholder="Número comprobante ref." [value]="refNumero()" (valueChange)="refNumero.set($event + '')" />
        <app-input-field placeholder="Base imponible" [value]="baseImponible()" (valueChange)="onBaseChange($event + '')" />
        <div>
          <app-label>Régimen</app-label>
          <app-form-select
            placeholder="Seleccione tasa"
            [options]="regimenOptions()"
            [value]="regimenCodigo()"
            (valueChange)="onRegimenChange($event)"
          />
        </div>
        <app-input-field placeholder="Monto calculado" [value]="montoCalculado()" [disabled]="true" />
        <app-button class="mt-6" [disabled]="createMutation.isPending()" (btnClick)="emitPerception()">
          Emitir percepción
        </app-button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b text-left text-gray-500">
              <th class="py-2 pr-4">Fecha</th>
              <th class="py-2 pr-4">Cliente</th>
              <th class="py-2 pr-4">Doc</th>
              <th class="py-2 pr-4">Ref.</th>
              <th class="py-2 pr-4">Base</th>
              <th class="py-2 pr-4">Monto</th>
              <th class="py-2">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            @for (row of recordRows; track row.id) {
              <tr class="border-b border-gray-100">
                <td class="py-2 pr-4">{{ row.fechaOperacion | date: 'shortDate' }}</td>
                <td class="py-2 pr-4">{{ row.partyNombre }}</td>
                <td class="py-2 pr-4">{{ row.partyDocNumber }}</td>
                <td class="py-2 pr-4">
                  {{ row.comprobanteModificadoSerie }}-{{ row.comprobanteModificadoNumero }}
                </td>
                <td class="py-2 pr-4">S/ {{ row.baseImponible }}</td>
                <td class="py-2 pr-4">S/ {{ row.monto }}</td>
                <td class="py-2">
                  @if (row.electronicDocument) {
                    {{ row.electronicDocument.serie }}-{{ row.electronicDocument.numero }}
                    · {{ row.electronicDocument.sunatStatus }}
                  } @else {
                    -
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </app-component-card>
  `,
})
export class PercepcionesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly period = signal(new Date().toISOString().slice(0, 7));
  protected readonly partyNombre = signal('');
  protected readonly partyDocType = signal('1');
  protected readonly partyDocNumber = signal('');
  protected readonly refSerie = signal('');
  protected readonly refNumero = signal('');
  protected readonly baseImponible = signal('');
  protected readonly regimenCodigo = signal('');
  protected readonly selectedTasa = signal(0);
  protected readonly montoCalculado = signal('');

  protected readonly ratesQuery = injectQuery(() => ({
    queryKey: ['compliance', 'sunat-rates', 'PERCEPCION'] as const,
    queryFn: () => firstValueFrom(this.api.listSunatWithholdingRates('PERCEPCION')),
  }));

  protected readonly perceptionRates = computed(
    () => this.ratesQuery.data() ?? ([] as SunatWithholdingRateDto[]),
  );

  protected readonly regimenOptions = computed(() =>
    this.perceptionRates().map((rate) => ({
      value: rate.codigo,
      label: `${rate.nombre} (${rate.tasa}%)`,
    })),
  );

  protected readonly records = computed(() => this.recordsQuery.data() ?? []);

  protected readonly recordsQuery = injectQuery(() => ({
    queryKey: ['compliance', 'tax-withholding', 'PERCEPCION', this.period()] as const,
    queryFn: () => firstValueFrom(this.api.listTaxWithholdingRecords('PERCEPCION', this.period())),
  }));

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createPercepcion({
          partyNombre: this.partyNombre().trim(),
          partyDocType: this.partyDocType().trim(),
          partyDocNumber: this.partyDocNumber().trim(),
          regimenCodigo: this.regimenCodigo() || undefined,
          tasa: this.selectedTasa() || undefined,
          baseImponible: Number(this.baseImponible()),
          comprobanteModificadoTipo: '01',
          comprobanteModificadoSerie: this.refSerie().trim() || undefined,
          comprobanteModificadoNumero: this.refNumero().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Percepción emitida');
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'tax-withholding', 'PERCEPCION'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir percepción')),
  }));

  protected get perceptionRateRows(): SunatWithholdingRateDto[] {
    return this.perceptionRates();
  }

  protected get recordRows() {
    return this.records();
  }

  protected onRegimenChange(codigo: string) {
    this.regimenCodigo.set(codigo);
    const rate = this.perceptionRates().find((r) => r.codigo === codigo);
    this.selectedTasa.set(rate ? Number(rate.tasa) : 0);
    this.recalculateMonto();
  }

  protected onBaseChange(value: string) {
    this.baseImponible.set(value);
    this.recalculateMonto();
  }

  protected emitPerception() {
    if (!this.partyNombre().trim() || !this.partyDocNumber().trim() || !this.baseImponible().trim()) {
      this.notify.warning('Complete cliente, documento y base imponible');
      return;
    }
    if (!this.regimenCodigo() && this.selectedTasa() <= 0) {
      this.notify.warning('Seleccione un régimen de percepción');
      return;
    }
    this.createMutation.mutate();
  }

  private recalculateMonto() {
    const base = Number(this.baseImponible());
    const tasa = this.selectedTasa();
    if (!base || !tasa) {
      this.montoCalculado.set('');
      return;
    }
    firstValueFrom(this.api.calculateTaxWithholding(base, tasa))
      .then((res) => this.montoCalculado.set(res.monto))
      .catch(() => this.montoCalculado.set(''));
  }
}
