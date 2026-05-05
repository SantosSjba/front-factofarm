import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import JsBarcode from 'jsbarcode';
import * as yup from 'yup';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { serviceQueryKeys } from '../../../../core/query/service-query.keys';
import { FilesApiService } from '../../../../core/services/files-api.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ImageSquarePickerComponent } from '../../../../shared/components/form/image-square-picker/image-square-picker.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { ModalTabHeaderComponent } from '../../../../shared/components/ui/modal-tab-header/modal-tab-header.component';
import type { TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import type { CreateServiceRequest, ServiceListFiltersRequest, ServiceListItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type ServiceTab = 'general' | 'atributos';
type HistoryTab = 'stock' | 'sales' | 'purchases';

type ServiceColumnKey =
  | 'codigoInterno'
  | 'unidad'
  | 'nombre'
  | 'descripcion'
  | 'precioVenta'
  | 'tieneIgvVenta'
  | 'codigoSunat'
  | 'precioCompra'
  | 'tieneIgvCompra'
  | 'modelo'
  | 'marca'
  | 'registroSanitario';

type ServiceColumnConfig = { key: ServiceColumnKey; label: string };

type AttributeRow = {
  uid: string;
  attributeTypeId: string;
  descripcion: string;
};

const SERVICE_TABS: TabStripItem[] = [
  { id: 'general', label: 'General' },
  { id: 'atributos', label: 'Atributos' },
];

const HISTORY_TABS: TabStripItem[] = [
  { id: 'stock', label: 'Ver stock' },
  { id: 'sales', label: 'Últimas ventas' },
  { id: 'purchases', label: 'Últimas compras' },
];

const serviceSchema = yup.object({
  nombre: yup.string().trim().required('Nombre es obligatorio').max(300),
  precioUnitarioVenta: yup
    .number()
    .transform((v) => (Number.isNaN(v) ? 0 : v))
    .min(0, 'Precio unitario debe ser mayor o igual a 0')
    .required('Precio unitario es obligatorio'),
  currencyId: yup.string().uuid('Seleccione moneda').required(),
  saleTaxAffectationId: yup.string().uuid('Seleccione tipo de afectación').required(),
});

const barcodeSchema = yup.object({
  codigoBarra: yup
    .string()
    .trim()
    .required('Código de barras es obligatorio')
    .max(60, 'Código de barra no debe exceder 60 caracteres'),
});

@Component({
  selector: 'app-servicios',
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
    ImageSquarePickerComponent,
    InputFieldComponent,
    LabelComponent,
    IconComponent,
    CheckboxComponent,
  ],
  templateUrl: './servicios.component.html',
})
export class ServiciosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();
  private codigoLookupTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Productos' }, { label: 'Servicios' }];

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<NonNullable<ServiceListFiltersRequest['field']>>('nombre');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly fieldFilterOptions = [
    { value: 'nombre', label: 'Nombre' },
    { value: 'codigoInterno', label: 'Cód. interno' },
    { value: 'descripcion', label: 'Descripción' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly listQuery = injectQuery(() => {
    const filters: ServiceListFiltersRequest = {
      search: this.searchTerm().trim() || undefined,
      field: this.filterField(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: serviceQueryKeys.list(filters),
      queryFn: () => firstValueFrom(this.api.listServices(filters)),
    };
  });

  protected readonly unitsQuery = injectQuery(() => ({
    queryKey: [...serviceQueryKeys.catalogs, 'units'],
    queryFn: () => firstValueFrom(this.api.listServiceCatalogUnits()),
  }));

  protected readonly currenciesQuery = injectQuery(() => ({
    queryKey: [...serviceQueryKeys.catalogs, 'currencies'],
    queryFn: () => firstValueFrom(this.api.listServiceCatalogCurrencies()),
  }));

  protected readonly taxTypesQuery = injectQuery(() => ({
    queryKey: [...serviceQueryKeys.catalogs, 'tax'],
    queryFn: () => firstValueFrom(this.api.listServiceCatalogTaxAffectationTypes()),
  }));

  protected readonly iscSystemsQuery = injectQuery(() => ({
    queryKey: [...serviceQueryKeys.catalogs, 'iscSystems'],
    queryFn: () => firstValueFrom(this.api.listServiceCatalogIscSystems()),
  }));

  protected readonly categoriesQuery = injectQuery(() => ({
    queryKey: ['categories', 'list', '', 'all'],
    queryFn: () => firstValueFrom(this.api.listCategories({ field: 'nombre' })),
  }));

  protected readonly brandsQuery = injectQuery(() => ({
    queryKey: ['brands', 'list', '', 'all'],
    queryFn: () => firstValueFrom(this.api.listBrands({ field: 'nombre' })),
  }));

  protected readonly establishmentsQuery = injectQuery(() => ({
    queryKey: ['establishments', 'list', '', 'all'],
    queryFn: () => firstValueFrom(this.api.listEstablishments()),
  }));

  protected readonly locationsQuery = injectQuery(() => ({
    queryKey: [...serviceQueryKeys.catalogs, 'locations'],
    queryFn: () => firstValueFrom(this.api.listServiceCatalogLocations()),
  }));

  protected readonly attributeTypesQuery = injectQuery(() => ({
    queryKey: [...serviceQueryKeys.catalogs, 'attrTypes'],
    queryFn: () => firstValueFrom(this.api.listServiceCatalogAttributeTypes()),
  }));

  protected readonly services = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);
  protected readonly historyRows = computed(() => this.historyStockQuery.data() ?? []);

  protected readonly columns: ServiceColumnConfig[] = [
    { key: 'codigoInterno', label: 'Cód. Interno' },
    { key: 'unidad', label: 'Unidad' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'precioVenta', label: 'P. Unitario (Venta)' },
    { key: 'tieneIgvVenta', label: 'Tiene Igv (Venta)' },
    { key: 'codigoSunat', label: 'Cód. SUNAT' },
    { key: 'precioCompra', label: 'P.Unitario (Compra)' },
    { key: 'tieneIgvCompra', label: 'Tiene Igv (Compra)' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'marca', label: 'Marca/Laboratorio' },
    { key: 'registroSanitario', label: 'Nº Sanitario' },
  ];

  protected readonly visibleColumns = signal<Record<ServiceColumnKey, boolean>>({
    codigoInterno: true,
    unidad: true,
    nombre: true,
    descripcion: true,
    precioVenta: true,
    tieneIgvVenta: true,
    codigoSunat: false,
    precioCompra: false,
    tieneIgvCompra: false,
    modelo: false,
    marca: false,
    registroSanitario: false,
  });

  protected readonly formOpen = signal(false);
  protected readonly editingServiceId = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmAction = signal<'delete' | 'status' | null>(null);
  protected readonly confirmTarget = signal<ServiceListItemDto | null>(null);
  protected readonly lastActionTriggerId = signal<string | null>(null);
  protected readonly barcodeOpen = signal(false);
  protected readonly selectedService = signal<ServiceListItemDto | null>(null);
  protected readonly historyOpen = signal(false);
  protected readonly historyService = signal<ServiceListItemDto | null>(null);
  protected readonly historyTab = signal<HistoryTab>('stock');
  protected readonly activeTab = signal<ServiceTab>('general');
  protected readonly serviceTabs = SERVICE_TABS;
  protected readonly historyTabs = HISTORY_TABS;
  protected readonly barcodeValue = signal('');
  protected readonly barcodeSvg = signal('');

  protected readonly form = signal<CreateServiceRequest>({
    nombre: '',
    precioUnitarioVenta: 0,
    currencyId: '',
    saleTaxAffectationId: '',
    incluyeIgvVenta: true,
    incluyeIgvCompra: true,
    generico: false,
    necesitaRecetaMedica: false,
    incluyeIscVenta: false,
    incluyeIscCompra: false,
    sujetoDetraccion: false,
    sePuedeCanjearPorPuntos: false,
  });

  protected readonly attributeRows = signal<AttributeRow[]>([]);
  protected readonly formErrors = signal<Record<string, string>>({});
  protected readonly serviceImagePreview = signal<string | null>(null);
  protected readonly serviceImageUploadError = signal<string | null>(null);
  protected readonly newCategoryName = signal('');
  protected readonly newBrandName = signal('');
  protected readonly newLocationName = signal('');
  protected readonly creatingCategory = signal(false);
  protected readonly creatingBrand = signal(false);
  protected readonly creatingLocation = signal(false);
  protected readonly codigoLookupLoading = signal(false);
  protected readonly codigoSuggestions = signal<ServiceListItemDto[]>([]);
  protected readonly codigoLookupDone = signal(false);

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

  protected readonly locationOptions = computed(() => {
    const unique = new Map<string, { value: string; label: string }>();
    for (const l of this.locationsQuery.data() ?? []) {
      const key = l.nombre.trim().toLocaleLowerCase();
      if (!unique.has(key)) {
        unique.set(key, { value: l.id, label: l.nombre });
      }
    }
    return [{ value: '', label: 'Seleccionar' }, ...Array.from(unique.values())];
  });

  protected readonly attributeTypeOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.attributeTypesQuery.data() ?? []).map((a) => ({ value: a.id, label: a.nombre })),
  ]);

  protected readonly tipoSistemaIscOptions = computed(() =>
    (this.iscSystemsQuery.data() ?? []).map((x) => ({ value: x.id, label: x.nombre })),
  );

  protected readonly generalCatalogsLoading = computed(
    () =>
      this.unitsQuery.isPending() ||
      this.currenciesQuery.isPending() ||
      this.taxTypesQuery.isPending() ||
      this.iscSystemsQuery.isPending(),
  );

  protected readonly atributosCatalogsLoading = computed(
    () =>
      this.categoriesQuery.isPending() ||
      this.brandsQuery.isPending() ||
      this.locationsQuery.isPending() ||
      this.attributeTypesQuery.isPending(),
  );

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: (body: CreateServiceRequest) => firstValueFrom(this.api.createService(body)),
    onSuccess: () => {
      this.notify.success('Servicio creado correctamente');
      this.formOpen.set(false);
      this.resetForm();
      void this.queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar el servicio')),
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: CreateServiceRequest }) =>
      firstValueFrom(this.api.updateService(id, body)),
    onSuccess: () => {
      this.notify.success('Servicio actualizado correctamente');
      this.formOpen.set(false);
      this.resetForm();
      void this.queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el servicio')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteService(id)),
    onSuccess: () => {
      this.notify.success('Servicio eliminado correctamente');
      this.closeConfirmModal(true);
      void this.queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el servicio')),
  }));

  protected readonly duplicateMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.duplicateService(id)),
    onSuccess: () => {
      this.notify.success('Servicio duplicado correctamente');
      void this.queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo duplicar el servicio')),
  }));

  protected readonly statusMutation = injectMutation(() => ({
    mutationFn: ({ id, habilitado }: { id: string; habilitado: boolean }) =>
      firstValueFrom(this.api.updateServiceStatus(id, habilitado)),
    onSuccess: (_row, vars) => {
      this.notify.success(vars.habilitado ? 'Servicio habilitado' : 'Servicio inhabilitado');
      this.closeConfirmModal(true);
      void this.queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar estado')),
  }));

  protected readonly barcodeMutation = injectMutation(() => ({
    mutationFn: ({ id, codigoBarra }: { id: string; codigoBarra: string }) =>
      firstValueFrom(this.api.updateServiceBarcode(id, codigoBarra)),
    onSuccess: () => {
      this.notify.success('Código de barras actualizado');
      this.barcodeOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar código de barras')),
  }));

  protected readonly historyStockQuery = injectQuery(() => {
    const serviceId = this.historyService()?.id ?? '';
    const enabled = this.historyOpen() && this.historyTab() === 'stock' && !!serviceId;
    return {
      queryKey: [...serviceQueryKeys.all, 'history', 'stock', serviceId],
      enabled,
      queryFn: () => (serviceId ? firstValueFrom(this.api.listServiceHistoryStock(serviceId)) : Promise.resolve([])),
    };
  });

  constructor() {
    effect(() => {
      const key = 'servicios.visible.columns';
      localStorage.setItem(key, JSON.stringify(this.visibleColumns()));
    });
    const stored = localStorage.getItem('servicios.visible.columns');
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
    const field = (v || 'nombre') as NonNullable<ServiceListFiltersRequest['field']>;
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

  protected onCodigoBusquedaInput(value: string) {
    const codigo = String(value ?? '');
    this.updateForm('codigoBusqueda', codigo);
    this.codigoLookupDone.set(false);
    this.codigoSuggestions.set([]);
    if (this.codigoLookupTimer) clearTimeout(this.codigoLookupTimer);
    const clean = codigo.trim();
    if (clean.length < 2) return;
    this.codigoLookupTimer = setTimeout(() => {
      void this.buscarServicioPorCodigo(clean);
    }, 350);
  }

  protected async buscarCodigoManual() {
    const q = (this.form().codigoBusqueda ?? '').trim();
    if (q.length < 2) return;
    if (this.codigoLookupTimer) {
      clearTimeout(this.codigoLookupTimer);
      this.codigoLookupTimer = null;
    }
    await this.buscarServicioPorCodigo(q);
  }

  protected isVisible(key: ServiceColumnKey) {
    return !!this.visibleColumns()[key];
  }

  protected toggleColumn(key: ServiceColumnKey) {
    this.visibleColumns.update((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  protected setTab(id: string) {
    this.activeTab.set(id as ServiceTab);
  }

  protected updateForm<K extends keyof CreateServiceRequest>(key: K, value: CreateServiceRequest[K]) {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected openCreateModal() {
    this.activeTab.set('general');
    this.editingServiceId.set(null);
    this.formOpen.set(true);
    this.resetForm();
    this.applyCatalogDefaults();
  }

  protected openEditModal(row: ServiceListItemDto) {
    this.activeTab.set('general');
    this.formOpen.set(true);
    this.resetForm();
    this.applyCatalogDefaults();
    this.editingServiceId.set(row.id);
    this.form.update((f) => ({
      ...f,
      nombre: row.nombre,
      descripcion: row.descripcion ?? undefined,
      principioActivo: row.principioActivo ?? undefined,
      concentracion: row.concentracion ?? undefined,
      formaFarmaceutica: row.formaFarmaceutica ?? undefined,
      codigoBusqueda: row.codigoBusqueda ?? undefined,
      codigoInterno: row.codigoInterno ?? undefined,
      codigoBarra: row.codigoBarra ?? undefined,
      codigoSunat: row.codigoSunat ?? undefined,
      codigoMedicamentoDigemid: row.codigoMedicamentoDigemid ?? undefined,
      modelo: row.modelo ?? undefined,
      lineaProducto: row.lineaProducto ?? undefined,
      registroSanitario: row.registroSanitario ?? undefined,
      saleTaxAffectationId: row.saleTaxAffectationId,
      purchaseTaxAffectationId: row.purchaseTaxAffectationId,
      precioUnitarioVenta: Number.parseFloat(row.precioUnitarioVenta) || 0,
      precioUnitarioCompra: row.precioUnitarioCompra != null ? Number.parseFloat(row.precioUnitarioCompra) : undefined,
      incluyeIgvVenta: row.incluyeIgvVenta,
      incluyeIgvCompra: row.incluyeIgvCompra,
      tipoSistemaIscId: row.tipoSistemaIscId ?? undefined,
      porcentajeIsc: row.porcentajeIsc != null ? Number.parseFloat(row.porcentajeIsc) : undefined,
      numeroPuntos: row.numeroPuntos != null ? Number.parseFloat(row.numeroPuntos) : undefined,
      marcaLaboratorio: row.marcaLaboratorio ?? undefined,
      categoryId: row.categoryId ?? undefined,
      brandId: row.brandId ?? undefined,
      productLocationId: row.productLocationId ?? undefined,
      unitId: row.unit.id,
      currencyId: row.currency.id,
      incluyeIscVenta: !!(row.tipoSistemaIscId || row.porcentajeIsc),
      incluyeIscCompra: false,
      sePuedeCanjearPorPuntos: !!row.numeroPuntos,
    }));
  }

  protected openHistoryModal(row: ServiceListItemDto) {
    this.historyService.set(row);
    this.historyTab.set('stock');
    this.historyOpen.set(true);
  }

  protected closeHistoryModal() {
    this.historyOpen.set(false);
    this.historyTab.set('stock');
    this.historyService.set(null);
  }

  protected setHistoryTab(id: string) {
    this.historyTab.set(id as HistoryTab);
  }

  protected deleteServiceRow(row: ServiceListItemDto, triggerId?: string) {
    this.lastActionTriggerId.set(triggerId ?? null);
    this.confirmTarget.set(row);
    this.confirmAction.set('delete');
    this.confirmOpen.set(true);
  }

  protected duplicateServiceRow(row: ServiceListItemDto) {
    this.duplicateMutation.mutate(row.id);
  }

  protected toggleServiceStatus(row: ServiceListItemDto, triggerId?: string) {
    this.lastActionTriggerId.set(triggerId ?? null);
    this.confirmTarget.set(row);
    this.confirmAction.set('status');
    this.confirmOpen.set(true);
  }

  protected closeConfirmModal(force = false) {
    if (!force && (this.deleteMutation.isPending() || this.statusMutation.isPending())) return;
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
    this.confirmTarget.set(null);
    const triggerId = this.lastActionTriggerId();
    if (triggerId) {
      setTimeout(() => {
        document.getElementById(triggerId)?.focus();
      });
    }
    this.lastActionTriggerId.set(null);
  }

  protected confirmActionTitle(): string {
    const action = this.confirmAction();
    if (action === 'delete') return 'Confirmar eliminación';
    if (action === 'status') return 'Confirmar cambio de estado';
    return 'Confirmar acción';
  }

  protected confirmActionMessage(): string {
    const row = this.confirmTarget();
    const action = this.confirmAction();
    if (!row || !action) return '¿Desea continuar?';
    if (action === 'delete') return `¿Desea eliminar el servicio "${row.nombre}"?`;
    const target = row.habilitado ? 'inhabilitar' : 'habilitar';
    return `¿Desea ${target} el servicio "${row.nombre}"?`;
  }

  protected confirmActionButtonLabel(): string {
    const action = this.confirmAction();
    if (action === 'delete') return this.deleteMutation.isPending() ? 'Eliminando...' : 'Eliminar';
    if (action === 'status') return this.statusMutation.isPending() ? 'Procesando...' : 'Confirmar';
    return 'Confirmar';
  }

  protected confirmServiceAction() {
    const row = this.confirmTarget();
    const action = this.confirmAction();
    if (!row || !action) return;
    if (action === 'delete') {
      this.deleteMutation.mutate(row.id);
      return;
    }
    this.statusMutation.mutate({ id: row.id, habilitado: !row.habilitado });
  }

  protected openBarcodeModal(row: ServiceListItemDto) {
    this.selectedService.set(row);
    const defaultCode = row.codigoBarra ?? row.codigoInterno ?? row.codigoBusqueda ?? '';
    this.barcodeValue.set(defaultCode);
    this.refreshBarcodePreview(defaultCode);
    this.barcodeOpen.set(true);
  }

  protected closeBarcodeModal() {
    this.barcodeOpen.set(false);
    this.barcodeValue.set('');
    this.barcodeSvg.set('');
  }

  protected onBarcodeInputChange(value: string | number) {
    const next = String(value ?? '');
    this.barcodeValue.set(next);
    this.refreshBarcodePreview(next);
  }

  protected submitBarcode() {
    const row = this.selectedService();
    if (!row) return;
    const codigoBarra = this.barcodeValue().trim();
    const valid = this.validateBarcode(codigoBarra);
    if (!valid.ok) {
      this.notify.warning(valid.message);
      return;
    }
    this.barcodeMutation.mutate({ id: row.id, codigoBarra });
  }

  protected printBarcode() {
    const row = this.selectedService();
    if (!row) return;
    this.printServiceLabels(row, 'single');
  }

  protected printServiceLabels(row: ServiceListItemDto, format: 'single' | '1x1' | '1x2' | '3x3') {
    const code = (row.codigoBarra ?? '').trim();
    if (!code) {
      this.notify.warning('El servicio no tiene código de barras registrado.');
      return;
    }

    const svg = this.buildBarcodeSvg(code);
    if (!svg) {
      this.notify.warning('No se pudo generar el código de barras.');
      return;
    }

    const layouts = {
      single: { cols: 1, rows: 1, title: 'Etiqueta' },
      '1x1': { cols: 1, rows: 1, title: 'Etiquetas 1x1' },
      '1x2': { cols: 2, rows: 1, title: 'Etiquetas 1x2' },
      '3x3': { cols: 3, rows: 3, title: 'Etiquetas 3x3' },
    } as const;
    const layout = layouts[format];
    const count = layout.cols * layout.rows;
    const labels = Array.from({ length: count })
      .map(
        () => `
        <div class="label">
          <div class="name">${this.escapeHtml(row.nombre)}</div>
          <div class="barcode">${svg}</div>
          <div class="code">${this.escapeHtml(code)}</div>
        </div>
      `,
      )
      .join('');

    const win = window.open('', '_blank', 'width=1100,height=820');
    if (!win) {
      this.notify.warning('No se pudo abrir la ventana de impresión.');
      return;
    }
    win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${layout.title} ${this.escapeHtml(row.nombre)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; }
      .grid { display: grid; grid-template-columns: repeat(${layout.cols}, 1fr); gap: 10px; }
      .label { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; min-height: 120px; }
      .name { font-size: 12px; font-weight: 700; margin-bottom: 4px; line-height: 1.2; }
      .barcode { display: flex; justify-content: center; align-items: center; min-height: 60px; overflow: hidden; }
      .barcode svg { width: 100%; height: 56px; }
      .code { font-size: 11px; color: #374151; margin-top: 4px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="grid">${labels}</div>
    <script>window.onload = () => { window.print(); };</script>
  </body>
</html>`);
    win.document.close();
  }

  protected closeFormModal() {
    if (this.saveMutation.isPending() || this.updateMutation.isPending()) return;
    this.formOpen.set(false);
    this.resetForm();
  }

  private resetForm() {
    this.editingServiceId.set(null);
    this.formErrors.set({});
    this.attributeRows.set([]);
    this.serviceImagePreview.set(null);
    this.serviceImageUploadError.set(null);
    this.newCategoryName.set('');
    this.newBrandName.set('');
    this.newLocationName.set('');
    this.creatingCategory.set(false);
    this.creatingBrand.set(false);
    this.creatingLocation.set(false);
    this.codigoLookupDone.set(false);
    this.codigoSuggestions.set([]);
    if (this.codigoLookupTimer) {
      clearTimeout(this.codigoLookupTimer);
      this.codigoLookupTimer = null;
    }
    this.form.set({
      nombre: '',
      precioUnitarioVenta: 0,
      currencyId: '',
      saleTaxAffectationId: '',
      purchaseTaxAffectationId: undefined,
      incluyeIgvVenta: true,
      incluyeIgvCompra: true,
      generico: false,
      necesitaRecetaMedica: false,
      incluyeIscVenta: false,
      incluyeIscCompra: false,
      sujetoDetraccion: false,
      sePuedeCanjearPorPuntos: false,
      imagenArchivoId: undefined,
    });
    this.applyCatalogDefaults();
  }

  private applyCatalogDefaults() {
    const f = this.form();
    const units = this.unitsQuery.data();
    const cur = this.currenciesQuery.data();
    const tax = this.taxTypesQuery.data();

    if (units?.length && !f.unitId) {
      const zz = units.find((u) => u.codigo === 'ZZ') ?? units[0];
      this.updateForm('unitId', zz.id);
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
  }

  protected addAttributeRow() {
    const uid = crypto.randomUUID();
    this.attributeRows.update((rows) => [...rows, { uid, attributeTypeId: '', descripcion: '' }]);
  }

  protected removeAttributeRow(uid: string) {
    this.attributeRows.update((rows) => rows.filter((r) => r.uid !== uid));
  }

  protected patchAttributeRow(uid: string, patch: Partial<AttributeRow>) {
    this.attributeRows.update((rows) => rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  protected onServiceImageFile(file: File) {
    this.serviceImageUploadError.set(null);
    this.updateForm('imagenArchivoId', undefined);
    this.serviceImagePreview.set(null);
    this.filesApi.upload(file).subscribe({
      next: (res) => {
        this.updateForm('imagenArchivoId', res.id);
        this.serviceImagePreview.set(this.filesApi.absoluteFileUrl(res.url));
      },
      error: (err) => {
        this.serviceImageUploadError.set('No se pudo subir la imagen. Verifique su sesión.');
        this.notify.error(httpErrorMessage(err, 'Error al subir la imagen'));
      },
    });
  }

  protected clearServiceImage() {
    this.updateForm('imagenArchivoId', undefined);
    this.serviceImagePreview.set(null);
    this.serviceImageUploadError.set(null);
  }

  protected async createCategoryQuick() {
    const nombre = this.newCategoryName().trim();
    if (!nombre) {
      this.notify.warning('Ingrese el nombre de la categoría.');
      return;
    }
    if (this.creatingCategory()) return;
    this.creatingCategory.set(true);
    try {
      const row = await firstValueFrom(this.api.createCategory({ nombre }));
      this.newCategoryName.set('');
      await this.categoriesQuery.refetch();
      this.updateForm('categoryId', row.id);
      this.notify.success('Categoría creada correctamente');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear la categoría'));
    } finally {
      this.creatingCategory.set(false);
    }
  }

  protected async createBrandQuick() {
    const nombre = this.newBrandName().trim();
    if (!nombre) {
      this.notify.warning('Ingrese el nombre de la marca.');
      return;
    }
    if (this.creatingBrand()) return;
    this.creatingBrand.set(true);
    try {
      const row = await firstValueFrom(this.api.createBrand({ nombre }));
      this.newBrandName.set('');
      await this.brandsQuery.refetch();
      this.updateForm('brandId', row.id);
      this.notify.success('Marca creada correctamente');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear la marca'));
    } finally {
      this.creatingBrand.set(false);
    }
  }

  protected async createLocationQuick() {
    const nombre = this.newLocationName().trim();
    if (!nombre) {
      this.notify.warning('Ingrese el nombre de la ubicación.');
      return;
    }
    const establishmentId = this.resolveEstablishmentIdForLocation();
    if (!establishmentId) {
      this.notify.warning('No hay establecimiento disponible para crear ubicación.');
      return;
    }
    if (this.creatingLocation()) return;
    this.creatingLocation.set(true);
    try {
      const row = await firstValueFrom(this.api.createProductLocation({ establishmentId, nombre }));
      this.newLocationName.set('');
      await this.locationsQuery.refetch();
      this.updateForm('productLocationId', row.id);
      this.notify.success('Ubicación creada correctamente');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear la ubicación'));
    } finally {
      this.creatingLocation.set(false);
    }
  }

  protected async submitService() {
    this.formErrors.set({});
    const f = this.form();
    try {
      await serviceSchema.validate(
        {
          nombre: f.nombre,
          precioUnitarioVenta: f.precioUnitarioVenta,
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

    const attributes = this.attributeRows()
      .filter((r) => r.attributeTypeId && r.descripcion.trim())
      .map((r) => ({
        attributeTypeId: r.attributeTypeId,
        descripcion: r.descripcion.trim(),
      }));

    if ((f.incluyeIscVenta || f.incluyeIscCompra) && !f.tipoSistemaIscId) {
      this.notify.warning('Seleccione el tipo de sistema ISC.');
      this.activeTab.set('general');
      return;
    }

    const porcentajeIscValue =
      f.porcentajeIsc !== undefined && f.porcentajeIsc !== null && Number.isFinite(f.porcentajeIsc)
        ? f.porcentajeIsc
        : undefined;
    const numeroPuntosValue =
      f.numeroPuntos !== undefined && f.numeroPuntos !== null && Number.isFinite(f.numeroPuntos)
        ? f.numeroPuntos
        : undefined;
    const editingId = this.editingServiceId();

    const body: CreateServiceRequest = {
      ...f,
      categoryId: f.categoryId || undefined,
      brandId: f.brandId || undefined,
      productLocationId: f.productLocationId || undefined,
      tipoSistemaIscId: f.incluyeIscVenta || f.incluyeIscCompra ? f.tipoSistemaIscId : undefined,
      porcentajeIsc: f.incluyeIscVenta || f.incluyeIscCompra ? porcentajeIscValue : undefined,
      numeroPuntos: f.sePuedeCanjearPorPuntos ? numeroPuntosValue : undefined,
      attributes: attributes.length ? attributes : undefined,
      purchaseTaxAffectationId: f.purchaseTaxAffectationId || f.saleTaxAffectationId,
    };

    if (editingId) {
      this.updateMutation.mutate({ id: editingId, body });
      return;
    }
    this.saveMutation.mutate(body);
  }

  private async buscarServicioPorCodigo(codigo: string) {
    const q = codigo.trim();
    if (!q) return;
    this.codigoLookupLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.listServices({
          search: q,
          field: 'all',
          page: 1,
          pageSize: 20,
        }),
      );
      this.codigoLookupDone.set(true);
      this.codigoSuggestions.set(res.items.slice(0, 8));
      const target = q.toLowerCase();
      const exacto =
        res.items.find((x) => (x.codigoBusqueda ?? '').toLowerCase() === target) ??
        res.items.find((x) => (x.codigoBarra ?? '').toLowerCase() === target) ??
        res.items.find((x) => (x.codigoInterno ?? '').toLowerCase() === target) ??
        null;
      const row = exacto ?? (res.items.length === 1 ? res.items[0] : null);
      if (row) this.applyLookupService(row, q);
    } catch {
      // No interrumpe el flujo de edición si falla la búsqueda rápida.
    } finally {
      this.codigoLookupLoading.set(false);
    }
  }

  protected codigoSuggestionCode(row: ServiceListItemDto): string {
    return row.codigoBusqueda || row.codigoBarra || row.codigoInterno || '';
  }

  protected onCodigoSuggestionSelect(row: ServiceListItemDto) {
    const q = (this.form().codigoBusqueda ?? '').trim();
    this.applyLookupService(row, q);
  }

  private applyLookupService(row: ServiceListItemDto, fallbackCode: string) {
    this.form.update((f) => ({
      ...f,
      codigoBusqueda: row.codigoBusqueda ?? row.codigoBarra ?? row.codigoInterno ?? f.codigoBusqueda ?? fallbackCode,
      nombre: row.nombre || f.nombre,
      descripcion: row.descripcion ?? f.descripcion,
      principioActivo: row.principioActivo ?? f.principioActivo,
      concentracion: row.concentracion ?? f.concentracion,
      formaFarmaceutica: row.formaFarmaceutica ?? f.formaFarmaceutica,
      codigoInterno: row.codigoInterno ?? f.codigoInterno,
      codigoBarra: row.codigoBarra ?? f.codigoBarra,
      codigoSunat: row.codigoSunat ?? f.codigoSunat,
      codigoMedicamentoDigemid: row.codigoMedicamentoDigemid ?? f.codigoMedicamentoDigemid,
      registroSanitario: row.registroSanitario ?? f.registroSanitario,
      modelo: row.modelo ?? f.modelo,
      lineaProducto: row.lineaProducto ?? f.lineaProducto,
      marcaLaboratorio: row.marcaLaboratorio ?? f.marcaLaboratorio,
      tipoSistemaIscId: row.tipoSistemaIscId ?? f.tipoSistemaIscId,
      porcentajeIsc: row.porcentajeIsc != null ? Number.parseFloat(row.porcentajeIsc) : f.porcentajeIsc,
      numeroPuntos: row.numeroPuntos != null ? Number.parseFloat(row.numeroPuntos) : f.numeroPuntos,
      saleTaxAffectationId: row.saleTaxAffectationId || f.saleTaxAffectationId,
      purchaseTaxAffectationId: row.purchaseTaxAffectationId || f.purchaseTaxAffectationId,
      categoryId: row.categoryId ?? f.categoryId,
      brandId: row.brandId ?? f.brandId,
      productLocationId: row.productLocationId ?? f.productLocationId,
      unitId: row.unit?.id || f.unitId,
      currencyId: row.currency?.id || f.currencyId,
      precioUnitarioVenta: Number.parseFloat(row.precioUnitarioVenta) || f.precioUnitarioVenta,
      precioUnitarioCompra:
        row.precioUnitarioCompra != null ? Number.parseFloat(row.precioUnitarioCompra) : f.precioUnitarioCompra,
      incluyeIgvVenta: row.incluyeIgvVenta,
      incluyeIgvCompra: row.incluyeIgvCompra,
    }));
    this.codigoSuggestions.set([]);
    this.notify.success('Datos cargados desde el código');
  }

  protected formatSalePrice(row: ServiceListItemDto): string {
    const sym = row.currency.codigo === 'PEN' ? 'S/' : row.currency.codigo === 'USD' ? 'US$' : row.currency.codigo;
    const n = parseFloat(row.precioUnitarioVenta);
    if (!Number.isFinite(n)) return `${sym} 0`;
    return `${sym} ${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
  }

  protected formatPurchasePrice(row: ServiceListItemDto): string {
    if (row.precioUnitarioCompra == null) return '—';
    const sym = row.currency.codigo === 'PEN' ? 'S/' : row.currency.codigo === 'USD' ? 'US$' : row.currency.codigo;
    const n = parseFloat(row.precioUnitarioCompra);
    if (!Number.isFinite(n)) return '—';
    return `${sym} ${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
  }

  protected siNo(v: boolean): string {
    return v ? 'Si' : 'No';
  }

  protected marcaLabel(row: ServiceListItemDto): string {
    return row.marcaNombre ?? row.marcaLaboratorio ?? '—';
  }

  private resolveEstablishmentIdForLocation(): string | null {
    const locationRows = this.locationsQuery.data() ?? [];
    if (locationRows.length) return locationRows[0]?.establishment.id ?? null;
    const estRows = this.establishmentsQuery.data() ?? [];
    if (estRows.length) return estRows[0]?.id ?? null;
    return null;
  }

  private refreshBarcodePreview(value: string) {
    const clean = value.trim();
    if (!clean) {
      this.barcodeSvg.set('');
      return;
    }
    const svg = this.buildBarcodeSvg(clean);
    this.barcodeSvg.set(svg ?? '');
  }

  private buildBarcodeSvg(value: string): string | null {
    try {
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svgEl, value, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        width: 1.5,
        height: 56,
      });
      return svgEl.outerHTML;
    } catch {
      return null;
    }
  }

  private validateBarcode(codigoBarra: string): { ok: boolean; message: string } {
    try {
      barcodeSchema.validateSync({ codigoBarra }, { abortEarly: false });
      return { ok: true, message: '' };
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return { ok: false, message: err.errors[0] ?? 'Código inválido' };
      }
      return { ok: false, message: 'No se pudo validar código de barras' };
    }
  }

  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
