import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import * as yup from 'yup';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { productQueryKeys } from '../../../../core/query/product-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { ModalTabHeaderComponent } from '../../../../shared/components/ui/modal-tab-header/modal-tab-header.component';
import type { TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import type {
  CreateProductRequest,
  PresentationDefaultPriceDto,
  ProductListFiltersRequest,
  ProductListItemDto,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type ProductTab = 'general' | 'almacenes' | 'presentaciones' | 'atributos' | 'compra';

const PRODUCT_TABS: TabStripItem[] = [
  { id: 'general', label: 'General' },
  { id: 'almacenes', label: 'Almacenes' },
  { id: 'presentaciones', label: 'Presentaciones' },
  { id: 'atributos', label: 'Atributos' },
  { id: 'compra', label: 'Compra' },
];

type ColumnKey =
  | 'codigoInterno'
  | 'unidad'
  | 'nombre'
  | 'descripcion'
  | 'stockMinimo'
  | 'totalStock'
  | 'precioVenta'
  | 'tieneIgvVenta'
  | 'codigoSunat'
  | 'precioCompra'
  | 'tieneIgvCompra'
  | 'modelo'
  | 'marca'
  | 'registroSanitario'
  | 'digemid'
  | 'precioVentaConIgv';

type ColumnConfig = { key: ColumnKey; label: string };

type PresentationRow = {
  uid: string;
  codigoBarra: string;
  unitId: string;
  descripcion: string;
  factor: number;
  precio1: number;
  precio2: number;
  precio3: number;
  precioDefecto: PresentationDefaultPriceDto;
  precioPuntos: string;
};

type AttributeRow = {
  uid: string;
  attributeTypeId: string;
  descripcion: string;
};

const productSchema = yup.object({
  nombre: yup.string().trim().required('Nombre es obligatorio').max(300),
  precioUnitarioVenta: yup
    .number()
    .transform((v) => (Number.isNaN(v) ? 0 : v))
    .min(0, 'Precio unitario debe ser mayor o igual a 0')
    .required('Precio unitario es obligatorio'),
  unitId: yup.string().uuid('Seleccione unidad').required(),
  currencyId: yup.string().uuid('Seleccione moneda').required(),
  saleTaxAffectationId: yup.string().uuid('Seleccione tipo de afectación').required(),
});

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    TableDropdownComponent,
    ModalComponent,
    ModalTabHeaderComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
    IconComponent,
    CheckboxComponent,
  ],
  templateUrl: './productos.component.html',
})
export class ProductosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Productos' }, { label: 'Productos' }];

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'nombre' | 'codigoInterno' | 'descripcion'>('nombre');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;

  protected readonly fieldFilterOptions = [
    { value: 'nombre', label: 'Nombre' },
    { value: 'codigoInterno', label: 'Cód. interno' },
    { value: 'descripcion', label: 'Descripción' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly listQuery = injectQuery(() => {
    const filters: ProductListFiltersRequest = {
      search: this.searchTerm().trim() || undefined,
      field: this.filterField(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: productQueryKeys.list(filters),
      queryFn: () => firstValueFrom(this.api.listProducts(filters)),
    };
  });

  protected readonly unitsQuery = injectQuery(() => ({
    queryKey: [...productQueryKeys.catalogs, 'units'],
    queryFn: () => firstValueFrom(this.api.listProductCatalogUnits()),
  }));

  protected readonly currenciesQuery = injectQuery(() => ({
    queryKey: [...productQueryKeys.catalogs, 'currencies'],
    queryFn: () => firstValueFrom(this.api.listProductCatalogCurrencies()),
  }));

  protected readonly taxTypesQuery = injectQuery(() => ({
    queryKey: [...productQueryKeys.catalogs, 'tax'],
    queryFn: () => firstValueFrom(this.api.listProductCatalogTaxAffectationTypes()),
  }));

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: [...productQueryKeys.catalogs, 'warehouses'],
    queryFn: () => firstValueFrom(this.api.listProductCatalogWarehouses()),
  }));

  protected readonly locationsQuery = injectQuery(() => ({
    queryKey: [...productQueryKeys.catalogs, 'locations'],
    queryFn: () => firstValueFrom(this.api.listProductCatalogLocations()),
  }));

  protected readonly attributeTypesQuery = injectQuery(() => ({
    queryKey: [...productQueryKeys.catalogs, 'attrTypes'],
    queryFn: () => firstValueFrom(this.api.listProductCatalogAttributeTypes()),
  }));

  protected readonly categoriesQuery = injectQuery(() => ({
    queryKey: ['categories', 'list', '', 'all'],
    queryFn: () => firstValueFrom(this.api.listCategories({ field: 'nombre' })),
  }));

  protected readonly brandsQuery = injectQuery(() => ({
    queryKey: ['brands', 'list', '', 'all'],
    queryFn: () => firstValueFrom(this.api.listBrands({ field: 'nombre' })),
  }));

  protected readonly products = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);

  protected readonly columns: ColumnConfig[] = [
    { key: 'codigoInterno', label: 'Cód. Interno' },
    { key: 'unidad', label: 'Unidad' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'stockMinimo', label: 'Stock Mínimo' },
    { key: 'totalStock', label: 'T. Stock' },
    { key: 'precioVenta', label: 'P. Unitario (Venta)' },
    { key: 'tieneIgvVenta', label: 'Tiene Igv (Venta)' },
    { key: 'codigoSunat', label: 'Cód. SUNAT' },
    { key: 'precioCompra', label: 'P.Unitario (Compra)' },
    { key: 'tieneIgvCompra', label: 'Tiene Igv (Compra)' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'marca', label: 'Marca/Laboratorio' },
    { key: 'registroSanitario', label: 'Nº Sanitario' },
    { key: 'digemid', label: 'DIGEMID' },
    { key: 'precioVentaConIgv', label: 'P. venta total (cálculo IGV)' },
  ];

  protected readonly visibleColumns = signal<Record<ColumnKey, boolean>>({
    codigoInterno: true,
    unidad: true,
    nombre: true,
    descripcion: true,
    stockMinimo: false,
    totalStock: true,
    precioVenta: true,
    tieneIgvVenta: true,
    codigoSunat: false,
    precioCompra: false,
    tieneIgvCompra: false,
    modelo: false,
    marca: false,
    registroSanitario: false,
    digemid: false,
    precioVentaConIgv: false,
  });

  protected readonly formOpen = signal(false);
  protected readonly activeTab = signal<ProductTab>('general');
  protected readonly productTabs = PRODUCT_TABS;

  protected readonly form = signal<CreateProductRequest>({
    nombre: '',
    precioUnitarioVenta: 0,
    unitId: '',
    currencyId: '',
    saleTaxAffectationId: '',
    stockMinimo: 1,
    incluyeIgvVenta: true,
    incluyeIgvCompra: true,
    generico: false,
    necesitaRecetaMedica: false,
    calcularCantidadPorPrecio: false,
    manejaLotes: false,
    incluyeIscVenta: false,
    incluyeIscCompra: false,
    sujetoDetraccion: false,
    sePuedeCanjearPorPuntos: false,
    aplicaGanancia: false,
    porcentajeGanancia: 0,
    costoUnitario: 0,
  });

  protected readonly stockInicial = signal(0);
  protected readonly defaultWarehouseId = signal('');
  protected readonly warehousePrecioInputs = signal<Record<string, string>>({});
  protected readonly presentationRows = signal<PresentationRow[]>([]);
  protected readonly attributeRows = signal<AttributeRow[]>([]);
  protected readonly formErrors = signal<Record<string, string>>({});

  protected readonly unitOptions = computed(() =>
    (this.unitsQuery.data() ?? []).map((u) => ({ value: u.id, label: `${u.nombre} (${u.codigo})` })),
  );

  protected readonly currencyOptions = computed(() =>
    (this.currenciesQuery.data() ?? []).map((c) => ({ value: c.id, label: c.nombre })),
  );

  protected readonly taxOptions = computed(() =>
    (this.taxTypesQuery.data() ?? []).map((t) => ({ value: t.id, label: t.descripcion })),
  );

  protected readonly categoryOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.categoriesQuery.data() ?? []).map((c) => ({ value: c.id, label: c.nombre })),
  ]);

  protected readonly brandOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.brandsQuery.data() ?? []).map((b) => ({ value: b.id, label: b.nombre })),
  ]);

  protected readonly locationOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.locationsQuery.data() ?? []).map((l) => ({
      value: l.id,
      label: `${l.nombre} · ${l.establishment.nombre}`,
    })),
  ]);

  protected readonly attributeTypeOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.attributeTypesQuery.data() ?? []).map((a) => ({ value: a.id, label: a.nombre })),
  ]);

  protected readonly presentationUnitOptions = computed(() =>
    (this.unitsQuery.data() ?? []).map((u) => ({ value: u.id, label: u.nombre })),
  );

  protected readonly precioDefectoOptions: { value: PresentationDefaultPriceDto; label: string }[] = [
    { value: 'PRECIO_1', label: 'Precio 1' },
    { value: 'PRECIO_2', label: 'Precio 2' },
    { value: 'PRECIO_3', label: 'Precio 3' },
  ];

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: (body: CreateProductRequest) => firstValueFrom(this.api.createProduct(body)),
    onSuccess: () => {
      this.notify.success('Producto creado correctamente');
      this.formOpen.set(false);
      this.resetForm();
      void this.queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar el producto')),
  }));

  protected readonly warehouseSelectOptions = computed(() =>
    (this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  );

  constructor() {
    effect(() => {
      const key = 'productos.visible.columns';
      localStorage.setItem(key, JSON.stringify(this.visibleColumns()));
    });
    const stored = localStorage.getItem('productos.visible.columns');
    if (stored) {
      try {
        this.visibleColumns.set({ ...this.visibleColumns(), ...JSON.parse(stored) });
      } catch {
        // ignore
      }
    }

    effect(() => {
      if (!this.formOpen()) return;
      if (!this.unitsQuery.data()?.length) return;
      const f = this.form();
      if (!f.unitId || !f.currencyId || !f.saleTaxAffectationId) {
        this.applyCatalogDefaults();
      }
    });
  }

  protected refetchRows() {
    void this.listQuery.refetch();
  }

  protected onSearchChange(v: string) {
    this.searchTerm.set(v);
    this.currentPage.set(1);
  }

  protected onFieldChange(v: string) {
    const field = (v || 'nombre') as NonNullable<ProductListFiltersRequest['field']>;
    this.filterField.set(field);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('nombre');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected isVisible(key: ColumnKey) {
    return !!this.visibleColumns()[key];
  }

  protected toggleColumn(key: ColumnKey) {
    this.visibleColumns.update((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  protected setTab(id: string) {
    this.activeTab.set(id as ProductTab);
  }

  protected updateForm<K extends keyof CreateProductRequest>(key: K, value: CreateProductRequest[K]) {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected openCreateModal() {
    this.activeTab.set('general');
    this.formOpen.set(true);
    this.resetForm();
    this.applyCatalogDefaults();
  }

  protected closeFormModal() {
    if (this.saveMutation.isPending()) return;
    this.formOpen.set(false);
    this.resetForm();
  }

  private resetForm() {
    this.formErrors.set({});
    this.stockInicial.set(0);
    this.defaultWarehouseId.set('');
    this.warehousePrecioInputs.set({});
    this.presentationRows.set([]);
    this.attributeRows.set([]);
    this.form.set({
      nombre: '',
      precioUnitarioVenta: 0,
      unitId: '',
      currencyId: '',
      saleTaxAffectationId: '',
      purchaseTaxAffectationId: undefined,
      stockMinimo: 1,
      incluyeIgvVenta: true,
      incluyeIgvCompra: true,
      generico: false,
      necesitaRecetaMedica: false,
      calcularCantidadPorPrecio: false,
      manejaLotes: false,
      incluyeIscVenta: false,
      incluyeIscCompra: false,
      sujetoDetraccion: false,
      sePuedeCanjearPorPuntos: false,
      aplicaGanancia: false,
      porcentajeGanancia: 0,
      costoUnitario: 0,
    });
    this.applyCatalogDefaults();
  }

  private applyCatalogDefaults() {
    const f = this.form();
    const units = this.unitsQuery.data();
    const cur = this.currenciesQuery.data();
    const tax = this.taxTypesQuery.data();
    const wh = this.warehousesQuery.data();

    if (units?.length && !f.unitId) {
      const niu = units.find((u) => u.codigo === 'NIU') ?? units[0];
      this.updateForm('unitId', niu.id);
    }
    if (cur?.length && !f.currencyId) {
      const pen = cur.find((c) => c.codigo === 'PEN') ?? cur[0];
      this.updateForm('currencyId', pen.id);
    }
    if (tax?.length && !f.saleTaxAffectationId) {
      const grav = tax.find((t) => t.codigo === '10') ?? tax[0];
      this.updateForm('saleTaxAffectationId', grav.id);
      this.updateForm('purchaseTaxAffectationId', grav.id);
    }
    if (wh?.length) {
      const prev = this.warehousePrecioInputs();
      if (Object.keys(prev).length === 0) {
        const inputs: Record<string, string> = {};
        for (const w of wh) {
          inputs[w.id] = '';
        }
        this.warehousePrecioInputs.set(inputs);
      }
      if (!this.defaultWarehouseId()) {
        this.defaultWarehouseId.set(wh[0]?.id ?? '');
      }
    }
  }

  protected addPresentationRow() {
    const uid = crypto.randomUUID();
    const unitId = this.form().unitId || this.unitsQuery.data()?.find((u) => u.codigo === 'NIU')?.id || '';
    this.presentationRows.update((rows) => [
      ...rows,
      {
        uid,
        codigoBarra: '',
        unitId,
        descripcion: '',
        factor: 0,
        precio1: 0,
        precio2: 0,
        precio3: 0,
        precioDefecto: 'PRECIO_2',
        precioPuntos: '',
      },
    ]);
  }

  protected removePresentationRow(uid: string) {
    this.presentationRows.update((rows) => rows.filter((r) => r.uid !== uid));
  }

  protected patchPresentationRow(uid: string, patch: Partial<PresentationRow>) {
    this.presentationRows.update((rows) =>
      rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)),
    );
  }

  protected onPresentationPrecioDefectoChange(uid: string, v: string) {
    const allowed: PresentationDefaultPriceDto[] = ['PRECIO_1', 'PRECIO_2', 'PRECIO_3'];
    const precioDefecto = (allowed.includes(v as PresentationDefaultPriceDto)
      ? v
      : 'PRECIO_1') as PresentationDefaultPriceDto;
    this.patchPresentationRow(uid, { precioDefecto });
  }

  protected addAttributeRow() {
    const uid = crypto.randomUUID();
    this.attributeRows.update((rows) => [...rows, { uid, attributeTypeId: '', descripcion: '' }]);
  }

  protected removeAttributeRow(uid: string) {
    this.attributeRows.update((rows) => rows.filter((r) => r.uid !== uid));
  }

  protected patchAttributeRow(uid: string, patch: Partial<AttributeRow>) {
    this.attributeRows.update((rows) =>
      rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)),
    );
  }

  protected setWarehousePrecio(warehouseId: string, value: string) {
    this.warehousePrecioInputs.update((m) => ({ ...m, [warehouseId]: value }));
  }

  protected async submitProduct() {
    this.formErrors.set({});
    const f = this.form();
    try {
      await productSchema.validate(
        {
          nombre: f.nombre,
          precioUnitarioVenta: f.precioUnitarioVenta,
          unitId: f.unitId,
          currencyId: f.currencyId,
          saleTaxAffectationId: f.saleTaxAffectationId,
        },
        { abortEarly: false },
      );
    } catch (e) {
      if (e instanceof yup.ValidationError) {
        const err: Record<string, string> = {};
        for (const x of e.inner) {
          if (x.path) err[x.path] = x.message;
        }
        this.formErrors.set(err);
        this.notify.warning('Revise los campos obligatorios en la pestaña General.');
      }
      return;
    }

    const warehousePrices = Object.entries(this.warehousePrecioInputs())
      .map(([warehouseId, s]) => {
        const precio = parseFloat(String(s).replace(',', '.'));
        return { warehouseId, precio: Number.isFinite(precio) ? precio : 0 };
      })
      .filter((x) => x.precio > 0);

    const warehouseStocks: { warehouseId: string; cantidad: number }[] = [];
    const dw = this.defaultWarehouseId();
    const si = this.stockInicial();
    if (dw && si > 0) {
      warehouseStocks.push({ warehouseId: dw, cantidad: si });
    }

    const presentations = this.presentationRows()
      .filter((r) => r.unitId)
      .map((r) => ({
        codigoBarra: r.codigoBarra || undefined,
        unitId: r.unitId,
        descripcion: r.descripcion || undefined,
        factor: r.factor,
        precio1: r.precio1,
        precio2: r.precio2,
        precio3: r.precio3,
        precioDefecto: r.precioDefecto,
        precioPuntos: r.precioPuntos ? parseFloat(r.precioPuntos.replace(',', '.')) : undefined,
      }));

    const attributes = this.attributeRows()
      .filter((r) => r.attributeTypeId && r.descripcion.trim())
      .map((r) => ({
        attributeTypeId: r.attributeTypeId,
        descripcion: r.descripcion.trim(),
      }));

    const body: CreateProductRequest = {
      ...f,
      categoryId: f.categoryId || undefined,
      brandId: f.brandId || undefined,
      productLocationId: f.productLocationId || undefined,
      defaultWarehouseId: dw || undefined,
      warehousePrices: warehousePrices.length ? warehousePrices : undefined,
      warehouseStocks: warehouseStocks.length ? warehouseStocks : undefined,
      presentations: presentations.length ? presentations : undefined,
      attributes: attributes.length ? attributes : undefined,
      purchaseTaxAffectationId: f.purchaseTaxAffectationId || f.saleTaxAffectationId,
    };

    this.saveMutation.mutate(body);
  }

  protected formatSalePrice(row: ProductListItemDto): string {
    const sym = row.currency.codigo === 'PEN' ? 'S/' : row.currency.codigo === 'USD' ? 'US$' : row.currency.codigo;
    const n = parseFloat(row.precioUnitarioVenta);
    if (!Number.isFinite(n)) return `${sym} 0`;
    return `${sym} ${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
  }

  protected formatPurchasePrice(row: ProductListItemDto): string {
    if (row.precioUnitarioCompra == null) return '—';
    const sym = row.currency.codigo === 'PEN' ? 'S/' : row.currency.codigo === 'USD' ? 'US$' : row.currency.codigo;
    const n = parseFloat(row.precioUnitarioCompra);
    if (!Number.isFinite(n)) return '—';
    return `${sym} ${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
  }

  protected siNo(v: boolean): string {
    return v ? 'Si' : 'No';
  }

  protected marcaLabel(row: ProductListItemDto): string {
    return row.marcaNombre ?? row.marcaLaboratorio ?? '—';
  }

  /** Precio de venta con IGV aproximado (18%) cuando el precio no incluye IGV. */
  protected precioVentaConIgvDisplay(row: ProductListItemDto): string {
    const base = parseFloat(row.precioUnitarioVenta);
    if (!Number.isFinite(base)) return '—';
    const gross = row.incluyeIgvVenta ? base : base * 1.18;
    const sym = row.currency.codigo === 'PEN' ? 'S/' : row.currency.codigo === 'USD' ? 'US$' : row.currency.codigo;
    return `${sym} ${gross % 1 === 0 ? gross.toFixed(0) : gross.toFixed(2)}`;
  }

  protected noopAction(): void {
    /* reservado: exportar, importar, historial, stock, menú fila */
  }
}
