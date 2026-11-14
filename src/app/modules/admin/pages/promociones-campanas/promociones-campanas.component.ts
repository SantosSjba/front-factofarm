import { CommonModule } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { PromotionListItemDto, PromotionType } from '../../models/directory.models';

@Component({
  selector: 'app-promociones-campanas',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ListFiltersComponent,
    TableDropdownComponent,
    FormSectionComponent,
    HelpPanelComponent,
    MenuItemComponent,
    StatusBadgeComponent,
    PaginationComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    ModalComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Promociones y cupones</h1>
      <div data-toolbar-actions class="flex flex-wrap items-center gap-2">
        <app-button size="sm" startIconName="mdi:ticket-percent-outline" (btnClick)="openCreate()">Nueva promoción</app-button>
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="promociones-campanas">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Cada promoción tiene un <strong>código de cupón</strong> que se ingresa al cobrar en el Punto de venta para aplicar el descuento.</li>
        <li>Elige el tipo: un porcentaje sobre el total, un descuento por llevar una cantidad mínima, o un porcentaje o monto por producto.</li>
        <li>Si le pones vigencia, solo se aplica entre esas fechas.</li>
      </ol>
    </app-help-panel>

    <!-- Resumen (todas las páginas). -->
    <app-list-filters
      compact
      [showSearch]="false"
      [showSelect]="false"
      [showClear]="false"
      [summaryChips]="summaryChips()"
      summaryLabel="Resumen de promociones"
      summaryStorageKey="promociones-campanas"
    />

    <!-- Tabla directa (sin tarjeta): el título ya está en la barra de la página. -->
    <app-page-state
      [loading]="listQuery.isPending()"
      [error]="listError()"
      [empty]="listQuery.isSuccess() && !(listQuery.data()?.items?.length)"
      emptyTitle="Aún no hay promociones"
      emptyHint="Usa «Nueva promoción» para crear la primera."
      skeleton="table"
      (retry)="listQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Promociones y cupones</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th data-card-role="title" class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Promoción</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Cupón</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Descuento</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Vigencia</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of listQuery.data()?.items ?? []; track row.id) {
                <tr [attr.data-row-tone]="row.activo ? null : 'muted'">
                  <td class="px-5 py-3 text-theme-sm">
                    <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.nombre }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ tipoLabel(row.tipo) }}</span>
                  </td>
                  <td class="px-5 py-3 font-mono text-theme-sm">{{ row.codigo }}</td>
                  <td class="px-5 py-3 text-theme-sm tabular-nums">{{ valorLabel(row) }}</td>
                  <td class="px-5 py-3 text-theme-sm whitespace-nowrap">
                    @if (row.validFrom || row.validTo) {
                      {{ row.validFrom ? (row.validFrom | appDate: 'dd/MM/yyyy') : 'Sin inicio' }} – {{ row.validTo ? (row.validTo | appDate: 'dd/MM/yyyy') : 'Sin fin' }}
                    } @else {
                      <span class="text-gray-400">Siempre</span>
                    }
                  </td>
                  <td class="px-5 py-3 text-theme-sm"><app-status-badge [status]="row.activo ? 'ACTIVO' : 'INACTIVO'" [tone]="row.activo ? 'success' : 'neutral'" [label]="row.activo ? 'Activa' : 'Inactiva'" /></td>
                  <td class="px-5 py-3 text-end">
                    <div class="inline-flex justify-end">
                      <app-table-dropdown>
                        <div dropdown-button>
                          <app-button size="sm" variant="outline" [iconOnly]="true" startIconName="mdi:dots-vertical" [tooltip]="'Acciones de ' + row.nombre"></app-button>
                        </div>
                        <div dropdown-content>
                          <app-menu-item variant="danger" icon="mdi:trash-can-outline" tooltip="El cupón dejará de funcionar. Te pedirá confirmación." (itemClick)="deleteTarget.set(row)">Eliminar</app-menu-item>
                        </div>
                      </app-table-dropdown>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-page-state>

    @if (listQuery.data(); as list) {
      <app-pagination [totalItems]="list.total" [currentPage]="page()" [pageSize]="pageSize" (currentPageChange)="page.set($event)" />
    }

    <!-- ========== NUEVA PROMOCIÓN ========== -->
    <app-modal compact [isOpen]="createOpen()" (closed)="closeCreate()" className="w-full max-w-lg shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-xl font-semibold text-gray-800 dark:text-white/90">Nueva promoción</h3>
        <p class="mt-1 pe-12 text-sm text-gray-500 dark:text-gray-400">El cliente la usa con su código de cupón al pagar.</p>
      </div>
      <div data-modal-body class="min-h-0 space-y-5 px-4 py-4 sm:px-6">
        <app-form-section compact icon="mdi:ticket-percent-outline" title="Promoción" [cols]="2">
          <app-input-field compact icon="mdi:ticket-outline" label="Código de cupón" [isRequired]="true" helpText="Lo que se escribe al cobrar. Sin espacios, por ejemplo VERANO10." placeholder="Ej.: VERANO10" [maxLength]="40" [value]="codigo()" [error]="!!errors().codigo" [hint]="errors().codigo || ''" (valueChange)="codigo.set(('' + $event).toUpperCase()); clearError('codigo')" />
          <app-input-field compact icon="mdi:tag-outline" label="Nombre" [isRequired]="true" helpText="Para reconocerla en este listado." placeholder="Ej.: Descuento de verano" [maxLength]="200" [value]="nombre()" [error]="!!errors().nombre" [hint]="errors().nombre || ''" (valueChange)="nombre.set('' + $event); clearError('nombre')" />
        </app-form-section>
        <app-form-section compact icon="mdi:percent-outline" title="Descuento" [cols]="2">
          <app-form-select class="md:col-span-2" compact label="Tipo" [required]="true" helpText="Cómo se calcula el descuento." [showPlaceholder]="false" [options]="tipoOptions" [value]="tipo()" (valueChange)="tipo.set($any($event)); clearError('valor')" />
          <app-input-field compact [icon]="isPercent() ? 'mdi:percent-outline' : 'mdi:cash'" [label]="isPercent() ? 'Porcentaje (%)' : 'Monto (S/)'" [isRequired]="true" [helpText]="isPercent() ? 'Entre 1 y 100.' : 'Monto que se descuenta.'" type="number" min="0" step="0.01" [value]="valor()" [error]="!!errors().valor" [hint]="errors().valor || ''" (valueChange)="valor.set(+$event); clearError('valor')" />
          @if (tipo() === 'CANTIDAD_MINIMA') {
            <app-input-field compact icon="mdi:counter" label="Cantidad mínima" [isRequired]="true" helpText="Unidades que debe llevar el cliente para que aplique." type="number" min="1" step="1" [value]="cantidadMinima()" [error]="!!errors().cantidadMinima" [hint]="errors().cantidadMinima || ''" (valueChange)="cantidadMinima.set(+$event); clearError('cantidadMinima')" />
          }
        </app-form-section>
        <app-form-section compact icon="mdi:calendar-range" title="Vigencia" description="Opcional: sin fechas, aplica siempre." [cols]="2">
          <app-input-field compact icon="mdi:calendar-start" label="Desde" type="date" [value]="validFrom()" (valueChange)="validFrom.set('' + $event); clearError('validTo')" />
          <app-input-field compact icon="mdi:calendar-end" label="Hasta" type="date" [min]="validFrom()" [value]="validTo()" [error]="!!errors().validTo" [hint]="errors().validTo || ''" (valueChange)="validTo.set('' + $event); clearError('validTo')" />
        </app-form-section>
      </div>
      <div data-modal-footer class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <p class="text-xs text-gray-500 dark:text-gray-400"><span class="text-error-500">*</span> Campos obligatorios</p>
        <div class="flex items-center gap-2">
          <app-button size="sm" startIconName="mdi:close" variant="outline" [disabled]="createMutation.isPending()" (btnClick)="closeCreate()">Cancelar</app-button>
          <app-button size="sm" startIconName="mdi:content-save-outline" [disabled]="createMutation.isPending()" [loading]="createMutation.isPending()" (btnClick)="submitCreate()">Guardar</app-button>
        </div>
      </div>
    </app-modal>

    <!-- ========== ELIMINAR ========== -->
    <app-modal compact [isOpen]="!!deleteTarget()" (closed)="!deleting() && deleteTarget.set(null)" className="w-full max-w-lg shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-xl font-semibold text-gray-800 dark:text-white/90">Eliminar promoción</h3>
      </div>
      <div data-modal-body class="min-h-0 px-4 py-4 text-theme-sm text-gray-600 dark:text-gray-400 sm:px-6">
        ¿Eliminar <span class="font-semibold text-gray-800 dark:text-white/90">{{ deleteTarget()?.nombre }}</span> (cupón {{ deleteTarget()?.codigo }})?
        <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">El cupón dejará de funcionar en el Punto de venta.</p>
      </div>
      <div data-modal-footer class="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <app-button size="sm" startIconName="mdi:close" variant="outline" [disabled]="deleting()" (btnClick)="deleteTarget.set(null)">Cancelar</app-button>
        <app-button size="sm" variant="danger" startIconName="mdi:trash-can-outline" [loading]="deleting()" [disabled]="deleting()" (btnClick)="confirmDelete()">Eliminar</app-button>
      </div>
    </app-modal>
  ` })
export class PromocionesCampanasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Ventas' },
    { label: 'Promociones y cupones' },
  ];
  protected readonly pageSize = 15;
  protected readonly tipoOptions = [
    { value: 'PORCENTAJE_VENTA', label: '% sobre total venta' },
    { value: 'CANTIDAD_MINIMA', label: 'Descuento por cantidad mínima' },
    { value: 'PORCENTAJE_ITEM', label: '% sobre ítem' },
    { value: 'MONTO_ITEM', label: 'Monto fijo ítem' },
  ];

  protected readonly page = signal(1);
  protected readonly createOpen = signal(false);
  protected readonly codigo = signal('');
  protected readonly nombre = signal('');
  protected readonly tipo = signal<PromotionType>('PORCENTAJE_VENTA');
  protected readonly valor = signal(10);
  protected readonly cantidadMinima = signal(2);
  protected readonly validFrom = signal('');
  protected readonly validTo = signal('');
  protected readonly errors = signal<Partial<Record<'codigo' | 'nombre' | 'valor' | 'cantidadMinima' | 'validTo', string>>>({});
  protected readonly isPercent = computed(() => this.tipo().startsWith('PORCENTAJE'));
  protected readonly deleteTarget = signal<PromotionListItemDto | null>(null);
  protected readonly deleting = signal(false);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['promotions', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listPromotions(this.page(), this.pageSize)) }));

  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const data = this.listQuery.data();
    if (!data) return [];
    return [{ id: 'total', label: 'Registradas', count: data.total, icon: 'mdi:ticket-percent-outline', tone: 'neutral' }];
  });

  protected tipoLabel(tipo: PromotionType): string {
    return this.tipoOptions.find((o) => o.value === tipo)?.label ?? tipo;
  }

  protected valorLabel(row: PromotionListItemDto): string {
    const v = Number(row.valor) || 0;
    const base = row.tipo.startsWith('PORCENTAJE') ? `${v} %` : `S/ ${v.toFixed(2)}`;
    return row.tipo === 'CANTIDAD_MINIMA' && row.cantidadMinima ? `${base} desde ${row.cantidadMinima} u.` : base;
  }

  protected clearError(key: 'codigo' | 'nombre' | 'valor' | 'cantidadMinima' | 'validTo') {
    if (this.errors()[key]) this.errors.update((e) => ({ ...e, [key]: undefined }));
  }

  protected openCreate() {
    this.codigo.set('');
    this.nombre.set('');
    this.tipo.set('PORCENTAJE_VENTA');
    this.valor.set(10);
    this.cantidadMinima.set(2);
    this.validFrom.set('');
    this.validTo.set('');
    this.errors.set({});
    this.createOpen.set(true);
  }

  protected closeCreate() {
    if (this.createMutation.isPending()) return;
    this.createOpen.set(false);
  }

  protected async confirmDelete() {
    const row = this.deleteTarget();
    if (!row) return;
    this.deleting.set(true);
    try {
      await this.remove(row.id);
    } finally {
      this.deleting.set(false);
      this.deleteTarget.set(null);
    }
  }

  protected listError(): string | null {
    if (this.listQuery.isError()) {
      return httpErrorMessage(this.listQuery.error(), 'No se pudieron cargar promociones');
    }
    return null;
  }

  protected submitCreate() {
    const errors: Partial<Record<'codigo' | 'nombre' | 'valor' | 'cantidadMinima' | 'validTo', string>> = {};
    if (!this.codigo().trim()) errors.codigo = 'Escribe el código del cupón.';
    if (!this.nombre().trim()) errors.nombre = 'Escribe el nombre de la promoción.';
    const valor = this.valor();
    if (!Number.isFinite(valor) || valor <= 0) errors.valor = 'Debe ser mayor a 0.';
    else if (this.isPercent() && valor > 100) errors.valor = 'El porcentaje no puede superar el 100 %.';
    if (this.tipo() === 'CANTIDAD_MINIMA' && !(this.cantidadMinima() >= 1)) errors.cantidadMinima = 'Debe ser al menos 1.';
    if (this.validFrom() && this.validTo() && this.validTo() < this.validFrom()) errors.validTo = 'Debe ser igual o posterior a «Desde».';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    this.createMutation.mutate();
  }

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createPromotion({
          codigo: this.codigo().trim(),
          nombre: this.nombre().trim(),
          tipo: this.tipo(),
          valor: this.valor(),
          ...(this.tipo() === 'CANTIDAD_MINIMA' ? { cantidadMinima: this.cantidadMinima() } : {}),
          ...(this.validFrom() ? { validFrom: this.validFrom() } : {}),
          ...(this.validTo() ? { validTo: this.validTo() } : {}) }),
      ),
    onSuccess: () => {
      this.notify.success('Promoción creada');
      this.createOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la promoción')) }));

  protected async remove(id: string) {
    try {
      await firstValueFrom(this.api.deletePromotion(id));
      this.notify.success('Promoción eliminada');
      void this.queryClient.invalidateQueries({ queryKey: ['promotions'] });
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar la promoción'));
    }
  }
}
