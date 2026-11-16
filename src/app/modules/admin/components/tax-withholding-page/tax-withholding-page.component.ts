import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { isValidRuc } from '../../../../core/utils/peru-documents';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { SearchSelectComponent, type SearchSelectOption } from '../../../../shared/components/form/search-select/search-select.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { TabStripComponent, type TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import type { TaxWithholdingRecordDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { sunatStatusLabel, sunatStatusTone } from '../../utils/sale-labels';
import { SUNAT_DOC_TYPE_FROM_PARTY, SUNAT_DOC_TYPE_OPTIONS, sunatDocTypeShort } from '../../utils/sunat-doc-types';

export type TaxWithholdingPageKind = 'RETENCION' | 'PERCEPCION';
type StatusGroup = 'aceptado' | 'pendiente' | 'rechazado';

/** Textos de cada tipo: la pantalla es la misma, cambian la contraparte y la fuente de datos. */
const CONFIG: Record<TaxWithholdingPageKind, {
  title: string;
  singular: string;
  party: string;
  partyPlural: string;
  verb: string;
  amountLabel: string;
  defaultDocType: string;
  help: string[];
}> = {
  RETENCION: {
    title: 'Retenciones',
    singular: 'retención',
    party: 'Proveedor',
    partyPlural: 'proveedores',
    verb: 'Retenido',
    amountLabel: 'Monto retenido',
    defaultDocType: '6',
    help: [
      'Si eres agente de retención, al pagar una factura a un proveedor te quedas con un porcentaje del IGV y se lo entregas a SUNAT. Aquí emites el comprobante de retención (serie R).',
      'Elige el proveedor (o escribe sus datos), la factura que pagas, la base y el régimen: el monto se calcula solo.',
      'En «Detracciones» ves las detracciones de tus facturas de venta; sincronízalas para traer las del periodo.',
    ],
  },
  PERCEPCION: {
    title: 'Percepciones',
    singular: 'percepción',
    party: 'Cliente',
    partyPlural: 'clientes',
    verb: 'Percibido',
    amountLabel: 'Monto percibido',
    defaultDocType: '1',
    help: [
      'Si eres agente de percepción, al vender ciertos bienes cobras al cliente un porcentaje adicional a cuenta de su IGV. Aquí emites el comprobante de percepción (serie P).',
      'Elige el cliente (o escribe sus datos), la factura de la venta, la base y el régimen: el monto se calcula solo.',
    ],
  },
};


/**
 * Pantalla de retenciones o percepciones SUNAT: listado del periodo con resumen en chips y
 * emisión en un modal. Con `kind="RETENCION"` agrega la pestaña de detracciones.
 */
