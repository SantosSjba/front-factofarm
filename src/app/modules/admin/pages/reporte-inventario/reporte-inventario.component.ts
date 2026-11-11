import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { SuggestInputComponent } from '../../../../shared/components/form/suggest-input/suggest-input.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { QuickCreateComponent } from '../../components/quick-create/quick-create.component';
import type { InventoryPhysicalCountListItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

const COUNT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  EN_PROCESO: { label: 'En proceso', tone: 'warning' },
  PROCESANDO: { label: 'Aplicando ajustes', tone: 'info' },
  FINALIZADO: { label: 'Finalizado', tone: 'success' },
  ERROR: { label: 'Con error', tone: 'error' },
};

/** Conteo físico: se cuenta lo que hay en el almacén y, al finalizar, se ajusta el sistema. */
@Component({
  selector: 'app-reporte-inventario',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpHintComponent,
    HelpPanelComponent,
    InputFieldComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    QuickCreateComponent,
    SearchSelectComponent,
    StatusBadgeComponent,
    SuggestInputComponent,
    TextAreaComponent,
  ],
  templateUrl: './reporte-inventario.component.html',
})
export class ReporteInventarioComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Inventario' }, { label: 'Conteo físico' }];
  protected readonly itemsPerPage = 10;
  protected readonly countsPage = signal(1);

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() =>
    (this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  );

  protected readonly countsQuery = injectQuery(() => ({
    queryKey: ['inventory', 'physical-counts', { page: this.countsPage() }] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryPhysicalCounts(this.countsPage(), this.itemsPerPage)),
  }));
  protected readonly countRows = computed(() => this.countsQuery.data()?.items ?? []);
  protected readonly countsTotal = computed(() => this.countsQuery.data()?.total ?? 0);

  // ---------- Conteo abierto ----------
  protected readonly activeCountId = signal<string | null>(null);
  protected readonly countQuery = injectQuery(() => ({
    queryKey: ['inventory', 'physical-count', this.activeCountId()] as const,
    enabled: !!this.activeCountId(),
    queryFn: () => firstValueFrom(this.api.getInventoryPhysicalCount(this.activeCountId()!)),
  }));
  protected readonly count = computed(() => this.countQuery.data());
  protected readonly isEditable = computed(() => this.count()?.estado === 'EN_PROCESO');
  protected readonly summary = computed(() => {
    let sobrantes = 0;
    let faltantes = 0;
    let iguales = 0;
    for (const item of this.count()?.items ?? []) {
      const d = Number(item.diferencia) || 0;
      if (d > 0) sobrantes++;
      else if (d < 0) faltantes++;
      else iguales++;
    }
    return { sobrantes, faltantes, iguales };
  });

  // Línea en edición
  protected readonly pickerTerm = signal('');
  protected readonly pickerReset = signal(0);
  protected readonly line = signal<{ productId: string; nombre: string; manejaLotes: boolean; lote: string; cantidad: number | null } | null>(null);
  protected readonly lotSearch = signal('');
  protected readonly lineError = signal('');

  protected readonly pickerQuery = injectQuery(() => {
    const search = this.pickerTerm();
    return {
      queryKey: ['products', 'count-picker', search],
      enabled: this.isEditable() && !this.line(),
      queryFn: () => firstValueFrom(this.api.listProducts({ search: search || undefined, field: 'all', page: 1, pageSize: 20 })),
    };
  });
  protected readonly pickerOptions = computed(() =>
    (this.pickerQuery.data()?.items ?? []).map((p) => ({
      value: p.id,
      label: p.nombre,
      meta: [p.codigoInterno ? `Cód. ${p.codigoInterno}` : '', p.manejaLotes ? 'Maneja lotes' : ''].filter(Boolean).join(' · '),
    })),
  );
  protected readonly lotsQuery = injectQuery(() => {
    const l = this.line();
    const warehouseId = this.count()?.warehouseId ?? '';
    const search = this.lotSearch().trim();
    return {
      queryKey: ['inventory-movements', 'lot-codes', 'INBOUND', l?.productId ?? '', warehouseId, search],
      enabled: !!l?.manejaLotes && !!warehouseId,
      queryFn: () => firstValueFrom(this.api.searchInventoryLotCodes({ productId: l!.productId, warehouseId, search, mode: 'INBOUND' })),
    };
  });
  protected readonly lotOptions = computed(() =>
    (this.lotsQuery.data() ?? []).map((lot) => ({
      value: lot.codigoLote,
      label: lot.codigoLote,
      meta: `En sistema: ${Number(lot.stock)}${lot.fechaVencimiento ? ` · Vence ${lot.fechaVencimiento.slice(0, 10).split('-').reverse().join('/')}` : ''}`,
    })),
  );

  // ---------- Nuevo conteo ----------
  protected readonly createOpen = signal(false);
  protected readonly newWarehouseId = signal('');
  protected readonly newComment = signal('');
  protected readonly newError = signal('');
  protected readonly finalizeOpen = signal(false);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(this.api.createInventoryPhysicalCount({ warehouseId: this.newWarehouseId(), comentario: this.newComment().trim() || undefined })),
    onSuccess: (res) => {
      this.notify.success('Conteo iniciado: registra lo que cuentes.');
      this.createOpen.set(false);
      this.openCount(res.id);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'physical-counts'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo iniciar el conteo')),
  }));

  protected readonly upsertMutation = injectMutation(() => ({
    mutationFn: (body: { productId: string; codigoLote?: string; stockContado: number }) =>
      firstValueFrom(this.api.upsertInventoryPhysicalCountItem(this.activeCountId()!, body)),
    onSuccess: () => {
      this.notify.success('Producto registrado en el conteo.');
      this.cancelLine();
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'physical-count', this.activeCountId()] });
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'physical-counts'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el producto')),
  }));

  protected readonly finalizeMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.api.finalizeInventoryPhysicalCount(this.activeCountId()!)),
    onSuccess: (res) => {
      this.finalizeOpen.set(false);
      if (res.pendingApproval) this.notify.warning(res.message);
      else this.notify.success(res.message);
      for (const key of [['inventory'], ['inventory-movements'], ['products']]) {
        void this.queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo finalizar el conteo')),
  }));

  // ---------- Listado ----------
  protected statusLabel(estado: string) {
    return COUNT_STATUS[estado]?.label ?? estado;
  }

  protected statusTone(estado: string): StatusTone {
    return COUNT_STATUS[estado]?.tone ?? 'neutral';
  }

  protected openCount(id: string) {
    this.cancelLine();
    this.activeCountId.set(id);
  }

  protected openRow(row: InventoryPhysicalCountListItemDto) {
    this.openCount(row.id);
  }

  protected closeCount() {
    this.activeCountId.set(null);
    this.cancelLine();
  }

  // ---------- Nuevo conteo ----------
  protected openCreate() {
    const warehouses = this.warehousesQuery.data() ?? [];
    this.newWarehouseId.set(warehouses.length === 1 ? warehouses[0].id : '');
    this.newComment.set('');
    this.newError.set('');
    this.createOpen.set(true);
  }

  protected submitCreate() {
    if (!this.newWarehouseId()) {
      this.newError.set('Elige el almacén que vas a contar.');
      return;
    }
    this.createMutation.mutate();
  }

  // ---------- Líneas ----------
  protected pickProduct(id: string) {
    const p = this.pickerQuery.data()?.items.find((x) => x.id === id);
    if (!p) return;
    this.line.set({ productId: p.id, nombre: p.nombre, manejaLotes: !!p.manejaLotes, lote: '', cantidad: null });
    this.lotSearch.set('');
    this.lineError.set('');
  }

  protected patchLine(patch: Partial<{ lote: string; cantidad: number | null }>) {
    this.line.update((l) => (l ? { ...l, ...patch } : l));
    this.lineError.set('');
  }

  protected cancelLine() {
    this.line.set(null);
    this.lineError.set('');
    this.pickerTerm.set('');
    this.pickerReset.update((n) => n + 1);
  }

  protected saveLine() {
    const l = this.line();
    if (!l) return;
    if (l.cantidad == null || !Number.isFinite(l.cantidad) || l.cantidad < 0) {
      this.lineError.set('Escribe cuánto contaste (0 si no hay ninguno).');
      return;
    }
    if (l.manejaLotes && !l.lote.trim()) {
      this.lineError.set('Este producto maneja lotes: indica qué lote contaste.');
      return;
    }
    this.upsertMutation.mutate({ productId: l.productId, codigoLote: l.lote.trim() || undefined, stockContado: l.cantidad });
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
