import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { RegulatedPriceDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type FormErrors = Partial<Record<'codigo' | 'nombre' | 'precio' | 'desde' | 'hasta', string>>;

const EMPTY_FORM = { codigo: '', nombre: '', precio: '', desde: '', hasta: '', fuente: 'DIGEMED' };

/** La vigencia es una fecha sin hora: se muestra tal cual, sin convertir a la zona horaria local. */
export function dateOnly(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('/');
}

/** Estado de una fila, con la misma regla que aplica el API al controlar la venta. */
export function regulatedPriceStatus(
  row: Pick<RegulatedPriceDto, 'codigoDigemid' | 'vigenteDesde' | 'vigenteHasta'>,
  now = new Date(),
): { label: string; tone: StatusTone; help: string } {
  if (!row.codigoDigemid?.trim()) {
    return { label: 'Sin código', tone: 'warning', help: 'Sin código DIGEMID no se puede comparar con ningún producto.' };
  }
  const desde = row.vigenteDesde ? new Date(row.vigenteDesde) : null;
  const hasta = row.vigenteHasta ? new Date(row.vigenteHasta) : null;
  if (hasta && hasta < now) return { label: 'Vencido', tone: 'neutral', help: 'Ya pasó su fecha final: no se compara con las ventas.' };
  if ((!desde && !hasta) || (desde && desde <= now)) return { label: 'Vigente', tone: 'success', help: 'Se compara con las ventas.' };
  return { label: 'No vigente', tone: 'neutral', help: 'Aún no se compara con las ventas: revisa su fecha de inicio.' };
}

@Component({
  selector: 'app-precios-regulados',
  standalone: true,
  imports: [
    DecimalPipe,
    HelpPanelComponent,
    BreadcrumbInlineComponent,
    ButtonComponent,
    PageStateComponent,
    FormSectionComponent,
    HelpHintComponent,
    InputFieldComponent,
    ListFiltersComponent,
    ModalComponent,
    PageToolbarComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Productos' }, { label: 'Precios regulados DIGEMID' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Precios regulados DIGEMID</h1>
      <app-button data-toolbar-actions size="sm" startIconName="mdi:plus" (btnClick)="openForm()">Nuevo precio</app-button>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="precios-regulados">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Aquí registras el <strong>precio máximo</strong> al que se puede vender un medicamento, con su código DIGEMID.</li>
        <li>En <strong>Productos → Farmacia</strong> pones ese mismo código en «Código de medicamento DIGEMID».</li>
        <li>Al vender, el sistema compara el precio con este máximo. Si activas «Bloquear ventas sobre el precio máximo regulado» en <strong>Establecimientos</strong>, rechaza la venta que lo supere; viene desactivado.</li>
        <li>Este catálogo es solo de tu farmacia: otros clientes no lo ven ni lo cambian.</li>
      </ol>
    </app-help-panel>

    <!-- Buscador compacto; el estado se elige desde los chips (conteos de todo el catálogo). -->
    <app-list-filters
      compact
      [showSelect]="false"
      searchPlaceholder="Buscar por nombre o código DIGEMID"
      [searchValue]="search()"
      [summaryChips]="summaryChips()"
      summaryLabel="Resumen del catálogo"
      summaryStorageKey="precios-regulados"
      (summaryChipClick)="onSummaryChip($event)"
      (searchValueChange)="search.set($event)"
      (clear)="search.set(''); estado.set('')"
    />

    <!-- Tabla directa (sin tarjeta): el título ya está en la barra de la página. -->
    <app-page-state
      [loading]="listQuery.isPending()"
      [error]="listQuery.isError() ? 'No se pudieron cargar los precios regulados.' : null"
      [empty]="(listQuery.data() ?? []).length === 0"
      [emptyTitle]="search().trim() || estado() ? 'Sin precios con esos filtros' : 'Aún no hay precios regulados'"
      emptyHint="Usa «Nuevo precio» para registrar el primero."
      skeleton="table"
      (retry)="listQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="max-w-full overflow-x-auto">
        <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
          <caption class="sr-only">Precios máximos regulados</caption>
          <thead class="border-b border-gray-100 dark:border-white/[0.05]">
            <tr>
              <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                <span class="inline-flex items-center gap-1">Código <app-help-hint text="Código DIGEMID. Debe ser igual al que tiene el producto en la pestaña Farmacia." [iconSize]="14" /></span>
              </th>
              <th data-card-role="title" class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Medicamento</th>
              <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                <span class="inline-flex items-center gap-1">Precio máximo <app-help-hint text="Precio más alto al que se debería vender una unidad." [iconSize]="14" /></span>
              </th>
              <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Vigencia</th>
              <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Fuente</th>
              <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                <span class="inline-flex items-center gap-1">Estado <app-help-hint text="Vigente: se compara con las ventas. Vencido o No vigente: fuera de sus fechas. Sin código: no se puede comparar con ningún producto." [iconSize]="14" /></span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
            @for (row of listQuery.data() ?? []; track row.id) {
              @let state = status(row);
              <tr>
                <td class="px-5 py-3 text-theme-sm">{{ row.codigoDigemid ?? '—' }}</td>
                <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ row.nombre }}</td>
                <td class="px-5 py-3 text-theme-sm tabular-nums">S/ {{ row.precioMaximo | number: '1.2-4' }}</td>
                <td class="px-5 py-3 text-theme-sm whitespace-nowrap">
                  @if (row.vigenteDesde || row.vigenteHasta) {
                    {{ row.vigenteDesde ? dateOnly(row.vigenteDesde) : '…' }} – {{ row.vigenteHasta ? dateOnly(row.vigenteHasta) : 'sin fin' }}
                  } @else {
                    Sin límite
                  }
                </td>
                <td class="px-5 py-3 text-theme-sm">{{ row.fuente }}</td>
                <td class="px-5 py-3 text-theme-sm"><app-status-badge [status]="state.label" [label]="state.label" [tone]="state.tone" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      </div>
    </app-page-state>

    <app-modal compact [isOpen]="formOpen()" (closed)="closeForm()" className="w-full max-w-2xl" bodyClass="custom-scrollbar">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5 dark:border-gray-800">
        <h3 class="pe-10 text-xl font-semibold text-gray-800 dark:text-white/90">Nuevo precio regulado</h3>
        <p class="mt-1 pe-10 text-sm text-gray-500 dark:text-gray-400">El precio máximo se compara con las ventas de los productos que tengan este código.</p>
      </div>
      <div data-modal-body class="min-h-0 px-4 py-4 sm:px-6">
        <div class="space-y-5">
          <app-form-section compact icon="lucide:pill" title="Medicamento" [cols]="2">
            <app-input-field
              compact
              label="Código DIGEMID"
              [isRequired]="true"
              helpText="Código del medicamento en DIGEMID. Sin él no se puede comparar con tus productos. Si ya existe, al guardar se actualiza."
              [maxLength]="40"
              [value]="codigo()"
              [error]="!!errors().codigo"
              [hint]="errors().codigo ?? existingHint()"
              (valueChange)="codigo.set($event + ''); clearError('codigo')"
            />
            <app-input-field
              compact
              label="Precio máximo (S/)"
              [isRequired]="true"
              helpText="Precio más alto al que se debería vender una unidad."
              type="number"
              min="0"
              step="0.01"
              [value]="precio()"
              [error]="!!errors().precio"
              [hint]="errors().precio"
              (valueChange)="precio.set($event + ''); clearError('precio')"
            />
            <app-input-field
              compact
              class="md:col-span-2"
              label="Nombre del medicamento"
              [isRequired]="true"
              helpText="Nombre para reconocerlo en esta lista. Ej.: Paracetamol 500 mg tableta."
              [maxLength]="300"
              [value]="nombre()"
              [error]="!!errors().nombre"
              [hint]="errors().nombre"
              (valueChange)="nombre.set($event + ''); clearError('nombre')"
            />
          </app-form-section>
          <app-form-section compact icon="lucide:calendar-range" title="Vigencia y fuente" description="Opcional. Sin fechas, el precio aplica siempre." [cols]="3">
            <app-input-field
              compact
              label="Vigente desde"
              helpText="Desde qué fecha aplica el precio. Si pones fecha final, esta también es necesaria."
              type="date"
              [value]="desde()"
              [error]="!!errors().desde"
              [hint]="errors().desde"
              (valueChange)="desde.set($event + ''); clearError('desde')"
            />
            <app-input-field
              compact
              label="Vigente hasta"
              helpText="Hasta qué fecha aplica. Déjala vacía si no tiene fin."
              type="date"
              [value]="hasta()"
              [error]="!!errors().hasta"
              [hint]="errors().hasta"
              (valueChange)="hasta.set($event + ''); clearError('hasta')"
            />
            <app-input-field
              compact
              label="Fuente"
              helpText="De dónde sale el precio, por ejemplo DIGEMID o una resolución."
              [maxLength]="40"
              [value]="fuente()"
              (valueChange)="fuente.set($event + '')"
            />
          </app-form-section>
        </div>
      </div>
      <div data-modal-footer class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
        <p class="text-xs text-gray-500 dark:text-gray-400"><span class="text-error-500">*</span> Campos obligatorios</p>
        <div class="flex items-center gap-2">
          <app-button size="sm" startIconName="mdi:close" variant="outline" [disabled]="saveMutation.isPending()" (btnClick)="closeForm()">Cancelar</app-button>
          <app-button size="sm" startIconName="mdi:content-save-outline" [disabled]="saveMutation.isPending()" [loading]="saveMutation.isPending()" (btnClick)="save()">
            {{ existingRow() ? 'Actualizar precio' : 'Guardar precio' }}
          </app-button>
        </div>
      </div>
    </app-modal>
  `,
})
export class PreciosReguladosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly status = regulatedPriceStatus;
  protected readonly dateOnly = dateOnly;
  protected readonly search = signal('');
  protected readonly formOpen = signal(false);
  protected readonly errors = signal<FormErrors>({});
  protected readonly codigo = signal(EMPTY_FORM.codigo);
  protected readonly nombre = signal(EMPTY_FORM.nombre);
  protected readonly precio = signal(EMPTY_FORM.precio);
  protected readonly desde = signal(EMPTY_FORM.desde);
  protected readonly hasta = signal(EMPTY_FORM.hasta);
  protected readonly fuente = signal(EMPTY_FORM.fuente);

  /** Estado elegido en los chips: se filtra en el API (todo el catálogo, no solo las 500 filas). */
  protected readonly estado = signal<'' | 'vigente' | 'vencido' | 'no_vigente' | 'sin_codigo'>('');

  protected readonly listQuery = injectQuery(() => {
    const search = this.search().trim();
    const estado = this.estado();
    return {
      queryKey: ['compliance', 'regulated-prices', search, estado] as const,
      queryFn: () => firstValueFrom(this.api.listRegulatedPrices(search || undefined, estado || undefined)),
    };
  });

  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: ['compliance', 'regulated-prices', 'summary'] as const,
    queryFn: () => firstValueFrom(this.api.regulatedPricesSummary()),
  }));

  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const s = this.summaryQuery.data();
    if (!s) return [];
    const e = this.estado();
    return [
      { id: 'all', label: 'Total', count: s.total, icon: 'lucide:list', active: !e, tooltip: 'Todo el catálogo. Clic para quitar el filtro de estado.' },
      { id: 'vigente', label: 'Vigentes', count: s.vigente, tone: 'success', active: e === 'vigente', tooltip: 'Se comparan con las ventas. Clic para ver solo estos.' },
      { id: 'no_vigente', label: 'No vigentes', count: s.noVigente, tone: 'neutral', active: e === 'no_vigente', tooltip: 'Aún no empiezan: revisa su fecha de inicio. Clic para ver solo estos.' },
      { id: 'vencido', label: 'Vencidos', count: s.vencido, tone: 'neutral', active: e === 'vencido', tooltip: 'Ya pasó su fecha final: no se comparan con las ventas. Clic para ver solo estos.' },
      { id: 'sin_codigo', label: 'Sin código', count: s.sinCodigo, tone: 'warning', active: e === 'sin_codigo', tooltip: 'Sin código DIGEMID no se pueden comparar con ningún producto. Clic para ver solo estos.' },
    ];
  });

  protected onSummaryChip(chip: SummaryChip) {
    const id = chip.id === 'all' ? '' : (chip.id as 'vigente' | 'vencido' | 'no_vigente' | 'sin_codigo');
    this.estado.set(this.estado() === id ? '' : id);
  }

  /** Catálogo sin filtrar, para avisar si el código ya existe aunque haya una búsqueda activa. */
  private readonly codeCheckQuery = injectQuery(() => ({
    queryKey: ['compliance', 'regulated-prices', 'code', this.codigo().trim()] as const,
    enabled: this.formOpen() && this.codigo().trim().length >= 2,
    queryFn: () => firstValueFrom(this.api.listRegulatedPrices(this.codigo().trim())),
  }));

  protected readonly existingRow = computed(() => {
    const code = this.codigo().trim();
    return code ? (this.codeCheckQuery.data() ?? []).find((row) => row.codigoDigemid === code) ?? null : null;
  });

  protected readonly existingHint = computed(() => {
    const row = this.existingRow();
    return row ? `Ya existe: ${row.nombre} (S/ ${row.precioMaximo}). Al guardar se actualizará.` : undefined;
  });

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.upsertRegulatedPrice({
          codigoDigemid: this.codigo().trim(),
          nombre: this.nombre().trim(),
          precioMaximo: Number(this.precio()),
          vigenteDesde: this.desde() || undefined,
          vigenteHasta: this.hasta() || undefined,
          fuente: this.fuente().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Precio regulado guardado');
      this.formOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'regulated-prices'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar el precio regulado')),
  }));

  protected openForm() {
    this.codigo.set(EMPTY_FORM.codigo);
    this.nombre.set(EMPTY_FORM.nombre);
    this.precio.set(EMPTY_FORM.precio);
    this.desde.set(EMPTY_FORM.desde);
    this.hasta.set(EMPTY_FORM.hasta);
    this.fuente.set(EMPTY_FORM.fuente);
    this.errors.set({});
    this.formOpen.set(true);
  }

  protected closeForm() {
    if (!this.saveMutation.isPending()) this.formOpen.set(false);
  }

  protected clearError(field: keyof FormErrors) {
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }

  private validate(): FormErrors {
    const errors: FormErrors = {};
    if (!this.codigo().trim()) errors.codigo = 'Ingresa el código DIGEMID.';
    if (!this.nombre().trim()) errors.nombre = 'Ingresa el nombre del medicamento.';
    const precio = Number(this.precio());
    if (!this.precio().trim() || !Number.isFinite(precio) || precio < 0) {
      errors.precio = 'Ingresa un precio mayor o igual a 0.';
    }
    // El API no aplica un precio con fecha final y sin fecha de inicio.
    if (this.hasta() && !this.desde()) errors.desde = 'Indica desde cuándo aplica.';
    if (this.hasta() && this.desde() && this.hasta() < this.desde()) {
      errors.hasta = 'No puede ser anterior a «Vigente desde».';
    }
    return errors;
  }

  protected save() {
    const errors = this.validate();
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      this.notify.warning('Revisa los campos marcados.');
      return;
    }
    this.saveMutation.mutate();
  }
}
