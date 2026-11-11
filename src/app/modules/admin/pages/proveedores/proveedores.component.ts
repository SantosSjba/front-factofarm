import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { establishmentQueryKeys } from '../../../../core/query/establishment-query.keys';
import { supplierQueryKeys } from '../../../../core/query/supplier-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { isOptionalEmail, isOptionalIntAtLeast, isOptionalNumberAtLeast } from '../../../../core/utils/form-validators';
import { identityDocumentNumberMessage, isValidIdentityDocumentNumber } from '../../../../core/utils/peru-documents';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ColorLegendComponent, type LegendItem, type LegendTone } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { ModalTabHeaderComponent } from '../../../../shared/components/ui/modal-tab-header/modal-tab-header.component';
import type { TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type {
  CreateSupplierRequest,
  CustomerDocumentTypeDto,
  PurchaseOrderStatus,
  SupplierItemDto,
  SupplierProductItemDto,
  UpsertSupplierProductRequest,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { purchaseOrderStatusLabel } from '../../utils/purchase-order-status';

type FormTab = 'general' | 'mas';
type DetailTab = 'compras' | 'productos';
type ColumnKey = 'documento' | 'contacto' | 'telefono' | 'correo' | 'diasCredito';
type FieldKey = 'razonSocial' | 'numeroDocumento' | 'correoElectronico' | 'diasCredito';

const FORM_TABS: TabStripItem[] = [
  { id: 'general', label: 'Datos principales' },
  { id: 'mas', label: 'Más datos' },
];

const DETAIL_TABS: TabStripItem[] = [
  { id: 'compras', label: 'Órdenes de compra' },
  { id: 'productos', label: 'Productos que vende' },
];


@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    CheckboxComponent,
    ColorLegendComponent,
    ComponentCardComponent,
    FormSectionComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    MenuItemComponent,
    ModalComponent,
    ModalTabHeaderComponent,
    PageToolbarComponent,
    PaginationComponent,
    SearchSelectComponent,
    StatusBadgeComponent,
    TableDropdownComponent,
    TextAreaComponent,
  ],
  templateUrl: './proveedores.component.html',
})
export class ProveedoresComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Compras' }, { label: 'Proveedores' }];
  protected readonly rowLegend: LegendItem[] = [{ label: 'Inhabilitado', tone: 'muted' }];

  // ---------- Listado ----------
  protected readonly itemsPerPage = 10;
  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'razonSocial' | 'numeroDocumento'>('razonSocial');
  protected readonly currentPage = signal(1);
  protected readonly fieldFilterOptions = [
    { value: 'razonSocial', label: 'Razón social' },
    { value: 'numeroDocumento', label: 'N.º de documento' },
    { value: 'all', label: 'Todos' },
  ];
  protected readonly columns: { key: ColumnKey; label: string }[] = [
    { key: 'documento', label: 'Documento' },
    { key: 'contacto', label: 'Contacto' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'correo', label: 'Correo' },
    { key: 'diasCredito', label: 'Días de crédito' },
  ];
  protected readonly visibleColumns = signal<Record<ColumnKey, boolean>>({
    documento: true,
    contacto: true,
    telefono: true,
    correo: false,
    diasCredito: true,
  });

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
  protected readonly rows = computed(() => this.suppliersQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.suppliersQuery.data()?.total ?? 0);
  protected readonly pageStart = computed(() => (this.currentPage() - 1) * this.itemsPerPage);

  protected readonly documentTypesQuery = injectQuery(() => ({
    queryKey: ['customer-document-types'],
    queryFn: () => firstValueFrom(this.api.listCustomerDocumentTypes()),
  }));

  // ---------- Formulario ----------
  protected readonly formTabs = FORM_TABS;
  protected readonly formTab = signal<FormTab>('general');
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<SupplierItemDto | null>(null);
  protected readonly formErrors = signal<Partial<Record<FieldKey, string>>>({});
  protected readonly razonSocial = signal('');
  protected readonly nombreComercial = signal('');
  protected readonly tipoDocumento = signal<CustomerDocumentTypeDto>('RUC');
  protected readonly numeroDocumento = signal('');
  protected readonly telefono = signal('');
  protected readonly correoElectronico = signal('');
  protected readonly contactoNombre = signal('');
  protected readonly contactoTelefono = signal('');
  protected readonly diasCredito = signal('0');
  protected readonly departmentId = signal('');
  protected readonly provinceId = signal('');
  protected readonly districtId = signal('');
  protected readonly direccion = signal('');
  protected readonly condicionesPago = signal('');
  protected readonly observaciones = signal('');
  protected readonly habilitado = signal(true);

  protected readonly departmentsQuery = injectQuery(() => ({
    queryKey: establishmentQueryKeys.departments(),
    queryFn: () => firstValueFrom(this.api.listUbigeoDepartments()),
    enabled: this.formOpen(),
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
  protected readonly departmentOptions = computed(() => this.ubigeoOptions(this.departmentsQuery.data()));
  protected readonly provinceOptions = computed(() => this.ubigeoOptions(this.provincesQuery.data()));
  protected readonly districtOptions = computed(() => this.ubigeoOptions(this.districtsQuery.data()));

  // ---------- Detalle (órdenes de compra y productos) ----------
  protected readonly detailTabs = DETAIL_TABS;
  protected readonly detailTab = signal<DetailTab>('compras');
  protected readonly detailSupplier = signal<SupplierItemDto | null>(null);

  protected readonly purchaseHistoryQuery = injectQuery(() => {
    const supplier = this.detailSupplier();
    return {
      queryKey: supplierQueryKeys.purchaseHistory(supplier?.id ?? ''),
      queryFn: () => firstValueFrom(this.api.listSupplierPurchaseHistory(supplier!.id)),
      enabled: !!supplier && this.detailTab() === 'compras',
    };
  });

  protected readonly productsQuery = injectQuery(() => {
    const supplier = this.detailSupplier();
    return {
      queryKey: supplierQueryKeys.products(supplier?.id ?? ''),
      queryFn: () => firstValueFrom(this.api.listSupplierProducts(supplier!.id)),
      enabled: !!supplier && this.detailTab() === 'productos',
    };
  });

  protected readonly pickerTerm = signal('');
  protected readonly pickerReset = signal(0);
  protected readonly newProductId = signal('');
  protected readonly newCodigoProveedor = signal('');
  protected readonly newPrecioCompra = signal('');
  protected readonly newPlazoDias = signal('');

  protected readonly pickerQuery = injectQuery(() => {
    const search = this.pickerTerm();
    return {
      queryKey: ['products', 'supplier-picker', search],
      enabled: !!this.detailSupplier() && this.detailTab() === 'productos',
      queryFn: () =>
        firstValueFrom(this.api.listProducts({ search: search || undefined, field: 'all', page: 1, pageSize: 20 })),
    };
  });
  protected readonly pickerOptions = computed(() =>
    (this.pickerQuery.data()?.items ?? []).map((p) => ({
      value: p.id,
      label: p.nombre,
      meta: p.codigoInterno ? `Cód. ${p.codigoInterno}` : '',
    })),
  );

  // ---------- Confirmaciones ----------
  protected readonly confirmTarget = signal<SupplierItemDto | null>(null);
  protected readonly confirmAction = signal<'delete' | 'status'>('delete');

  // ---------- Mutaciones ----------
  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: CreateSupplierRequest) => firstValueFrom(this.api.createSupplier(body)),
    onSuccess: () => this.afterSave('Proveedor creado correctamente'),
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear el proveedor')),
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: CreateSupplierRequest }) => firstValueFrom(this.api.updateSupplier(id, body)),
    onSuccess: () => this.afterSave('Proveedor actualizado correctamente'),
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el proveedor')),
  }));

  protected readonly statusMutation = injectMutation(() => ({
    mutationFn: ({ id, habilitado }: { id: string; habilitado: boolean }) =>
      firstValueFrom(this.api.updateSupplier(id, { habilitado })),
    onSuccess: (_row, { habilitado }) => {
      this.notify.success(habilitado ? 'Proveedor habilitado' : 'Proveedor inhabilitado');
      this.closeConfirm(true);
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo cambiar el estado del proveedor')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteSupplier(id)),
    onSuccess: () => {
      this.notify.success('Proveedor eliminado correctamente');
      this.closeConfirm(true);
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el proveedor')),
  }));

  protected readonly upsertProductMutation = injectMutation(() => ({
    mutationFn: ({ supplierId, body }: { supplierId: string; body: UpsertSupplierProductRequest }) =>
      firstValueFrom(this.api.upsertSupplierProduct(supplierId, body)),
    onSuccess: () => {
      this.notify.success('Producto vinculado correctamente');
      this.resetProductLink();
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo vincular el producto')),
  }));

  protected readonly removeProductMutation = injectMutation(() => ({
    mutationFn: ({ supplierId, productId }: { supplierId: string; productId: string }) =>
      firstValueFrom(this.api.removeSupplierProduct(supplierId, productId)),
    onSuccess: () => {
      this.notify.success('Producto desvinculado');
      void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo desvincular el producto')),
  }));

  protected readonly isSaving = computed(() => this.createMutation.isPending() || this.updateMutation.isPending());

  constructor() {
    effect(() => {
      const totalPages = Math.max(1, this.suppliersQuery.data()?.totalPages ?? 1);
      if (this.currentPage() > totalPages) this.currentPage.set(totalPages);
    });
  }

  // ---------- Listado ----------
  protected isVisible(key: ColumnKey) {
    return this.visibleColumns()[key];
  }

  protected toggleColumn(key: ColumnKey) {
    this.visibleColumns.update((v) => ({ ...v, [key]: !v[key] }));
  }

  protected rowTone(row: SupplierItemDto): LegendTone | null {
    return row.habilitado ? null : 'muted';
  }

  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onFieldChange(value: string) {
    this.filterField.set((value || 'razonSocial') as 'all' | 'razonSocial' | 'numeroDocumento');
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('razonSocial');
    this.currentPage.set(1);
  }

  protected async refetchRows() {
    const r = await this.suppliersQuery.refetch();
    if (r.isError) this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el listado.'));
  }

  protected docTypeLabel(value: string) {
    return this.documentTypesQuery.data()?.find((x) => x.value === value)?.label ?? value;
  }

  // ---------- Formulario ----------
  protected openCreateModal() {
    this.fillForm(null);
    this.formOpen.set(true);
  }

  protected openEditModal(row: SupplierItemDto) {
    this.fillForm(row);
    this.formOpen.set(true);
  }

  protected closeFormModal(force = false) {
    if (!force && this.isSaving()) return;
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected setFormTab(id: string) {
    this.formTab.set(id as FormTab);
  }

  protected clearError(key: FieldKey) {
    if (this.formErrors()[key]) this.formErrors.update(({ [key]: _, ...rest }) => rest);
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

  private fillForm(row: SupplierItemDto | null) {
    this.editing.set(row);
    this.formTab.set('general');
    this.formErrors.set({});
    this.razonSocial.set(row?.razonSocial ?? '');
    this.nombreComercial.set(row?.nombreComercial ?? '');
    this.tipoDocumento.set(row?.tipoDocumento ?? 'RUC');
    this.numeroDocumento.set(row?.numeroDocumento ?? '');
    this.telefono.set(row?.telefono ?? '');
    this.correoElectronico.set(row?.correoElectronico ?? '');
    this.contactoNombre.set(row?.contactoNombre ?? '');
    this.contactoTelefono.set(row?.contactoTelefono ?? '');
    this.diasCredito.set(String(row?.diasCredito ?? 0));
    this.departmentId.set(row?.departmentId ?? '');
    this.provinceId.set(row?.provinceId ?? '');
    this.districtId.set(row?.districtId ?? '');
    this.direccion.set(row?.direccion ?? '');
    this.condicionesPago.set(row?.condicionesPago ?? '');
    this.observaciones.set(row?.observaciones ?? '');
    this.habilitado.set(row?.habilitado ?? true);
  }

  private buildFormBody(): CreateSupplierRequest | null {
    const razonSocial = this.razonSocial().trim();
    const numeroDocumento = this.numeroDocumento().trim();
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!razonSocial) errors.razonSocial = 'Escribe la razón social.';
    if (!numeroDocumento) errors.numeroDocumento = 'Escribe el número de documento.';
    else if (!isValidIdentityDocumentNumber(this.tipoDocumento(), numeroDocumento)) {
      errors.numeroDocumento = identityDocumentNumberMessage(this.tipoDocumento());
    }
    if (!isOptionalEmail(this.correoElectronico())) errors.correoElectronico = 'Escribe un correo válido, por ejemplo ventas@proveedor.com.';
    if (!isOptionalIntAtLeast(this.diasCredito(), 0)) errors.diasCredito = 'Debe ser un número entero de días, 0 o más.';
    this.formErrors.set(errors);
    if (Object.keys(errors).length) {
      // Todos estos campos están en «Datos principales».
      this.formTab.set('general');
      this.notify.warning('Revisa los campos marcados en «Datos principales».');
      return null;
    }
    const dias = Number.parseInt(this.diasCredito(), 10);
    // Al editar, un campo vaciado se envía como null para que el API lo limpie; con undefined
    // el API lo ignoraba y el valor anterior nunca se borraba.
    const empty = this.editing() ? null : undefined;
    return {
      razonSocial,
      nombreComercial: this.nombreComercial().trim() || empty,
      tipoDocumento: this.tipoDocumento(),
      numeroDocumento,
      telefono: this.telefono().trim() || empty,
      correoElectronico: this.correoElectronico().trim() || empty,
      contactoNombre: this.contactoNombre().trim() || empty,
      contactoTelefono: this.contactoTelefono().trim() || empty,
      diasCredito: Number.isFinite(dias) ? dias : 0,
      departmentId: this.departmentId() || empty,
      provinceId: this.provinceId() || empty,
      districtId: this.districtId() || empty,
      direccion: this.direccion().trim() || empty,
      condicionesPago: this.condicionesPago().trim() || empty,
      observaciones: this.observaciones().trim() || empty,
      habilitado: this.habilitado(),
    };
  }

  private afterSave(message: string) {
    this.notify.success(message);
    this.closeFormModal(true);
    void this.queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
  }

  // ---------- Detalle ----------
  protected openDetail(row: SupplierItemDto, tab: DetailTab) {
    this.resetProductLink();
    this.detailTab.set(tab);
    this.detailSupplier.set(row);
  }

  protected closeDetail() {
    this.detailSupplier.set(null);
  }

  protected setDetailTab(id: string) {
    this.detailTab.set(id as DetailTab);
  }

  protected poStatusLabel(estado: PurchaseOrderStatus): string {
    return purchaseOrderStatusLabel(estado);
  }

  protected money(value: string | number | null | undefined): string {
    const n = Number(value);
    return value === null || value === undefined || value === '' || !Number.isFinite(n) ? '—' : n.toFixed(2);
  }

  protected submitProductLink() {
    const supplier = this.detailSupplier();
    const productId = this.newProductId();
    if (!supplier) return;
    if (!productId) {
      this.notify.warning('Busca y elige un producto.');
      return;
    }
    if (!isOptionalNumberAtLeast(this.newPrecioCompra(), 0)) {
      this.notify.warning('El precio de compra debe ser un número mayor o igual a 0.');
      return;
    }
    if (!isOptionalIntAtLeast(this.newPlazoDias(), 0)) {
      this.notify.warning('El plazo debe ser un número entero de días, 0 o más.');
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
    const supplier = this.detailSupplier();
    if (!supplier || this.removeProductMutation.isPending()) return;
    this.removeProductMutation.mutate({ supplierId: supplier.id, productId: row.productId });
  }

  private resetProductLink() {
    this.newProductId.set('');
    this.newCodigoProveedor.set('');
    this.newPrecioCompra.set('');
    this.newPlazoDias.set('');
    this.pickerTerm.set('');
    this.pickerReset.update((n) => n + 1);
  }

  // ---------- Confirmaciones ----------
  protected askDelete(row: SupplierItemDto) {
    this.confirmAction.set('delete');
    this.confirmTarget.set(row);
  }

  protected askToggleStatus(row: SupplierItemDto) {
    this.confirmAction.set('status');
    this.confirmTarget.set(row);
  }

  protected closeConfirm(force = false) {
    if (!force && (this.deleteMutation.isPending() || this.statusMutation.isPending())) return;
    this.confirmTarget.set(null);
  }

  protected runConfirm() {
    const row = this.confirmTarget();
    if (!row) return;
    if (this.confirmAction() === 'delete') {
      this.deleteMutation.mutate(row.id);
      return;
    }
    this.statusMutation.mutate({ id: row.id, habilitado: !row.habilitado });
  }

  private ubigeoOptions(rows: { id: string }[] | undefined) {
    return (rows ?? []).map((x) => ({
      value: x.id,
      label: (x as { name?: string; nombre?: string }).name ?? (x as { nombre?: string }).nombre ?? x.id,
    }));
  }
}
