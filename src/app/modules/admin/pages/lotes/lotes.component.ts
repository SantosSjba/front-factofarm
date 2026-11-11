import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ColorLegendComponent, type LegendItem, type LegendTone } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { InventoryLotListItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type ExpiryFilter = 'all' | 'expired' | '30' | '60' | '90';
type ExpiryState = { label: string; tone: StatusTone; row: LegendTone | null };

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [
    CommonModule,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ColorLegendComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    SearchSelectComponent,
    StatusBadgeComponent,
    TableDropdownComponent,
  ],
  templateUrl: './lotes.component.html',
})
export class LotesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly route = inject(ActivatedRoute);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Inventario' }, { label: 'Lotes' }];
  protected readonly legend: LegendItem[] = [
    { label: 'Vencido', tone: 'error' },
    { label: 'Vence en 30 días', tone: 'warning' },
  ];
  protected readonly today = new Date().toISOString().slice(0, 10);

  // ---------- Listado ----------
  protected readonly itemsPerPage = 10;
  protected readonly currentPage = signal(1);
  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'producto' | 'lote' | 'almacen'>('producto');
  protected readonly warehouseId = signal('');
  protected readonly expiryFilter = signal<ExpiryFilter>('all');
  protected readonly fieldFilterOptions = [
    { value: 'producto', label: 'Producto' },
    { value: 'lote', label: 'Lote' },
    { value: 'almacen', label: 'Almacén' },
    { value: 'all', label: 'Todos' },
  ];
  protected readonly expiryOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'expired', label: 'Vencidos' },
    { value: '30', label: 'Vencen en 30 días' },
    { value: '60', label: 'Vencen en 60 días' },
    { value: '90', label: 'Vencen en 90 días' },
  ];
  protected readonly activeFilterCount = computed(
    () => [this.filterField() !== 'producto', !!this.warehouseId(), this.expiryFilter() !== 'all'].filter(Boolean).length,
  );

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() =>
    (this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  );
  protected readonly warehouseFilterOptions = computed(() => [{ value: '', label: 'Todos los almacenes' }, ...this.warehouseOptions()]);

  protected readonly lotsQuery = injectQuery(() => {
    const filters = {
      search: this.searchTerm().trim(),
      field: this.filterField(),
      warehouseId: this.warehouseId() || undefined,
      expiryFilter: this.expiryFilter(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: ['inventory', 'lots', filters] as const,
      queryFn: () => firstValueFrom(this.api.listInventoryLots(filters)),
    };
  });
  protected readonly rows = computed(() => this.lotsQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.lotsQuery.data()?.total ?? 0);

  // ---------- Corregir vencimiento ----------
  protected readonly expiryTarget = signal<InventoryLotListItemDto | null>(null);
  protected readonly expiryDraft = signal('');
  protected readonly expiryError = signal('');
  protected readonly expiryMutation = injectMutation(() => ({
    mutationFn: ({ id, date }: { id: string; date: string }) => firstValueFrom(this.api.updateInventoryLotExpiry(id, date)),
    onSuccess: () => {
      this.notify.success('Fecha de vencimiento actualizada');
      this.expiryTarget.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'lots'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar la fecha de vencimiento')),
  }));

  // ---------- Simular salida (FEFO/FIFO) ----------
  protected readonly simOpen = signal(false);
  protected readonly simProduct = signal<{ id: string; nombre: string } | null>(null);
  protected readonly simWarehouseId = signal('');
  protected readonly simQuantity = signal(1);
  protected readonly simPickerTerm = signal('');
  protected readonly simPickerReset = signal(0);
  protected readonly simPickerQuery = injectQuery(() => {
    const search = this.simPickerTerm();
    return {
      queryKey: ['products', 'lot-sim-picker', search],
      enabled: this.simOpen() && !this.simProduct(),
      queryFn: () => firstValueFrom(this.api.listProducts({ search: search || undefined, field: 'all', page: 1, pageSize: 20 })),
    };
  });
  protected readonly simPickerOptions = computed(() =>
    (this.simPickerQuery.data()?.items ?? [])
      .filter((p) => p.manejaLotes)
      .map((p) => ({ value: p.id, label: p.nombre, meta: p.codigoInterno ? `Cód. ${p.codigoInterno}` : '' })),
  );
  protected readonly simQuery = injectQuery(() => {
    const productId = this.simProduct()?.id ?? '';
    const warehouseId = this.simWarehouseId();
    const quantity = this.simQuantity();
    return {
      queryKey: ['inventory', 'lot-allocation-preview', productId, warehouseId, quantity] as const,
      enabled: this.simOpen() && !!productId && !!warehouseId && quantity > 0,
      retry: false,
      queryFn: () => firstValueFrom(this.api.previewSaleLotAllocation({ productId, warehouseId, quantity, mode: 'AUTO' })),
    };
  });
  protected readonly simAssigned = computed(() =>
    (this.simQuery.data()?.asignacion ?? []).reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0),
  );

  constructor() {
    const expiry = this.route.snapshot.queryParamMap.get('expiry');
    if (expiry && ['expired', '30', '60', '90'].includes(expiry)) this.expiryFilter.set(expiry as ExpiryFilter);
    effect(() => {
      const totalPages = Math.max(1, this.lotsQuery.data()?.totalPages ?? 1);
      if (this.currentPage() > totalPages) this.currentPage.set(totalPages);
    });
  }

  // ---------- Listado ----------
  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onFieldChange(value: string) {
    this.filterField.set((value || 'producto') as 'all' | 'producto' | 'lote' | 'almacen');
    this.currentPage.set(1);
  }

  protected setWarehouse(value: string) {
    this.warehouseId.set(value);
    this.currentPage.set(1);
  }

  protected setExpiry(value: string) {
    this.expiryFilter.set(value as ExpiryFilter);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('producto');
    this.warehouseId.set('');
    this.expiryFilter.set('all');
    this.currentPage.set(1);
  }

  protected expiryState(fecha: string | null): ExpiryState {
    if (!fecha) return { label: 'Sin fecha', tone: 'neutral', row: null };
    const days = Math.floor((new Date(fecha.slice(0, 10)).getTime() - new Date(this.today).getTime()) / 86_400_000);
    if (days <= 0) return { label: 'Vencido', tone: 'error', row: 'error' };
    if (days <= 30) return { label: `Vence en ${days} día${days === 1 ? '' : 's'}`, tone: 'warning', row: 'warning' };
    if (days <= 90) return { label: `Vence en ${days} días`, tone: 'info', row: null };
    return { label: 'Vigente', tone: 'success', row: null };
  }

  protected formatDate(fecha: string | null): string {
    return fecha ? fecha.slice(0, 10).split('-').reverse().join('/') : '—';
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  // ---------- Corregir vencimiento ----------
  protected openExpiry(row: InventoryLotListItemDto) {
    this.expiryDraft.set(row.fechaVencimiento?.slice(0, 10) ?? '');
    this.expiryError.set('');
    this.expiryTarget.set(row);
  }

  protected saveExpiry() {
    const row = this.expiryTarget();
    if (!row) return;
    if (!this.expiryDraft()) {
      this.expiryError.set('Elige la fecha que figura en el empaque.');
      return;
    }
    this.expiryMutation.mutate({ id: row.id, date: this.expiryDraft() });
  }

  // ---------- Simular salida ----------
  protected openSimulator(row?: InventoryLotListItemDto) {
    this.simProduct.set(row ? { id: row.productId, nombre: row.producto } : null);
    const byName = row ? (this.warehousesQuery.data() ?? []).find((w) => w.nombre === row.almacen && w.establishment.nombre === row.establecimiento) : null;
    const all = this.warehousesQuery.data() ?? [];
    this.simWarehouseId.set(byName?.id ?? (all.length === 1 ? all[0].id : this.warehouseId()));
    this.simQuantity.set(1);
    this.simPickerTerm.set('');
    this.simPickerReset.update((n) => n + 1);
    this.simOpen.set(true);
  }

  protected pickSimProduct(id: string) {
    const p = this.simPickerQuery.data()?.items.find((x) => x.id === id);
    if (p) this.simProduct.set({ id: p.id, nombre: p.nombre });
  }

  protected changeSimProduct() {
    this.simProduct.set(null);
    this.simPickerTerm.set('');
    this.simPickerReset.update((n) => n + 1);
  }

  protected simErrorMessage(): string {
    return httpErrorMessage(this.simQuery.error(), 'No se pudo simular la salida.');
  }
}
