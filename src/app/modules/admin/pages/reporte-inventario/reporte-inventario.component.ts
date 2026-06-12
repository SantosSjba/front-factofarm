import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type {
  InventoryPhysicalCountDetailDto,
  InventoryPhysicalCountListItemDto,
  ProductListItemDto,
} from '../../models/directory.models';

type ReportTab = 'valorizacion' | 'conteo' | 'zonas';

type CreateWarehouseZoneTipo =
  | 'RECEPCION'
  | 'CUARENTENA'
  | 'LIBERADO'
  | 'DEVOLUCION'
  | 'CADENA_FRIO'
  | 'OTRO';

@Component({
  selector: 'app-reporte-inventario',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
  ],
  templateUrl: './reporte-inventario.component.html',
})
export class ReporteInventarioComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Reporte Inventario' },
  ];

  protected readonly activeTab = signal<ReportTab>('valorizacion');
  protected readonly warehouseId = signal('');
  protected readonly valuationPage = signal(1);
  protected readonly countsPage = signal(1);
  protected readonly itemsPerPage = 20;

  protected readonly countWarehouseId = signal('');
  protected readonly countComment = signal('');
  protected readonly activeCountId = signal<string | null>(null);
  protected readonly countProductSearch = signal('');
  protected readonly countProductOptions = signal<ProductListItemDto[]>([]);
  protected readonly countProductId = signal('');
  protected readonly countProductLabel = signal('');
  protected readonly countLotCode = signal('');
  protected readonly countQty = signal(0);

  protected readonly zoneWarehouseId = signal('');
  protected readonly newZoneName = signal('');
  protected readonly newZoneTipo = signal<CreateWarehouseZoneTipo>('LIBERADO');

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Todos los almacenes' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly valuationQuery = injectQuery(() => ({
    queryKey: ['inventory', 'valuation', { warehouseId: this.warehouseId(), page: this.valuationPage() }] as const,
    enabled: this.activeTab() === 'valorizacion',
    queryFn: () =>
      firstValueFrom(
        this.api.getInventoryValuationReport({
          warehouseId: this.warehouseId() || undefined,
          page: this.valuationPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly countsQuery = injectQuery(() => ({
    queryKey: ['inventory', 'physical-counts', { page: this.countsPage() }] as const,
    enabled: this.activeTab() === 'conteo',
    queryFn: () => firstValueFrom(this.api.listInventoryPhysicalCounts(this.countsPage(), this.itemsPerPage)),
  }));

  protected readonly countDetailQuery = injectQuery(() => ({
    queryKey: ['inventory', 'physical-count', this.activeCountId()] as const,
    enabled: !!this.activeCountId(),
    queryFn: () => firstValueFrom(this.api.getInventoryPhysicalCount(this.activeCountId()!)),
  }));

  protected readonly zonesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'zones', this.zoneWarehouseId()] as const,
    enabled: this.activeTab() === 'zonas' && !!this.zoneWarehouseId(),
    queryFn: () => firstValueFrom(this.api.listWarehouseZones(this.zoneWarehouseId())),
  }));

  protected readonly createCountMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createInventoryPhysicalCount({
          warehouseId: this.countWarehouseId(),
          comentario: this.countComment().trim() || undefined,
        }),
      ),
    onSuccess: (res) => {
      this.notify.success('Conteo iniciado.');
      this.activeCountId.set(res.id);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'physical-counts'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo iniciar el conteo')),
  }));

  protected readonly upsertCountItemMutation = injectMutation(() => ({
    mutationFn: (body: { countId: string; productId: string; codigoLote?: string; stockContado: number }) =>
      firstValueFrom(
        this.api.upsertInventoryPhysicalCountItem(body.countId, {
          productId: body.productId,
          codigoLote: body.codigoLote,
          stockContado: body.stockContado,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Línea registrada.');
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'physical-count', this.activeCountId()] });
      this.countProductId.set('');
      this.countProductLabel.set('');
      this.countLotCode.set('');
      this.countQty.set(0);
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la línea')),
  }));

  protected readonly finalizeCountMutation = injectMutation(() => ({
    mutationFn: (countId: string) => firstValueFrom(this.api.finalizeInventoryPhysicalCount(countId)),
    onSuccess: (res) => {
      this.notify.success(res.message);
      this.activeCountId.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'physical-counts'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo finalizar')),
  }));

  protected readonly createZoneMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createWarehouseZone({
          warehouseId: this.zoneWarehouseId(),
          nombre: this.newZoneName().trim(),
          tipo: this.newZoneTipo(),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Zona creada.');
      this.newZoneName.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'zones', this.zoneWarehouseId()] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la zona')),
  }));

  protected readonly valuationRows = computed(() => this.valuationQuery.data()?.items ?? []);
  protected readonly valuationTotal = computed(() => this.valuationQuery.data()?.total ?? 0);
  protected readonly valorTotalPagina = computed(() => this.valuationQuery.data()?.valorTotalPagina ?? '0');
  protected readonly countRows = computed(() => this.countsQuery.data()?.items ?? []);
  protected readonly countsTotal = computed(() => this.countsQuery.data()?.total ?? 0);
  protected readonly zoneRows = computed(() => this.zonesQuery.data() ?? []);
  protected readonly countDetail = computed(() => this.countDetailQuery.data() as InventoryPhysicalCountDetailDto | undefined);

  protected setTab(tab: ReportTab) {
    this.activeTab.set(tab);
  }

  protected onWarehouseChange(value: string) {
    this.warehouseId.set(value);
    this.valuationPage.set(1);
  }

  protected onValuationPageChange(page: number) {
    this.valuationPage.set(page);
  }

  protected onCountsPageChange(page: number) {
    this.countsPage.set(page);
  }

  protected formatMoney(value: string) {
    const parsed = Number.parseFloat(value || '0');
    if (!Number.isFinite(parsed)) return value;
    return parsed.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
  }

  protected formatQty(value: string) {
    const parsed = Number.parseFloat(value || '0');
    if (!Number.isFinite(parsed)) return value;
    return parsed.toLocaleString('es-PE', { maximumFractionDigits: 4 });
  }

  protected startCount() {
    if (!this.countWarehouseId()) {
      this.notify.warning('Seleccione un almacén.');
      return;
    }
    this.createCountMutation.mutate();
  }

  protected openCount(row: InventoryPhysicalCountListItemDto) {
    if (row.estado === 'EN_PROCESO') {
      this.activeCountId.set(row.id);
    }
  }

  protected async searchCountProducts() {
    const search = this.countProductSearch().trim();
    if (!search) {
      this.countProductOptions.set([]);
      return;
    }
    const result = await firstValueFrom(
      this.api.listProducts({ search, field: 'nombre', page: 1, pageSize: 8 }),
    );
    this.countProductOptions.set('items' in result ? result.items : result);
  }

  protected selectCountProduct(product: ProductListItemDto) {
    this.countProductId.set(product.id);
    this.countProductLabel.set(product.nombre);
    this.countProductOptions.set([]);
    this.countProductSearch.set('');
  }

  protected addCountLine() {
    const countId = this.activeCountId();
    const productId = this.countProductId();
    if (!countId || !productId) {
      this.notify.warning('Seleccione un conteo y un producto.');
      return;
    }
    this.upsertCountItemMutation.mutate({
      countId,
      productId,
      codigoLote: this.countLotCode().trim() || undefined,
      stockContado: this.countQty(),
    });
  }

  protected finalizeCount() {
    const countId = this.activeCountId();
    if (!countId) return;
    this.finalizeCountMutation.mutate(countId);
  }

  protected createZone() {
    if (!this.zoneWarehouseId() || !this.newZoneName().trim()) {
      this.notify.warning('Complete almacén y nombre de zona.');
      return;
    }
    this.createZoneMutation.mutate();
  }

  protected readonly zoneTypeOptions = [
    { value: 'RECEPCION', label: 'Recepción' },
    { value: 'CUARENTENA', label: 'Cuarentena' },
    { value: 'LIBERADO', label: 'Liberado' },
    { value: 'DEVOLUCION', label: 'Devolución' },
    { value: 'CADENA_FRIO', label: 'Cadena de frío' },
    { value: 'OTRO', label: 'Otro' },
  ];
}