@Component({
  selector: 'app-tax-withholding-page',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    AlertComponent,
    BreadcrumbInlineComponent,
    ButtonComponent,
    FormSectionComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    ModalComponent,
    PageStateComponent,
    PageToolbarComponent,
    PaginationComponent,
    SearchSelectComponent,
    StatusBadgeComponent,
    TabStripComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Comprobantes avanzados' }, { label: cfg().title }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ cfg().title }}</h1>
      <div data-toolbar-actions class="flex flex-wrap items-center gap-2">
        @if (tab() === 'detracciones') {
          <app-button size="sm" variant="outline" startIconName="mdi:sync" tooltip="Trae las detracciones de las facturas de venta del periodo." [loading]="syncMutation.isPending()" [disabled]="syncMutation.isPending()" (btnClick)="syncMutation.mutate()">
            Sincronizar desde facturas
          </app-button>
        } @else {
          <app-button size="sm" startIconName="mdi:plus" [disabled]="!canEmit()" [tooltip]="blockedMessage() ?? ''" (btnClick)="openForm()">
            Emitir {{ cfg().singular }}
          </app-button>
        }
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" [storageKey]="'tax-withholding-' + kind()">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        @for (line of cfg().help; track line) {
          <li>{{ line }}</li>
        }
      </ol>
    </app-help-panel>

    @if (kind() === 'RETENCION') {
      <app-tab-strip class="mb-4 block" [tabs]="tabs" [activeId]="tab()" (tabChange)="setTab($event)" />
    }

    @if (blockedMessage(); as blocked) {
      @if (tab() !== 'detracciones') {
        <app-alert class="mb-4 block" variant="warning" title="Tu proveedor de facturación no emite este comprobante" [message]="blocked" />
      }
    }

    <!-- Periodo + buscador; el resumen del periodo va en chips (los de estado SUNAT filtran). -->
    <app-list-filters
      compact
      [showSelect]="false"
      [searchValue]="search()"
      [searchPlaceholder]="tab() === 'detracciones' ? 'Buscar cliente o factura' : 'Buscar ' + cfg().party.toLowerCase() + ', documento o factura'"
      clearLabel="Limpiar"
      [summaryChips]="summaryChips()"
      summaryLabel="Resumen del periodo"
      [summaryStorageKey]="'tax-withholding-' + kind()"
      (summaryChipClick)="onSummaryChip($event)"
      (searchValueChange)="setSearch($event)"
      (clear)="clearFilters()"
    >
      <div data-filters class="contents">
        <app-input-field compact class="min-w-0 flex-[2] basis-40" icon="mdi:calendar-month" label="Periodo" type="month" [value]="period()" (valueChange)="setPeriod($event + '')" />
      </div>
    </app-list-filters>

    @if (tab() === 'detracciones') {
      <app-page-state
        [loading]="detraccionesQuery.isPending()"
        [error]="detraccionesQuery.isError() ? 'No se pudieron cargar las detracciones.' : null"
        [empty]="detraccionesQuery.isSuccess() && !filteredDetracciones().length"
        [emptyTitle]="search().trim() ? 'Sin detracciones con esa búsqueda' : 'Sin detracciones en el periodo'"
        emptyHint="Usa «Sincronizar desde facturas» para traer las de tus facturas de venta."
        skeleton="table"
        (retry)="detraccionesQuery.refetch()"
      >
        <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="max-w-full overflow-x-auto">
            <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
              <caption class="sr-only">Detracciones del periodo</caption>
              <thead class="border-b border-gray-100 dark:border-white/[0.05]">
                <tr>
                  <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                  <th data-card-role="title" class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Cliente</th>
                  <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Factura</th>
                  <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Base</th>
                  <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Detracción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                @for (row of pagedDetracciones(); track row.id) {
                  <tr>
                    <td class="px-5 py-3 text-theme-sm whitespace-nowrap">{{ row.fechaOperacion | appDate: 'dd/MM/yyyy' }}</td>
                    <td class="px-5 py-3 text-theme-sm">
                      <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.partyNombre }}</span>
                      <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ partyDoc(row) }}</span>
                    </td>
                    <td class="px-5 py-3 text-theme-sm whitespace-nowrap">{{ refLabel(row) }}</td>
                    <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ num(row.baseImponible) | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                    <td class="px-5 py-3 text-end text-theme-sm tabular-nums whitespace-nowrap">
                      <span class="font-semibold text-gray-800 dark:text-white/90">{{ num(row.monto) | currency: 'PEN' : 'symbol' : '1.2-2' }}</span>
                      <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ num(row.tasa) }}%</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </app-page-state>
      <app-pagination [currentPage]="page()" [totalItems]="filteredDetracciones().length" [pageSize]="pageSize" (currentPageChange)="page.set($event)" />
    } @else {
      <app-page-state
        [loading]="recordsQuery.isPending()"
        [error]="recordsQuery.isError() ? 'No se pudieron cargar los comprobantes.' : null"
        [empty]="recordsQuery.isSuccess() && !filteredRecords().length"
        [emptyTitle]="search().trim() || statusFilter() ? 'Sin comprobantes con esos filtros' : 'Sin ' + cfg().title.toLowerCase() + ' en el periodo'"
        [emptyHint]="search().trim() || statusFilter() ? 'Prueba con otra búsqueda o limpia los filtros.' : 'Usa «Emitir ' + cfg().singular + '» para registrar la primera.'"
        skeleton="table"
        (retry)="recordsQuery.refetch()"
      >
        <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="max-w-full overflow-x-auto">
            <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
              <caption class="sr-only">{{ cfg().title }} del periodo</caption>
              <thead class="border-b border-gray-100 dark:border-white/[0.05]">
                <tr>
                  <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                  <th data-card-role="title" class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{{ cfg().party }}</th>
                  <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Comprobante</th>
                  <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Base</th>
                  <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">{{ cfg().verb }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                @for (row of pagedRecords(); track row.id) {
                  <tr [attr.data-row-tone]="statusGroup(row) === 'rechazado' ? 'error' : null">
                    <td class="px-5 py-3 text-theme-sm whitespace-nowrap">{{ row.fechaOperacion | appDate: 'dd/MM/yyyy' }}</td>
                    <td class="px-5 py-3 text-theme-sm">
                      <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.partyNombre }}</span>
                      <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ partyDoc(row) }}</span>
                    </td>
                    <td class="px-5 py-3 text-theme-sm">
                      @if (row.electronicDocument; as doc) {
                        <span class="block font-medium text-gray-800 dark:text-white/90">{{ doc.serie }}-{{ doc.numero }}</span>
                      } @else {
                        <span class="block text-gray-500 dark:text-gray-400">Sin comprobante</span>
                      }
                      <span class="mt-0.5 flex flex-wrap items-center gap-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
                        <app-status-badge [status]="row.electronicDocument?.sunatStatus ?? 'SIN_EMITIR'" [tone]="tone(row)" [label]="statusLabel(row)" />
                        {{ refLabel(row) !== '—' ? 'Ref. ' + refLabel(row) : '' }}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ num(row.baseImponible) | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                    <td class="px-5 py-3 text-end text-theme-sm tabular-nums whitespace-nowrap">
                      <span class="font-semibold text-gray-800 dark:text-white/90">{{ num(row.monto) | currency: 'PEN' : 'symbol' : '1.2-2' }}</span>
                      <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ num(row.tasa) }}%</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </app-page-state>
      <app-pagination [currentPage]="page()" [totalItems]="filteredRecords().length" [pageSize]="pageSize" (currentPageChange)="page.set($event)" />
    }

    <!-- ========== EMITIR ========== -->
    <app-modal compact [isOpen]="formOpen()" (closed)="closeForm()" className="w-full max-w-2xl shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">Emitir {{ cfg().singular }}</h3>
        <p class="mt-1 pe-12 text-sm text-gray-500 dark:text-gray-400">Se genera el comprobante electrónico y se envía a SUNAT.</p>
      </div>
      <div data-modal-body class="min-h-0 space-y-5 px-4 py-4 sm:px-6">
        <app-form-section compact [title]="cfg().party" [description]="'Busca uno de tus ' + cfg().partyPlural + ' o escribe sus datos.'" [cols]="2">
          <app-search-select
            compact
            class="sm:col-span-2"
            [label]="'Buscar ' + cfg().party.toLowerCase() + ' registrado'"
            helpText="Opcional: completa el nombre y el documento por ti."
            placeholder="Nombre o número de documento"
            [emptyText]="'No se encontró ningún ' + cfg().party.toLowerCase() + '.'"
            [resetToken]="pickerReset()"
            [options]="partyOptions()"
            [loading]="partyQuery.isFetching()"
            (searchChange)="partyTerm.set($event)"
            (selected)="pickParty($event)"
          />
          <app-form-select compact label="Tipo de documento" [required]="true" [showPlaceholder]="false" [options]="docTypeOptions" [value]="partyDocType()" (valueChange)="partyDocType.set($event)" />
          <app-input-field compact label="Número de documento" [isRequired]="true" inputMode="numeric" [maxLength]="20" [value]="partyDocNumber()" (valueChange)="partyDocNumber.set($event + '')" />
          <app-input-field compact class="sm:col-span-2" [label]="partyDocType() === '6' ? 'Razón social' : 'Nombre completo'" [isRequired]="true" [maxLength]="200" [value]="partyNombre()" (valueChange)="partyNombre.set($event + '')" />
        </app-form-section>

        <app-form-section compact title="Factura de origen" description="La factura a la que se aplica este comprobante." [cols]="2">
          <app-input-field compact label="Serie" placeholder="F001" [maxLength]="10" [value]="refSerie()" (valueChange)="refSerie.set(($event + '').toUpperCase())" />
          <app-input-field compact label="Número" placeholder="123" inputMode="numeric" [maxLength]="20" [value]="refNumero()" (valueChange)="refNumero.set($event + '')" />
        </app-form-section>

        <app-form-section compact title="Importe" [cols]="3">
          <app-input-field compact label="Base imponible (S/)" [isRequired]="true" helpText="Importe de la factura sobre el que se calcula." type="number" min="0.01" step="any" placeholder="0.00" [value]="baseImponible()" (valueChange)="onBaseChange($event + '')" />
          <app-form-select compact label="Régimen" [required]="true" helpText="Define el porcentaje que se aplica." placeholder="Seleccionar" [options]="regimenOptions()" [value]="regimenCodigo()" (valueChange)="onRegimenChange($event)" />
          <app-input-field compact [label]="cfg().amountLabel" [value]="montoCalculado() ? ((num(montoCalculado()) | currency: 'PEN' : 'symbol' : '1.2-2') ?? '') : ''" placeholder="Se calcula solo" [disabled]="true" />
        </app-form-section>
      </div>
      <div data-modal-footer class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <p class="text-xs text-gray-500 dark:text-gray-400"><span class="text-error-500">*</span> Campos obligatorios</p>
        <div class="flex items-center gap-2">
          <app-button size="sm" variant="outline" startIconName="mdi:close" [disabled]="createMutation.isPending()" (btnClick)="closeForm()">Cancelar</app-button>
          <app-button size="sm" startIconName="mdi:send-outline" [disabled]="createMutation.isPending() || !canEmit()" [loading]="createMutation.isPending()" (btnClick)="emit()">Emitir {{ cfg().singular }}</app-button>
        </div>
      </div>
    </app-modal>
  `,
})
export class TaxWithholdingPageComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly locale = inject(LocaleService);
  private readonly queryClient = injectQueryClient();

  readonly kind = input.required<TaxWithholdingPageKind>();
  protected readonly cfg = computed(() => CONFIG[this.kind()]);
  protected readonly docTypeOptions = SUNAT_DOC_TYPE_OPTIONS;
  protected readonly tabs: TabStripItem[] = [
    { id: 'comprobantes', label: 'Retenciones' },
    { id: 'detracciones', label: 'Detracciones' },
  ];
  protected readonly pageSize = 15;

  // ---------- Listado ----------
  protected readonly tab = signal<'comprobantes' | 'detracciones'>('comprobantes');
  protected readonly period = signal(this.locale.currentYearMonth());
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusGroup | ''>('');
  protected readonly page = signal(1);

  protected readonly billingConfigQuery = injectQuery(() => ({
    queryKey: ['billing', 'config'] as const,
    queryFn: () => firstValueFrom(this.api.getBillingConfig()),
  }));
  protected readonly blockedMessage = computed(
    () =>
      this.billingConfigQuery.data()?.capabilities?.unsupportedSpecialDocuments.find((row) => row.documentType === this.kind())
        ?.reason ?? null,
  );
  protected readonly canEmit = computed(() => !this.blockedMessage());

  protected readonly recordsQuery = injectQuery(() => ({
    queryKey: ['compliance', 'tax-withholding', this.kind(), this.period()] as const,
    queryFn: () => firstValueFrom(this.api.listTaxWithholdingRecords(this.kind(), this.period())),
  }));
  protected readonly detraccionesQuery = injectQuery(() => ({
    queryKey: ['compliance', 'tax-withholding', 'DETRACCION', this.period()] as const,
    enabled: this.kind() === 'RETENCION' && this.tab() === 'detracciones',
    queryFn: () => firstValueFrom(this.api.listTaxWithholdingRecords('DETRACCION', this.period())),
  }));

  private readonly searched = computed(() => this.matching(this.recordsQuery.data() ?? []));
  protected readonly filteredRecords = computed(() => {
    const status = this.statusFilter();
    return status ? this.searched().filter((row) => this.statusGroup(row) === status) : this.searched();
  });
  protected readonly pagedRecords = computed(() => this.slice(this.filteredRecords()));
  protected readonly filteredDetracciones = computed(() => this.matching(this.detraccionesQuery.data() ?? []));
  protected readonly pagedDetracciones = computed(() => this.slice(this.filteredDetracciones()));

  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  /** Totales del periodo con la búsqueda aplicada; los de estado SUNAT filtran al pulsarlos. */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    if (this.tab() === 'detracciones') {
      const rows = this.filteredDetracciones();
      if (!this.detraccionesQuery.isSuccess()) return [];
      return [
        { id: 'count', label: 'Detracciones', count: rows.length, icon: 'mdi:file-document-outline', clickable: false },
        { id: 'base', label: 'Base', count: this.pen.format(this.sum(rows, 'baseImponible')), clickable: false },
        { id: 'monto', label: 'Detraído', count: this.pen.format(this.sum(rows, 'monto')), tone: 'brand', clickable: false },
      ];
    }
    if (!this.recordsQuery.isSuccess()) return [];
    const rows = this.searched();
    const by = (g: StatusGroup) => rows.filter((row) => this.statusGroup(row) === g).length;
    const s = this.statusFilter();
    return [
      { id: 'all', label: 'Emitidas', count: rows.length, icon: 'mdi:file-document-outline', active: !s },
      { id: 'aceptado', label: 'Aceptadas por SUNAT', count: by('aceptado'), tone: 'success', active: s === 'aceptado' },
      { id: 'pendiente', label: 'Pendientes', count: by('pendiente'), tone: 'warning', active: s === 'pendiente', tooltip: 'Aún sin respuesta de SUNAT o sin enviar.' },
      { id: 'rechazado', label: 'Rechazadas', count: by('rechazado'), tone: 'error', active: s === 'rechazado' },
      { id: 'monto', label: this.cfg().verb, count: this.pen.format(this.sum(rows, 'monto')), tone: 'brand', clickable: false, tooltip: 'Suma del periodo.' },
    ];
  });

  protected readonly syncMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.api.syncDetracciones(this.period())),
    onSuccess: (res) => {
      if (res.message) {
        this.notify.warning(res.message);
        return;
      }
      this.notify.success(`Sincronizadas ${res.synced} detracciones`);
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'tax-withholding', 'DETRACCION'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo sincronizar detracciones')),
  }));

  // ---------- Formulario ----------
  protected readonly formOpen = signal(false);
  protected readonly partyNombre = signal('');
  protected readonly partyDocType = signal('6');
  protected readonly partyDocNumber = signal('');
  protected readonly refSerie = signal('');
  protected readonly refNumero = signal('');
  protected readonly baseImponible = signal('');
  protected readonly regimenCodigo = signal('');
  protected readonly selectedTasa = signal(0);
  protected readonly montoCalculado = signal('');
  protected readonly partyTerm = signal('');
  protected readonly pickerReset = signal(0);

  protected readonly ratesQuery = injectQuery(() => ({
    queryKey: ['compliance', 'sunat-rates', this.kind()] as const,
    queryFn: () => firstValueFrom(this.api.listSunatWithholdingRates(this.kind())),
  }));
  protected readonly regimenOptions = computed(() =>
    (this.ratesQuery.data() ?? []).map((rate) => ({ value: rate.codigo, label: `${rate.nombre} (${Number(rate.tasa)}%)` })),
  );

  /** Proveedores para retenciones, clientes para percepciones. */
  protected readonly partyQuery = injectQuery(() => {
    const search = this.partyTerm();
    const kind = this.kind();
    return {
      queryKey: ['tax-withholding', 'party-picker', kind, search],
      enabled: this.formOpen(),
      queryFn: async (): Promise<(SearchSelectOption & { docType: string; nombre: string; numero: string })[]> => {
        if (kind === 'RETENCION') {
          const res = await firstValueFrom(this.api.listSuppliersPaged({ search: search || undefined, page: 1, pageSize: 15 }));
          return res.items.map((s) => ({ value: s.id, label: s.razonSocial, meta: s.numeroDocumento, docType: SUNAT_DOC_TYPE_FROM_PARTY[s.tipoDocumento] ?? '0', nombre: s.razonSocial, numero: s.numeroDocumento }));
        }
        const res = await firstValueFrom(this.api.listCustomers({ search: search || undefined, page: 1, pageSize: 15 }));
        return res.items.map((c) => ({ value: c.id, label: c.nombre, meta: c.numeroDocumento, docType: SUNAT_DOC_TYPE_FROM_PARTY[c.tipoDocumento] ?? '0', nombre: c.nombre, numero: c.numeroDocumento }));
      },
    };
  });
  protected readonly partyOptions = computed(() => this.partyQuery.data() ?? []);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () => {
      const body = {
        partyNombre: this.partyNombre().trim(),
        partyDocType: this.partyDocType(),
        partyDocNumber: this.partyDocNumber().trim(),
        regimenCodigo: this.regimenCodigo() || undefined,
        tasa: this.selectedTasa() || undefined,
        baseImponible: Number(this.baseImponible()),
        comprobanteModificadoTipo: '01',
        comprobanteModificadoSerie: this.refSerie().trim() || undefined,
        comprobanteModificadoNumero: this.refNumero().trim() || undefined,
      };
      return firstValueFrom(this.kind() === 'RETENCION' ? this.api.createRetencion(body) : this.api.createPercepcion(body));
    },
    onSuccess: () => {
      this.notify.success(this.kind() === 'RETENCION' ? 'Retención emitida' : 'Percepción emitida');
      this.formOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'tax-withholding', this.kind()] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, `No se pudo emitir la ${this.cfg().singular}`)),
  }));

  protected setTab(id: string) {
    this.tab.set(id === 'detracciones' ? 'detracciones' : 'comprobantes');
    this.statusFilter.set('');
    this.page.set(1);
  }

  protected setPeriod(value: string) {
    this.period.set(value || this.locale.currentYearMonth());
    this.page.set(1);
  }

  protected setSearch(value: string) {
    this.search.set(value);
    this.page.set(1);
  }

  protected clearFilters() {
    this.search.set('');
    this.statusFilter.set('');
    this.period.set(this.locale.currentYearMonth());
    this.page.set(1);
  }

  protected onSummaryChip(chip: SummaryChip) {
    const next = chip.id === 'all' ? '' : (chip.id as StatusGroup);
    this.statusFilter.set(this.statusFilter() === next ? '' : next);
    this.page.set(1);
  }

  protected openForm() {
    this.partyNombre.set('');
    this.partyDocType.set(this.cfg().defaultDocType);
    this.partyDocNumber.set('');
    this.refSerie.set('');
    this.refNumero.set('');
    this.baseImponible.set('');
    this.regimenCodigo.set('');
    this.selectedTasa.set(0);
    this.montoCalculado.set('');
    this.partyTerm.set('');
    this.pickerReset.update((n) => n + 1);
    this.formOpen.set(true);
  }

  protected closeForm() {
    if (this.createMutation.isPending()) return;
    this.formOpen.set(false);
  }

  protected pickParty(option: SearchSelectOption) {
    const party = this.partyOptions().find((row) => row.value === option.value);
    if (!party) return;
    this.partyNombre.set(party.nombre);
    this.partyDocType.set(party.docType);
    this.partyDocNumber.set(party.numero);
  }

  protected onRegimenChange(codigo: string) {
    this.regimenCodigo.set(codigo);
    const rate = (this.ratesQuery.data() ?? []).find((r) => r.codigo === codigo);
    this.selectedTasa.set(rate ? Number(rate.tasa) : 0);
    this.recalculateMonto();
  }

  protected onBaseChange(value: string) {
    this.baseImponible.set(value);
    this.recalculateMonto();
  }

  protected emit() {
    const party = this.cfg().party.toLowerCase();
    const number = this.partyDocNumber().trim();
    if (!number) {
      this.notify.warning(`Indique el número de documento del ${party}.`);
      return;
    }
    if (this.partyDocType() === '6' && !isValidRuc(number)) {
      this.notify.warning(`El RUC del ${party} no es válido.`);
      return;
    }
    if (this.partyDocType() === '1' && !/^\d{8}$/.test(number)) {
      this.notify.warning('El DNI debe tener 8 dígitos.');
      return;
    }
    if (!this.partyNombre().trim()) {
      this.notify.warning(`Indique el nombre del ${party}.`);
      return;
    }
    const base = Number(this.baseImponible());
    if (!Number.isFinite(base) || base < 0.01) {
      this.notify.warning('La base imponible debe ser un número mayor a 0.');
      return;
    }
    if (!this.regimenCodigo()) {
      this.notify.warning(`Seleccione el régimen de ${this.cfg().singular}.`);
      return;
    }
    this.createMutation.mutate();
  }

  protected statusGroup(row: TaxWithholdingRecordDto): StatusGroup {
    const status = row.electronicDocument?.sunatStatus ?? '';
    if (status === 'ACEPTADO' || status === 'OBSERVADO') return 'aceptado';
    if (status === 'RECHAZADO' || status === 'ANULADO') return 'rechazado';
    // PENDIENTE, ENVIANDO, CONTINGENCIA o sin comprobante todavía.
    return 'pendiente';
  }

  protected statusLabel(row: TaxWithholdingRecordDto): string {
    return row.electronicDocument ? sunatStatusLabel(row.electronicDocument.sunatStatus) : 'Sin emitir';
  }

  protected tone(row: TaxWithholdingRecordDto) {
    return row.electronicDocument ? sunatStatusTone(row.electronicDocument.sunatStatus) : 'neutral';
  }

  protected partyDoc(row: TaxWithholdingRecordDto): string {
    return `${sunatDocTypeShort(row.partyDocType)} ${row.partyDocNumber}`;
  }

  protected refLabel(row: TaxWithholdingRecordDto): string {
    const serie = row.comprobanteModificadoSerie;
    const numero = row.comprobanteModificadoNumero;
    return serie || numero ? [serie, numero].filter(Boolean).join('-') : '—';
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private matching(rows: TaxWithholdingRecordDto[]) {
    const term = this.search().trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.partyNombre, row.partyDocNumber, this.refLabel(row), row.electronicDocument ? `${row.electronicDocument.serie}-${row.electronicDocument.numero}` : '']
        .some((text) => text.toLowerCase().includes(term)),
    );
  }

  private slice<T>(rows: T[]): T[] {
    const start = (this.page() - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  private sum(rows: TaxWithholdingRecordDto[], key: 'monto' | 'baseImponible'): number {
    return rows.reduce((acc, row) => acc + this.num(row[key]), 0);
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
