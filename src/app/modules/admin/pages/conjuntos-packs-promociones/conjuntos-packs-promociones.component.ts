﻿import { CommonModule } from '@angular/common';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import * as yup from 'yup';
import { compoundProductQueryKeys } from '../../../../core/query/compound-product-query.keys';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { FilesApiService } from '../../../../core/services/files-api.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ImageSquarePickerComponent } from '../../../../shared/components/form/image-square-picker/image-square-picker.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import type {
  CompoundProductImportMode,
  CompoundProductDetailDto,
  CompoundProductItemInput,
  CompoundProductListFiltersRequest,
  CompoundProductListItemDto,
  ProductImportResultDto,
  CreateCompoundProductRequest,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { FileInputComponent } from '../../../../shared/components/form/input/file-input.component';

type CompoundColumnKey =
  | 'codigoInterno'
  | 'unidad'
  | 'nombre'
  | 'descripcion'
  | 'precioVenta'
  | 'tieneIgvVenta'
  | 'codigoSunat'
  | 'modelo';

type CompoundColumnConfig = { key: CompoundColumnKey; label: string };

type CompoundItemRow = {
  uid: string;
  productId: string;
  descripcion: string;
  precioUnitario: number;
  cantidad: number;
  total: number;
};

const formSchema = yup.object({
  nombre: yup.string().trim().required('Nombre es obligatorio').max(300),
  unitId: yup.string().uuid('Seleccione unidad').required(),
  currencyId: yup.string().uuid('Seleccione moneda').required(),
  saleTaxAffectationId: yup.string().uuid('Seleccione tipo de afectación').required(),
  precioUnitarioVenta: yup.number().min(0, 'Precio unitario de venta debe ser >= 0').required(),
  precioUnitarioCompra: yup.number().min(0, 'Precio unitario de compra debe ser >= 0').required(),
});

import { ExcelIconComponent } from '../../../../shared/icons/excel-icon.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { QuantityStepperComponent } from '../../../../shared/components/form/quantity-stepper/quantity-stepper.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { SelectQuickAddComponent } from '../../../../shared/components/form/select-quick-add/select-quick-add.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalTabHeaderComponent } from '../../../../shared/components/ui/modal-tab-header/modal-tab-header.component';
import type { TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';

@Component({
  selector: 'app-conjuntos-packs-promociones',
  standalone: true,
  imports: [
    ExcelIconComponent,
    AlertComponent,
    FormSectionComponent,
    HelpHintComponent,
    HelpPanelComponent,
    ModalTabHeaderComponent,
    QuantityStepperComponent,
    SearchSelectComponent,
    SelectQuickAddComponent,
    FileInputComponent,
    CheckboxComponent,
    MenuItemComponent,
    QueryPageStatePipe,
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    TableDropdownComponent,
    PaginationComponent,
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    LabelComponent,
    FormSelectComponent,
    ImageSquarePickerComponent,
  ],
  templateUrl: './conjuntos-packs-promociones.component.html',
})
export class ConjuntosPacksPromocionesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly filesApi = inject(FilesApiService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Productos' },
    { label: 'Conjuntos, packs y promociones' },
  ];
  protected readonly itemsPerPage = 10;
  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<NonNullable<CompoundProductListFiltersRequest['field']>>('nombre');
  protected readonly currentPage = signal(1);
  protected readonly fieldFilterOptions = [
    { value: 'nombre', label: 'Nombre' },
    { value: 'codigoInterno', label: 'Cód. Interno' },
    { value: 'descripcion', label: 'Descripción' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly columns: CompoundColumnConfig[] = [
    { key: 'codigoInterno', label: 'Cód. Interno' },
    { key: 'unidad', label: 'Unidad' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'precioVenta', label: 'Precio de venta' },
    { key: 'tieneIgvVenta', label: 'Incluye IGV' },
    { key: 'codigoSunat', label: 'Cód. SUNAT' },
    { key: 'modelo', label: 'Modelo' },
  ];

  protected readonly visibleColumns = signal<Record<CompoundColumnKey, boolean>>({
    codigoInterno: true,
    unidad: true,
    nombre: true,
    descripcion: false,
    precioVenta: true,
    tieneIgvVenta: true,
    codigoSunat: false,
    modelo: false,
  });

  protected readonly listQuery = injectQuery(() => {
    const filters: CompoundProductListFiltersRequest = {
      search: this.searchTerm().trim() || undefined,
      field: this.filterField(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: compoundProductQueryKeys.list(filters),
      queryFn: () => firstValueFrom(this.api.listCompoundProducts(filters)),
    };
  });

  protected readonly unitsQuery = injectQuery(() => ({
    queryKey: [...compoundProductQueryKeys.catalogs, 'units'],
    queryFn: () => firstValueFrom(this.api.listCompoundProductCatalogUnits()),
  }));
  protected readonly currenciesQuery = injectQuery(() => ({
    queryKey: [...compoundProductQueryKeys.catalogs, 'currencies'],
    queryFn: () => firstValueFrom(this.api.listCompoundProductCatalogCurrencies()),
  }));
  protected readonly taxesQuery = injectQuery(() => ({
    queryKey: [...compoundProductQueryKeys.catalogs, 'taxes'],
    queryFn: () => firstValueFrom(this.api.listCompoundProductCatalogTaxAffectationTypes()),
  }));
  protected readonly platformsQuery = injectQuery(() => ({
    queryKey: [...compoundProductQueryKeys.catalogs, 'platforms'],
    queryFn: () => firstValueFrom(this.api.listCompoundProductCatalogPlatforms()),
  }));
  protected readonly categoriesQuery = injectQuery(() => ({
    queryKey: ['categories', 'list', '', 'all'],
    queryFn: () => firstValueFrom(this.api.listCategories({ field: 'nombre' })),
  }));
  protected readonly brandsQuery = injectQuery(() => ({
    queryKey: ['brands', 'list', '', 'all'],
    queryFn: () => firstValueFrom(this.api.listBrands({ field: 'nombre' })),
  }));
  /** Busca en el servidor: el catálogo puede tener miles de productos. */
  protected readonly pickerTerm = signal('');
  protected readonly formOpen = signal(false);
  protected readonly pickerQuery = injectQuery(() => {
    const search = this.pickerTerm();
    return {
      queryKey: ['products', 'pack-picker', search],
      enabled: this.formOpen(),
      queryFn: () =>
        firstValueFrom(
          this.api.listProducts({ search: search || undefined, field: 'all', habilitado: true, page: 1, pageSize: 10 }),
        ),
    };
  });
  protected readonly pickerOptions = computed(() =>
    (this.pickerQuery.data()?.items ?? []).map((x) => ({
      value: x.id,
      label: x.nombre,
      meta: `S/ ${(Number.parseFloat(x.precioUnitarioVenta) || 0).toFixed(2)}`,
    })),
  );

  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);
  protected readonly unitOptions = computed(() =>
    (this.unitsQuery.data() ?? []).map((x) => ({ value: x.id, label: `${x.nombre} (${x.codigo})` })),
  );
  protected readonly currencyOptions = computed(() =>
    (this.currenciesQuery.data() ?? []).map((x) => ({ value: x.id, label: x.nombre })),
  );
  protected readonly taxOptions = computed(() =>
    (this.taxesQuery.data() ?? []).map((x) => ({ value: x.id, label: x.descripcion })),
  );
  protected readonly platformOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.platformsQuery.data() ?? []).map((x) => ({ value: x.id, label: x.nombre })),
  ]);
  protected readonly categoryOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.categoriesQuery.data() ?? []).map((x) => ({ value: x.id, label: x.nombre })),
  ]);
  protected readonly brandOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.brandsQuery.data() ?? []).map((x) => ({ value: x.id, label: x.nombre })),
  ]);
  protected readonly formTabs: TabStripItem[] = [
    { id: 'general', label: 'Datos principales' },
    { id: 'mas', label: 'Más datos' },
  ];
  protected readonly activeTab = signal<'general' | 'mas'>('general');
  protected readonly exporting = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly quickAddOpen = signal<'category' | 'brand' | null>(null);
  protected readonly pickerProductId = signal('');
  protected readonly pickerReset = signal(0);
  protected readonly importOpen = signal(false);
  protected readonly importMode = signal<CompoundProductImportMode>('PRODUCTOS_COMPUESTOS');
  protected readonly importFile = signal<File | null>(null);
  protected readonly importResult = signal<ProductImportResultDto | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly deleteTarget = signal<CompoundProductListItemDto | null>(null);
  protected readonly formErrors = signal<Record<string, string>>({});
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly imageUploadError = signal<string | null>(null);
  protected readonly creatingCategory = signal(false);
  protected readonly creatingBrand = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly newBrandName = signal('');

  protected readonly form = signal<CreateCompoundProductRequest>({
    nombre: '',
    unitId: '',
    currencyId: '',
    saleTaxAffectationId: '',
    precioUnitarioVenta: 0,
    precioUnitarioCompra: 0,
    incluyeIgvVenta: true,
    items: [],
  });
  protected readonly detailRows = signal<CompoundItemRow[]>([]);

  protected readonly addProductQty = signal(1);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: CreateCompoundProductRequest) => firstValueFrom(this.api.createCompoundProduct(body)),
    onSuccess: () => {
      this.notify.success('Pack creado correctamente');
      this.formOpen.set(false);
      this.resetForm();
      void this.queryClient.invalidateQueries({ queryKey: compoundProductQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear el pack')),
  }));
  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: CreateCompoundProductRequest }) =>
      firstValueFrom(this.api.updateCompoundProduct(id, body)),
    onSuccess: () => {
      this.notify.success('Pack actualizado correctamente');
      this.formOpen.set(false);
      this.resetForm();
      void this.queryClient.invalidateQueries({ queryKey: compoundProductQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el pack')),
  }));
  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteCompoundProduct(id)),
    onSuccess: () => {
      this.notify.success('Pack eliminado');
      this.confirmOpen.set(false);
      this.deleteTarget.set(null);
      void this.queryClient.invalidateQueries({ queryKey: compoundProductQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el pack')),
  }));

  protected readonly importMutation = injectMutation(() => ({
    mutationFn: ({ mode, file }: { mode: CompoundProductImportMode; file: File }) =>
      firstValueFrom(this.api.importCompoundProducts(mode, file)),
    onSuccess: (result) => {
      this.importResult.set(result);
      this.notify.success(
        `Importación finalizada. Creados: ${result.created}, actualizados: ${result.updated}, errores: ${result.errors.length}`,
      );
      // Queda abierto con el resultado, para poder leer las filas con errores.
      if (!result.errors.length) this.importOpen.set(false);
      this.importFile.set(null);
      void this.queryClient.invalidateQueries({ queryKey: compoundProductQueryKeys.all });
    },
    onError: (err) =>
      this.notify.error(httpErrorMessage(err, 'No se pudo procesar la importación de conjuntos')),
  }));

  constructor() {
    // Los catálogos pueden llegar después de abrir el formulario.
    effect(() => {
      if (!this.formOpen() || this.editingId()) return;
      if (this.unitsQuery.data() && this.currenciesQuery.data() && this.taxesQuery.data()) {
        this.applyCatalogDefaults();
      }
    });
  }

  protected async exportRows() {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const blob = await firstValueFrom(
        this.api.exportCompoundProducts({
          search: this.searchTerm().trim() || undefined,
          field: this.filterField(),
        }),
      );
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'conjuntos-export.xlsx';
      link.click();
      URL.revokeObjectURL(link.href);
      this.notify.success('Exportación descargada');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar los packs'));
    } finally {
      this.exporting.set(false);
    }
  }

  protected refetchRows() {
    void this.listQuery.refetch();
  }

  protected onSearchChange(v: string) {
    this.searchTerm.set(v);
    this.currentPage.set(1);
  }

  protected onFieldChange(v: string) {
    this.filterField.set((v || 'nombre') as NonNullable<CompoundProductListFiltersRequest['field']>);
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

  protected openImportModal(mode: CompoundProductImportMode) {
    this.importMode.set(mode);
    this.importFile.set(null);
    this.importResult.set(null);
    this.importOpen.set(true);
  }

  protected onImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.importFile.set(input.files?.[0] ?? null);
  }

  protected closeImportModal() {
    if (this.importMutation.isPending()) return;
    this.importOpen.set(false);
    this.importFile.set(null);
  }

  protected processImport() {
    const file = this.importFile();
    if (!file) {
      this.notify.warning('Seleccione un archivo .xlsx');
      return;
    }
    this.importMutation.mutate({ mode: this.importMode(), file });
  }

  protected async downloadImportTemplate() {
    const mode = this.importMode();
    try {
      const blob = await firstValueFrom(this.api.downloadCompoundProductImportTemplate(mode));
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = mode === 'DETALLE_PRODUCTOS_COMPUESTOS' ? 'item_sets_individual.xlsx' : 'item_sets.xlsx';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo descargar la plantilla de importación'));
    }
  }

  protected importModeLabel(mode: CompoundProductImportMode): string {
    return mode === 'DETALLE_PRODUCTOS_COMPUESTOS'
      ? 'Productos de cada pack'
      : 'Packs';
  }

  protected isVisible(key: CompoundColumnKey) {
    return !!this.visibleColumns()[key];
  }

  protected toggleColumn(key: CompoundColumnKey) {
    this.visibleColumns.update((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  protected updateForm<K extends keyof CreateCompoundProductRequest>(key: K, value: CreateCompoundProductRequest[K]) {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected openCreateModal() {
    this.activeTab.set('general');
    this.formOpen.set(true);
    this.editingId.set(null);
    this.resetForm();
    this.applyCatalogDefaults();
  }

  protected async openEditModal(row: CompoundProductListItemDto) {
    this.activeTab.set('general');
    this.formOpen.set(true);
    this.editingId.set(row.id);
    this.resetForm();
    this.detailLoading.set(true);
    try {
      const detail = await firstValueFrom(this.api.getCompoundProduct(row.id));
      this.applyDetailToForm(detail);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo cargar el detalle'));
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected askDelete(row: CompoundProductListItemDto) {
    this.deleteTarget.set(row);
    this.confirmOpen.set(true);
  }

  protected closeConfirmModal() {
    if (this.deleteMutation.isPending()) return;
    this.confirmOpen.set(false);
    this.deleteTarget.set(null);
  }

  protected confirmDelete() {
    const row = this.deleteTarget();
    if (!row) return;
    this.deleteMutation.mutate(row.id);
  }

  protected closeFormModal() {
    if (this.createMutation.isPending() || this.updateMutation.isPending()) return;
    this.formOpen.set(false);
    this.resetForm();
  }

  private resetPicker() {
    this.pickerProductId.set('');
    this.pickerTerm.set('');
    this.pickerReset.update((n) => n + 1);
    this.addProductQty.set(1);
  }

  protected addDetailProduct() {
    const productId = this.pickerProductId();
    const product = (this.pickerQuery.data()?.items ?? []).find((x) => x.id === productId);
    if (!productId || !product) {
      this.notify.warning('Busca y elige un producto de la lista.');
      return;
    }
    const qty = this.addProductQty();
    const price = Number.parseFloat(product.precioUnitarioVenta || '0') || 0;
    const existing = this.detailRows().find((x) => x.productId === productId);
    if (existing) {
      this.setRowQty(existing.uid, existing.cantidad + qty);
    } else {
      this.detailRows.update((rows) => [
        ...rows,
        {
          uid: crypto.randomUUID(),
          productId,
          descripcion: product.nombre,
          precioUnitario: price,
          cantidad: qty,
          total: qty * price,
        },
      ]);
    }
    this.formErrors.update((errors) => {
      const rest = { ...errors };
      delete rest['items'];
      return rest;
    });
    this.resetPicker();
  }

  protected setRowQty(uid: string, cantidad: number) {
    this.detailRows.update((rows) =>
      rows.map((r) => (r.uid === uid ? { ...r, cantidad, total: cantidad * r.precioUnitario } : r)),
    );
  }

  protected removeRow(uid: string) {
    this.detailRows.update((rows) => rows.filter((r) => r.uid !== uid));
  }

  protected detailTotal = computed(() =>
    this.detailRows()
      .reduce((acc, row) => acc + row.total, 0)
      .toFixed(2),
  );

  /** Precio del pack frente a vender sus productos por separado. */
  protected readonly packComparison = computed(() => {
    const separado = Number.parseFloat(this.detailTotal());
    const venta = this.form().precioUnitarioVenta;
    if (!separado || !venta || separado === venta) return null;
    return { amount: separado - venta, percent: ((separado - venta) / separado) * 100 };
  });

  protected formatCurrencyAmount(value: string): string {
    const n = Number.parseFloat(value || '0');
    return `S/ ${Number.isFinite(n) ? n.toFixed(2) : '0.00'}`;
  }

  protected siNo(v: boolean): string {
    return v ? 'Si' : 'No';
  }

  protected onImageFile(file: File) {
    this.imageUploadError.set(null);
    this.updateForm('imagenArchivoId', undefined);
    this.imagePreview.set(null);
    this.filesApi.upload(file).subscribe({
      next: (res) => {
        this.updateForm('imagenArchivoId', res.id);
        this.imagePreview.set(this.filesApi.absoluteFileUrl(res.url));
      },
      error: (err) => {
        this.imageUploadError.set('No se pudo subir la imagen');
        this.notify.error(httpErrorMessage(err, 'Error al subir imagen'));
      },
    });
  }

  protected clearImage() {
    this.updateForm('imagenArchivoId', undefined);
    this.imagePreview.set(null);
    this.imageUploadError.set(null);
  }

  protected async createCategoryQuick() {
    const nombre = this.newCategoryName().trim();
    if (!nombre) return;
    if (this.creatingCategory()) return;
    this.creatingCategory.set(true);
    try {
      const row = await firstValueFrom(this.api.createCategory({ nombre }));
      this.newCategoryName.set('');
      this.quickAddOpen.set(null);
      await this.categoriesQuery.refetch();
      this.updateForm('categoryId', row.id);
      this.notify.success('Categoría creada');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear categoría'));
    } finally {
      this.creatingCategory.set(false);
    }
  }

  protected async createBrandQuick() {
    const nombre = this.newBrandName().trim();
    if (!nombre) return;
    if (this.creatingBrand()) return;
    this.creatingBrand.set(true);
    try {
      const row = await firstValueFrom(this.api.createBrand({ nombre }));
      this.newBrandName.set('');
      this.quickAddOpen.set(null);
      await this.brandsQuery.refetch();
      this.updateForm('brandId', row.id);
      this.notify.success('Marca creada');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear marca'));
    } finally {
      this.creatingBrand.set(false);
    }
  }

  protected async submitForm() {
    this.formErrors.set({});
    const f = this.form();
    try {
      await formSchema.validate(
        {
          nombre: f.nombre,
          unitId: f.unitId,
          currencyId: f.currencyId,
          saleTaxAffectationId: f.saleTaxAffectationId,
          precioUnitarioVenta: f.precioUnitarioVenta,
          precioUnitarioCompra: f.precioUnitarioCompra,
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
        this.activeTab.set('general');
        this.notify.warning('Revisa los campos marcados en «Datos principales».');
      }
      return;
    }

    const items: CompoundProductItemInput[] = this.detailRows().map((r) => ({
      productId: r.productId,
      cantidad: r.cantidad,
      precioUnitario: r.precioUnitario,
    }));
    if (!items.length) {
      this.formErrors.set({ items: 'Agrega al menos un producto al pack.' });
      this.activeTab.set('general');
      this.notify.warning('Agrega al menos un producto al pack.');
      return;
    }

    const body: CreateCompoundProductRequest = {
      ...f,
      plataformaId: f.plataformaId || undefined,
      categoryId: f.categoryId || undefined,
      brandId: f.brandId || undefined,
      codigoSunat: f.codigoSunat || undefined,
      codigoInterno: f.codigoInterno || undefined,
      nombreSecundario: f.nombreSecundario || undefined,
      descripcion: f.descripcion || undefined,
      modelo: f.modelo || undefined,
      totalPrecioCompraReferencia: Number.parseFloat(this.detailTotal()),
      items,
    };

    const editingId = this.editingId();
    if (editingId) {
      this.updateMutation.mutate({ id: editingId, body });
    } else {
      this.createMutation.mutate(body);
    }
  }

  private applyCatalogDefaults() {
    const f = this.form();
    const unitId = this.unitsQuery.data()?.find((x) => x.codigo === 'NIU')?.id ?? this.unitsQuery.data()?.[0]?.id;
    const currencyId =
      this.currenciesQuery.data()?.find((x) => x.codigo === 'PEN')?.id ?? this.currenciesQuery.data()?.[0]?.id;
    const taxId = this.taxesQuery.data()?.find((x) => x.codigo === '10')?.id ?? this.taxesQuery.data()?.[0]?.id;
    if (unitId && !f.unitId) this.updateForm('unitId', unitId);
    if (currencyId && !f.currencyId) this.updateForm('currencyId', currencyId);
    if (taxId && !f.saleTaxAffectationId) this.updateForm('saleTaxAffectationId', taxId);
  }

  private applyDetailToForm(detail: CompoundProductDetailDto) {
    this.form.update((f) => ({
      ...f,
      nombre: detail.nombre,
      nombreSecundario: detail.nombreSecundario ?? undefined,
      descripcion: detail.descripcion ?? undefined,
      modelo: detail.modelo ?? undefined,
      unitId: detail.unit.id,
      currencyId: detail.currency.id,
      saleTaxAffectationId: detail.saleTaxAffectationId,
      precioUnitarioVenta: Number.parseFloat(detail.precioUnitarioVenta) || 0,
      incluyeIgvVenta: detail.incluyeIgvVenta,
      plataformaId: detail.plataformaId ?? undefined,
      codigoSunat: detail.codigoSunat ?? undefined,
      codigoInterno: detail.codigoInterno ?? undefined,
      precioUnitarioCompra: Number.parseFloat(detail.precioUnitarioCompra) || 0,
      totalPrecioCompraReferencia: Number.parseFloat(detail.totalPrecioCompraReferencia) || 0,
      categoryId: detail.categoryId ?? undefined,
      brandId: detail.brandId ?? undefined,
      imagenArchivoId: detail.imagenArchivoId ?? undefined,
    }));
    // El picker resuelve el id con el pipe authFile (la imagen requiere token).
    this.imagePreview.set(detail.imagenArchivoId ?? null);
    this.detailRows.set(
      detail.items.map((x) => ({
        uid: crypto.randomUUID(),
        productId: x.productId,
        descripcion: x.product.nombre,
        precioUnitario: Number.parseFloat(x.precioUnitario) || 0,
        cantidad: Number.parseFloat(x.cantidad) || 1,
        total: Number.parseFloat(x.total) || 0,
      })),
    );
  }

  private resetForm() {
    this.formErrors.set({});
    this.imagePreview.set(null);
    this.imageUploadError.set(null);
    this.newCategoryName.set('');
    this.newBrandName.set('');
    this.quickAddOpen.set(null);
    this.resetPicker();
    this.detailRows.set([]);
    this.form.set({
      nombre: '',
      unitId: '',
      currencyId: '',
      saleTaxAffectationId: '',
      precioUnitarioVenta: 0,
      precioUnitarioCompra: 0,
      incluyeIgvVenta: true,
      items: [],
    });
  }
}
