import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { establishmentQueryKeys } from '../../../../core/query/establishment-query.keys';
import { supplierQueryKeys } from '../../../../core/query/supplier-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type {
  CreateSupplierRequest,
  CustomerDocumentTypeDto,
  SupplierItemDto,
  SupplierProductItemDto,
  UpsertSupplierProductRequest,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    LabelComponent,
    FormSelectComponent,
    CheckboxComponent,
    IconComponent,
    HasPermissionDirective,
  ],
  templateUrl: './proveedores.component.html',
})
export class ProveedoresComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Compras' },
    { label: 'Proveedores' },
  ];

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'razonSocial' | 'numeroDocumento'>('razonSocial');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly fieldFilterOptions = [
    { value: 'razonSocial', label: 'Razón social' },
    { value: 'numeroDocumento', label: 'Nº documento' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly suppliersQuery = injectQuery(() => ({
    queryKey: supplierQueryKeys.list({
      search: this.searchTerm().trim(),
      field: this.filterField(),
      page: this.currentPage(),
    }),
    queryFn: () =>
      firstValueFrom(
        this.api.listSuppliersPaged({
          search: this.searchTerm(),
          field: this.filterField(),
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly documentTypesQuery = injectQuery(() => ({
    queryKey: ['customer-document-types'],
    queryFn: () => firstValueFrom(this.api.listCustomerDocumentTypes()),
  }));

  protected readonly rows = computed(() => this.suppliersQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.suppliersQuery.data()?.total ?? 0);
  protected readonly pageStart = computed(() =>
    this.totalRows() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage,
  );
  protected readonly paginatedRows = computed(() => this.rows());

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<SupplierItemDto | null>(null);
  protected readonly razonSocial = signal('');
  protected readonly nombreComercial = signal('');
  protected readonly tipoDocumento = signal<CustomerDocumentTypeDto>('RUC');
  protected readonly numeroDocumento = signal('');
  protected readonly telefono = signal('');
  protected readonly correoElectronico = signal('');
  protected readonly contactoNombre = signal('');
  protected readonly diasCredito = signal('0');
  protected readonly departmentId = signal('');
  protected readonly provinceId = signal('');
  protected readonly districtId = signal('');
  protected readonly direccion = signal('');
  protected readonly condicionesPago = signal('');
  protected readonly observaciones = signal('');
  protected readonly habilitado = signal(true);

  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deleting = signal<SupplierItemDto | null>(null);

  protected readonly purchaseHistoryOpen = signal(false);
  protected readonly purchaseHistorySupplier = signal<SupplierItemDto | null>(null);

  protected readonly departmentsQuery = injectQuery(() => ({
    queryKey: establishmentQueryKeys.departments(),
    queryFn: () => firstValueFrom(this.api.listUbigeoDepartments()),
  }));

  protected readonly provincesQuery = injectQuery(() => ({
    queryKey: establishmentQueryKeys.provinces(this.departmentId() || 'none'),
    queryFn: () => firstValueFrom(this.api.listUbigeoProvinces(this.departmentId())),
    enabled: !!this.departmentId(),
  }));

  protected readonly districtsQuery = injectQuery(() => ({
    queryKey: establishmentQueryKeys.districts(this.provinceId() || 'none'),
    queryFn: () => firstValueFrom(this.api.listUbigeoDistricts(this.provinceId())),
    enabled: !!this.provinceId(),
  }));

  protected readonly departmentOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.departmentsQuery.data() ?? []).map((x) => ({
      value: x.id,
      label: (x as { name?: string; nombre?: string }).name ?? (x as { nombre?: string }).nombre ?? x.id,
    })),
  ]);

  protected readonly provinceOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.provincesQuery.data() ?? []).map((x) => ({
      value: x.id,
      label: (x as { name?: string; nombre?: string }).name ?? (x as { nombre?: string }).nombre ?? x.id,
    })),
  ]);

  protected readonly districtOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.districtsQuery.data() ?? []).map((x) => ({
      value: x.id,
      label: (x as { name?: string; nombre?: string }).name ?? (x as { nombre?: string }).nombre ?? x.id,
    })),
  ]);

  protected readonly purchaseHistoryQuery = injectQuery(() => {
    const supplier = this.purchaseHistorySupplier();
    return {
      queryKey: supplierQueryKeys.purchaseHistory(supplier?.id ?? ''),
      queryFn: () => firstValueFrom(this.api.listSupplierPurchaseHistory(supplier!.id)),
      enabled: !!supplier && this.purchaseHistoryOpen(),
    };
  });

  protected readonly productsModalOpen = signal(false);
  protected readonly productsSupplier = signal<SupplierItemDto | null>(null);
  protected readonly newProductId = signal('');
  protected readonly newCodigoProveedor = signal('');
  protected readonly newPrecioCompra = signal('');
  protected readonly newPlazoDias = signal('0');

  protected readonly productsQuery = injectQuery(() => {
    const supplier = this.productsSupplier();
    return {
      queryKey: supplierQueryKeys.products(supplier?.id ?? ''),
      queryFn: () => firstValueFrom(this.api.listSupplierProducts(supplier!.id)),
      enabled: !!supplier && this.productsModalOpen(),
    };
  });

  protected readonly productOptionsQuery = injectQuery(() => ({
    queryKey: ['products', 'options-suppliers'],
    queryFn: () =>
      firstValueFrom(
        this.api.listProducts({ page: 1, pageSize: 500, field: 'nombre', search: '' }),
      ),
    enabled: this.productsModalOpen(),
  }));

  protected readonly productSelectOptions = computed(() =>
    (this.productOptionsQuery.data()?.items ?? []).map((p) => ({
      value: p.id,
      label: p.codigoInterno ? `${p.codigoInterno} — ${p.nombre}` : p.nombre,
    })),
  );

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: CreateSupplierRequest) => firstValueFrom(this.api.createSupplier(body)),
    onSuccess: () => {
      this.notify.success('Proveedor creado correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear el proveedor'));
    },
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: CreateSupplierRequest }) =>
      firstValueFrom(this.api.updateSupplier(id, body)),
    onSuccess: () => {
      this.notify.success('Proveedor actualizado correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el proveedor'));
    },
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteSupplier(id)),
    onSuccess: () => {
      this.notify.success('Proveedor eliminado correctamente');
      this.closeDeleteConfirm();
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el proveedor'));
    },
  }));

  protected readonly upsertProductMutation = injectMutation(() => ({
    mutationFn: ({ supplierId, body }: { supplierId: string; body: UpsertSupplierProductRequest }) =>
      firstValueFrom(this.api.upsertSupplierProduct(supplierId, body)),
    onSuccess: () => {
      this.notify.success('Producto vinculado correctamente');
      this.newProductId.set('');
      this.newCodigoProveedor.set('');
      this.newPrecioCompra.set('');
      this.newPlazoDias.set('0');
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo vincular el producto'));
    },
  }));

  protected readonly removeProductMutation = injectMutation(() => ({
    mutationFn: ({ supplierId, productId }: { supplierId: string; productId: string }) =>
      firstValueFrom(this.api.removeSupplierProduct(supplierId, productId)),
    onSuccess: () => {
      this.notify.success('Producto desvinculado');
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo desvincular el producto'));
    },
  }));

  protected readonly isSaving = computed(
    () => this.createMutation.isPending() || this.updateMutation.isPending(),
  );

  constructor() {
    effect(() => {
      const totalPages = this.suppliersQuery.data()?.totalPages ?? 1;
      const page = this.currentPage();
      if (page > totalPages) this.currentPage.set(totalPages);
      if (page < 1) this.currentPage.set(1);
    });

    effect(() => {
      if (!this.modalOpen()) return;
      const row = this.editing();
      this.razonSocial.set(row?.razonSocial ?? '');
      this.nombreComercial.set(row?.nombreComercial ?? '');
      this.tipoDocumento.set(row?.tipoDocumento ?? 'RUC');
      this.numeroDocumento.set(row?.numeroDocumento ?? '');
      this.telefono.set(row?.telefono ?? '');
      this.correoElectronico.set(row?.correoElectronico ?? '');
      this.contactoNombre.set(row?.contactoNombre ?? '');
      this.diasCredito.set(String(row?.diasCredito ?? 0));
      this.departmentId.set(row?.departmentId ?? '');
      this.provinceId.set(row?.provinceId ?? '');
      this.districtId.set(row?.districtId ?? '');
      this.direccion.set(row?.direccion ?? '');
      this.condicionesPago.set(row?.condicionesPago ?? '');
      this.observaciones.set(row?.observaciones ?? '');
      this.habilitado.set(row?.habilitado ?? true);
    });
  }

  protected openCreateModal() {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  protected openEditModal(row: SupplierItemDto) {
    this.editing.set(row);
    this.modalOpen.set(true);
  }

  protected closeFormModal(force = false) {
    if (!force && this.isSaving()) return;
    this.modalOpen.set(false);
    this.editing.set(null);
  }

  protected buildFormBody(): CreateSupplierRequest | null {
    const razonSocial = this.razonSocial().trim();
    const numeroDocumento = this.numeroDocumento().trim();
    if (!razonSocial) {
      this.notify.warning('Ingrese la razón social.');
      return null;
    }
    if (!numeroDocumento) {
      this.notify.warning('Ingrese el número de documento.');
      return null;
    }
    const dias = Number.parseInt(this.diasCredito(), 10);
    return {
      razonSocial,
      nombreComercial: this.nombreComercial().trim() || undefined,
      tipoDocumento: this.tipoDocumento(),
      numeroDocumento,
      telefono: this.telefono().trim() || undefined,
      correoElectronico: this.correoElectronico().trim() || undefined,
      contactoNombre: this.contactoNombre().trim() || undefined,
      diasCredito: Number.isFinite(dias) ? dias : 0,
      departmentId: this.departmentId() || undefined,
      provinceId: this.provinceId() || undefined,
      districtId: this.districtId() || undefined,
      direccion: this.direccion().trim() || undefined,
      condicionesPago: this.condicionesPago().trim() || undefined,
      observaciones: this.observaciones().trim() || undefined,
      habilitado: this.habilitado(),
    };
  }

  protected submitForm() {
    const body = this.buildFormBody();
    if (!body) return;
    const current = this.editing();
    if (current) {
      this.updateMutation.mutate({ id: current.id, body });
      return;
    }
    this.createMutation.mutate(body);
  }

  protected openDeleteConfirm(row: SupplierItemDto) {
    this.deleting.set(row);
    this.deleteConfirmOpen.set(true);
  }

  protected closeDeleteConfirm() {
    if (this.deleteMutation.isPending()) return;
    this.deleteConfirmOpen.set(false);
    this.deleting.set(null);
  }

  protected confirmDelete() {
    const current = this.deleting();
    if (!current || this.deleteMutation.isPending()) return;
    this.deleteMutation.mutate(current.id);
  }

  protected openPurchaseHistoryModal(row: SupplierItemDto) {
    this.purchaseHistorySupplier.set(row);
    this.purchaseHistoryOpen.set(true);
  }

  protected closePurchaseHistoryModal() {
    this.purchaseHistoryOpen.set(false);
    this.purchaseHistorySupplier.set(null);
  }

  protected onDepartmentChange(value: string) {
    this.departmentId.set(value);
    this.provinceId.set('');
    this.districtId.set('');
  }

  protected onProvinceChange(value: string) {
    this.provinceId.set(value);
    this.districtId.set('');
  }

  protected openProductsModal(row: SupplierItemDto) {
    this.productsSupplier.set(row);
    this.productsModalOpen.set(true);
  }

  protected closeProductsModal() {
    this.productsModalOpen.set(false);
    this.productsSupplier.set(null);
  }

  protected submitProductLink() {
    const supplier = this.productsSupplier();
    const productId = this.newProductId();
    if (!supplier || !productId) {
      this.notify.warning('Seleccione un producto.');
      return;
    }
    const body: UpsertSupplierProductRequest = { productId };
    const codigo = this.newCodigoProveedor().trim();
    if (codigo) body.codigoProveedor = codigo;
    const precio = Number.parseFloat(this.newPrecioCompra());
    if (Number.isFinite(precio)) body.precioCompra = precio;
    const plazo = Number.parseInt(this.newPlazoDias(), 10);
    if (Number.isFinite(plazo)) body.plazoDias = plazo;
    this.upsertProductMutation.mutate({ supplierId: supplier.id, body });
  }

  protected removeProduct(row: SupplierProductItemDto) {
    const supplier = this.productsSupplier();
    if (!supplier || this.removeProductMutation.isPending()) return;
    this.removeProductMutation.mutate({ supplierId: supplier.id, productId: row.productId });
  }

  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onFilterFieldChange(value: string) {
    this.filterField.set((value || 'razonSocial') as 'all' | 'razonSocial' | 'numeroDocumento');
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('razonSocial');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected submitLabel() {
    if (this.isSaving()) return 'Guardando…';
    return this.editing() ? 'Actualizar' : 'Guardar';
  }

  protected onTipoDocumentoChange(value: string) {
    this.tipoDocumento.set(value as CustomerDocumentTypeDto);
  }

  protected docTypeLabel(value: string) {
    return this.documentTypesQuery.data()?.find((x) => x.value === value)?.label ?? value;
  }

  protected async refetchRows() {
    const r = await this.suppliersQuery.refetch();
    if (r.isError) {
      this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el listado.'));
    }
  }
}
