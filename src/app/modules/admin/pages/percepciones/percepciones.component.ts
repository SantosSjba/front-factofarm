import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { NotifyService } from '../../../../core/services/notify.service';
import { isValidRuc } from '../../../../core/utils/peru-documents';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { SunatWithholdingRateDto } from '../../models/directory.models';
import { LocaleService } from '../../../../core/services/locale.service';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';

@Component({
  selector: 'app-percepciones',
  standalone: true,
  imports: [
    PageToolbarComponent,
    AppDatePipe,
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
    FormFieldComponent,
    FormSelectComponent,
    LabelComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Facturación' }, { label: 'Percepciones' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold text-gray-800 dark:text-white/90">Percepciones</h1>
    </app-page-toolbar>

    <app-component-card title="Percepciones SUNAT" [loading]="recordsQuery.isPending()">
      <div class="mb-4 flex flex-wrap items-end gap-4">
        <app-form-field label="Periodo">
          <app-input-field type="month" placeholder="YYYY-MM" ariaLabel="Periodo YYYY-MM" [value]="period()" (valueChange)="period.set($event + '')" />
        </app-form-field>
        <app-button variant="outline" (btnClick)="recordsQuery.refetch()">Actualizar</app-button>
      </div>

      <div class="mb-6 grid gap-4 md:grid-cols-3">
        <app-form-field label="Nombre del cliente" required>
          <app-input-field [value]="partyNombre()" (valueChange)="partyNombre.set($event + '')" [maxLength]="200" />
        </app-form-field>
        <app-form-field label="Tipo doc. (SUNAT)" required helpText="Catálogo 06 SUNAT: 1 = DNI, 6 = RUC, 4 = CE, 7 = Pasaporte.">
          <app-input-field placeholder="1=DNI, 6=RUC" [value]="partyDocType()" (valueChange)="partyDocType.set($event + '')" [maxLength]="20" />
        </app-form-field>
        <app-form-field label="Número documento" required>
          <app-input-field [value]="partyDocNumber()" (valueChange)="partyDocNumber.set($event + '')" [maxLength]="20" />
        </app-form-field>
        <app-form-field label="Serie comprobante ref.">
          <app-input-field placeholder="F001" [value]="refSerie()" (valueChange)="refSerie.set($event + '')" [maxLength]="10" />
        </app-form-field>
        <app-form-field label="Número comprobante ref.">
          <app-input-field [value]="refNumero()" (valueChange)="refNumero.set($event + '')" [maxLength]="20" />
        </app-form-field>
        <app-form-field label="Base imponible (S/)" required>
          <app-input-field type="number" min="0.01" [value]="baseImponible()" (valueChange)="onBaseChange($event + '')" />
        </app-form-field>
        <div>
          <app-label required>Régimen</app-label>
          <app-form-select
            placeholder="Seleccione tasa"
            [options]="regimenOptions()"
            [value]="regimenCodigo()"
            (valueChange)="onRegimenChange($event)"
          />
        </div>
        <app-form-field label="Monto calculado">
          <app-input-field [value]="montoCalculado()" [disabled]="true" />
        </app-form-field>
        @if (specialDocumentBlockedMessage(); as blocked) {
          <p class="md:col-span-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            {{ blocked }}
          </p>
        }
        <app-button class="mt-6" [disabled]="createMutation.isPending() || !canEmitSpecialDocument()" [loading]="createMutation.isPending()" (btnClick)="emitPerception()">
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
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="py-2 pr-4">{{ row.fechaOperacion | appDate: 'shortDate' }}</td>
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
  ` })
export class PercepcionesComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly period = signal(this.locale.currentYearMonth());
  protected readonly partyNombre = signal('');
  protected readonly partyDocType = signal('1');
  protected readonly partyDocNumber = signal('');
  protected readonly refSerie = signal('');
  protected readonly refNumero = signal('');
  protected readonly baseImponible = signal('');
  protected readonly regimenCodigo = signal('');
  protected readonly selectedTasa = signal(0);
  protected readonly montoCalculado = signal('');

  protected readonly billingConfigQuery = injectQuery(() => ({
    queryKey: ['billing', 'config'] as const,
    queryFn: () => firstValueFrom(this.api.getBillingConfig()) }));

  protected readonly billingCapabilities = computed(() => this.billingConfigQuery.data()?.capabilities);

  protected canEmitSpecialDocument(): boolean {
    const caps = this.billingCapabilities();
    if (!caps) return true;
    return !caps.unsupportedSpecialDocuments.some((row) => row.documentType === 'PERCEPCION');
  }

  protected specialDocumentBlockedMessage(): string | null {
    const caps = this.billingCapabilities();
    return caps?.unsupportedSpecialDocuments.find((row) => row.documentType === 'PERCEPCION')?.reason ?? null;
  }

  protected readonly ratesQuery = injectQuery(() => ({
    queryKey: ['compliance', 'sunat-rates', 'PERCEPCION'] as const,
    queryFn: () => firstValueFrom(this.api.listSunatWithholdingRates('PERCEPCION')) }));

  protected readonly perceptionRates = computed(
    () => this.ratesQuery.data() ?? ([] as SunatWithholdingRateDto[]),
  );

  protected readonly regimenOptions = computed(() =>
    this.perceptionRates().map((rate) => ({
      value: rate.codigo,
      label: `${rate.nombre} (${rate.tasa}%)` })),
  );

  protected readonly records = computed(() => this.recordsQuery.data() ?? []);

  protected readonly recordsQuery = injectQuery(() => ({
    queryKey: ['compliance', 'tax-withholding', 'PERCEPCION', this.period()] as const,
    queryFn: () => firstValueFrom(this.api.listTaxWithholdingRecords('PERCEPCION', this.period())) }));

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
          comprobanteModificadoNumero: this.refNumero().trim() || undefined }),
      ),
    onSuccess: () => {
      this.notify.success('Percepción emitida');
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'tax-withholding', 'PERCEPCION'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir percepción')) }));

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
    if (!this.partyDocType().trim()) {
      this.notify.warning('Indique el tipo de documento SUNAT del cliente (ej. 6 = RUC).');
      return;
    }
    if (this.partyDocType().trim() === '6' && !isValidRuc(this.partyDocNumber().trim())) {
      this.notify.warning('El RUC del cliente no es válido.');
      return;
    }
    const base = Number(this.baseImponible());
    if (!Number.isFinite(base) || base < 0.01) {
      this.notify.warning('La base imponible debe ser un número mayor a 0.');
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
