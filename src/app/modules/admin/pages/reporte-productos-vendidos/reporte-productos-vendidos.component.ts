import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ColorLegendComponent, type LegendItem, type LegendTone } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { SaleDocumentType, SoldItemRowDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { documentNumber, documentTypeLabel, saleStatusLabel, saleStatusTone } from '../../utils/sale-labels';

/** Reporte de productos vendidos: cada producto de cada venta, del más reciente al más antiguo. */
@Component({
  selector: 'app-reporte-productos-vendidos',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    CheckboxComponent,
    ColorLegendComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    KpiTileComponent,
    ListFiltersComponent,
    PageToolbarComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './reporte-productos-vendidos.component.html',
})
export class ReporteProductosVendidosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly locale = inject(LocaleService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Reportes', link: '/reportes' }, { label: 'Productos vendidos' }];
  protected readonly pageSize = 20;
  protected readonly typeLabel = documentTypeLabel;
  protected readonly number = documentNumber;
  protected readonly statusLabel = saleStatusLabel;
  protected readonly statusTone = saleStatusTone;
  protected readonly legend: LegendItem[] = [
    { label: 'Venta anulada (no suma)', tone: 'error-light' },
    { label: 'Con devolución', tone: 'warning' },
  ];
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  private readonly qty = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });

  // ---------- Filtros ----------
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly dateFrom = signal(this.locale.monthStartYmd());
  protected readonly dateTo = signal(this.locale.todayYmd());
  protected readonly documentType = signal('');
  protected readonly includeVoided = signal(false);
  protected readonly docOptions = [
    { value: '', label: 'Todos los comprobantes' },
    ...(['BOLETA', 'FACTURA', 'NOTA_VENTA', 'TICKET'] as const).map((value) => ({ value, label: documentTypeLabel(value) })),
  ];
  protected readonly activeFilterCount = computed(
    () =>
      [this.documentType(), this.includeVoided() ? '1' : ''].filter(Boolean).length +
      (this.dateFrom() !== this.locale.monthStartYmd() || this.dateTo() !== this.locale.todayYmd() ? 1 : 0),
  );

  protected readonly query = injectQuery(() => ({
    queryKey: ['sales', 'items-report', this.page(), this.search(), this.dateFrom(), this.dateTo(), this.documentType(), this.includeVoided()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listSoldItems({
          page: this.page(),
          pageSize: this.pageSize,
          search: this.search(),
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
          documentType: (this.documentType() || undefined) as SaleDocumentType | undefined,
          includeVoided: this.includeVoided(),
        }),
      ),
  }));
  protected readonly rows = computed(() => this.query.data()?.items ?? []);
  protected readonly total = computed(() => this.query.data()?.total ?? 0);

  /** Totales de todo el filtro, calculados en la API (no solo de la página). */
  protected readonly kpis = computed(() => {
    const t = this.query.data()?.totales;
    if (!t) return null;
    return {
      monto: this.pen.format(Number(t.monto)),
      unidades: this.qty.format(Number(t.unidades)),
      lineas: `${t.lineas}`,
      ventas: `${t.ventas}`,
      ticket: this.pen.format(t.ventas ? Number(t.monto) / t.ventas : 0),
    };
  });

  protected setSearch(v: string) {
    this.search.set(v);
    this.page.set(1);
  }
  protected setFilter(which: 'dateFrom' | 'dateTo' | 'documentType', v: string | number) {
    this[which].set(String(v ?? ''));
    this.page.set(1);
  }
  protected setVoided(v: boolean) {
    this.includeVoided.set(v);
    this.page.set(1);
  }
  protected clearFilters() {
    this.search.set('');
    this.dateFrom.set(this.locale.monthStartYmd());
    this.dateTo.set(this.locale.todayYmd());
    this.documentType.set('');
    this.includeVoided.set(false);
    this.page.set(1);
  }

  protected rowTone(row: SoldItemRowDto): LegendTone | null {
    if (row.estado === 'ANULADA') return 'error-light';
    if (+row.cantidadDevuelta > 0) return 'warning';
    return null;
  }

  /** Abre la venta en el Historial de ventas, buscada por su número. */
  protected saleLink(row: SoldItemRowDto) {
    const day = this.locale.todayYmd(new Date(row.fecha));
    return { search: this.number(row), dateFrom: day, dateTo: day };
  }
}
