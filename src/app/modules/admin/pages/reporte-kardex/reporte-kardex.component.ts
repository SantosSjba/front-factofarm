import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { DataStorageMode, KardexLineDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

const MOVEMENT: Record<string, { label: string; tone: StatusTone }> = {
  INGRESO: { label: 'Ingreso', tone: 'success' },
  SALIDA: { label: 'Salida', tone: 'error' },
  AJUSTE: { label: 'Ajuste', tone: 'warning' },
  TRANSFERENCIA_ENTRADA: { label: 'Traslado (entra)', tone: 'info' },
  TRANSFERENCIA_SALIDA: { label: 'Traslado (sale)', tone: 'purple' },
};

@Component({
  selector: 'app-reporte-kardex',
  standalone: true,
  imports: [
    KpiTileComponent,
    CommonModule,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpHintComponent,
    HelpPanelComponent,
    InputFieldComponent,
    PageToolbarComponent,
    PaginationComponent,
    SearchSelectComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './reporte-kardex.component.html',
})
export class ReporteKardexComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly locale = inject(LocaleService);

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Inventario' }, { label: 'Kardex' }];

  protected readonly itemsPerPage = 50;
  protected readonly currentPage = signal(1);
  protected readonly product = signal<{ id: string; nombre: string; codigoInterno: string | null } | null>(null);
  protected readonly warehouseId = signal('');
  protected readonly dateFrom = signal(this.locale.monthStartYmd());
  protected readonly dateTo = signal(this.locale.todayYmd());
  protected readonly storage = signal<DataStorageMode>('hot');
  protected readonly storageOptions = [
    { value: 'hot', label: 'Movimientos recientes' },
    { value: 'archived', label: 'Movimientos archivados' },
  ];

  protected readonly pickerTerm = signal('');
  protected readonly pickerReset = signal(0);
  protected readonly pickerQuery = injectQuery(() => {
    const search = this.pickerTerm();
    return {
      queryKey: ['products', 'kardex-picker', search],
      enabled: !this.product(),
      queryFn: () => firstValueFrom(this.api.listProducts({ search: search || undefined, field: 'all', page: 1, pageSize: 20 })),
    };
  });
  protected readonly pickerOptions = computed(() =>
    (this.pickerQuery.data()?.items ?? []).map((p) => ({
      value: p.id,
      label: p.nombre,
      meta: p.codigoInterno ? `Cód. ${p.codigoInterno}` : '',
    })),
  );

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Todos los almacenes' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  ]);

  protected readonly kardexQuery = injectQuery(() => {
    const productId = this.product()?.id ?? '';
    const filters = {
      productId,
      warehouseId: this.warehouseId() || undefined,
      from: this.dateFrom() || undefined,
      to: this.dateTo() || undefined,
      storage: this.storage(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: ['inventory', 'kardex', filters] as const,
      enabled: !!productId,
      queryFn: () => firstValueFrom(this.api.getInventoryKardex(filters)),
    };
  });
  protected readonly rows = computed(() => this.kardexQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.kardexQuery.data()?.total ?? 0);
  protected readonly isArchived = computed(() => this.storage() === 'archived');

  /** Resumen de la página: entradas, salidas y saldos. */
  private readonly qtyFmt = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 4 });
  /** Totales de todo el periodo filtrado (los calcula la API, no la página visible). */
  protected readonly summary = computed(() => {
    const r = this.kardexQuery.data()?.resumen;
    if (!r) return null;
    const f = (v: string) => this.qtyFmt.format(Number(v) || 0);
    return {
      inicial: f(r.saldoInicial),
      entradas: '+' + f(r.entradas),
      salidas: '−' + f(String(Math.abs(Number(r.salidas)))),
      final: f(r.saldoFinal),
    };
  });

  protected pickProduct(id: string) {
    const p = this.pickerQuery.data()?.items.find((x) => x.id === id);
    if (!p) return;
    this.product.set({ id: p.id, nombre: p.nombre, codigoInterno: p.codigoInterno });
    this.currentPage.set(1);
  }

  protected changeProduct() {
    this.product.set(null);
    this.pickerTerm.set('');
    this.pickerReset.update((n) => n + 1);
  }

  protected setWarehouse(value: string) {
    this.warehouseId.set(value);
    this.currentPage.set(1);
  }

  protected setStorage(value: string) {
    this.storage.set(value as DataStorageMode);
    this.currentPage.set(1);
  }

  protected setFrom(value: string) {
    this.dateFrom.set(value);
    this.currentPage.set(1);
  }

  protected setTo(value: string) {
    this.dateTo.set(value);
    this.currentPage.set(1);
  }

  protected movementLabel(tipo: string | null): string {
    return (tipo && MOVEMENT[tipo]?.label) || tipo || '—';
  }

  protected movementTone(tipo: string | null): StatusTone {
    return (tipo && MOVEMENT[tipo]?.tone) || 'neutral';
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  protected isArchivedRow(row: KardexLineDto): boolean {
    return row.storage === 'archived' || !!row.fromColdStorage;
  }
}
