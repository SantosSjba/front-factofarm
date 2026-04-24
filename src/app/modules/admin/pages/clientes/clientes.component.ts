import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import * as yup from 'yup';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { customerQueryKeys } from '../../../../core/query/customer-query.keys';
import { establishmentQueryKeys } from '../../../../core/query/establishment-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
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
  CreateCustomerRequest,
  CustomerAddressDto,
  CustomerItemDto,
  CustomerListFiltersRequest,
  ExportCustomersRequest,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type CustomerTab = 'datos' | 'direccion' | 'otros';
const CUSTOMER_TABS: TabStripItem[] = [
  { id: 'datos', label: 'Datos de Cliente' },
  { id: 'direccion', label: 'Dirección' },
  { id: 'otros', label: 'Otros Datos' },
];

type ColumnConfig = {
  key:
    | 'nombre'
    | 'codigoInterno'
    | 'tipoDocumento'
    | 'numeroDocumento'
    | 'observaciones'
    | 'zona'
    | 'sitioWeb'
    | 'puntos'
    | 'tipoCliente'
    | 'diasCredito'
    | 'vendedor'
    | 'correoElectronico'
    | 'telefono'
    | 'departamento'
    | 'provincia'
    | 'distrito';
  label: string;
};

type Option = {
  value: string;
  label: string;
};

const customerAddressSchema = yup.object({
  id: yup.string().optional(),
  esPrincipal: yup.boolean().optional(),
  pais: yup.string().max(80, 'País no debe exceder 80 caracteres').optional(),
  departmentId: yup.string().nullable().optional(),
  provinceId: yup.string().nullable().optional(),
  districtId: yup.string().nullable().optional(),
  direccion: yup.string().max(250, 'Dirección no debe exceder 250 caracteres').nullable().optional(),
  telefono: yup.string().max(30, 'Teléfono no debe exceder 30 caracteres').nullable().optional(),
  correoElectronico: yup
    .string()
    .email('Correo electrónico no válido')
    .max(120, 'Correo electrónico no debe exceder 120 caracteres')
    .nullable()
    .optional(),
  correosOpcionales: yup
    .string()
    .max(250, 'Correos opcionales no debe exceder 250 caracteres')
    .nullable()
    .optional(),
});

const customerCreateSchema = yup.object({
  nombre: yup.string().trim().required('Nombre es obligatorio').max(200, 'Nombre no debe exceder 200 caracteres'),
  nombreComercial: yup.string().max(200, 'Nombre comercial no debe exceder 200 caracteres').optional(),
  tipoDocumento: yup
    .mixed<CreateCustomerRequest['tipoDocumento']>()
    .oneOf(['DNI', 'RUC', 'CE', 'PASAPORTE', 'DOC_SIN_RUC', 'OTRO'], 'Tipo de documento no válido')
    .required('Tipo de documento es obligatorio'),
  numeroDocumento: yup
    .string()
    .trim()
    .required('Número de documento es obligatorio')
    .max(30, 'Número de documento no debe exceder 30 caracteres'),
  nacionalidad: yup.string().max(80, 'Nacionalidad no debe exceder 80 caracteres').optional(),
  diasCredito: yup
    .number()
    .transform((v) => (Number.isNaN(v) ? 0 : v))
    .min(0, 'Días de crédito debe ser mayor o igual a 0')
    .optional(),
  codigoInterno: yup.string().max(30, 'Código interno no debe exceder 30 caracteres').optional(),
  codigoBarra: yup.string().max(60, 'Código de barra no debe exceder 60 caracteres').optional(),
  observaciones: yup.string().max(500, 'Observaciones no debe exceder 500 caracteres').optional(),
  sitioWeb: yup.string().max(250, 'Sitio web no debe exceder 250 caracteres').optional(),
  contactoNombre: yup.string().max(200, 'Contacto no debe exceder 200 caracteres').optional(),
  contactoTelefono: yup.string().max(30, 'Teléfono contacto no debe exceder 30 caracteres').optional(),
  telefono: yup.string().max(30, 'Teléfono no debe exceder 30 caracteres').optional(),
  correoElectronico: yup.string().email('Correo electrónico no válido').max(120).optional(),
  correosOpcionales: yup.string().max(250, 'Correos opcionales no debe exceder 250 caracteres').optional(),
  puntosAcumulados: yup
    .number()
    .transform((v) => (Number.isNaN(v) ? 0 : v))
    .min(0, 'Puntos acumulados debe ser mayor o igual a 0')
    .optional(),
  activo: yup.boolean().optional(),
  habilitado: yup.boolean().optional(),
  etiquetas: yup.array(yup.string().required().max(80, 'Etiqueta no debe exceder 80 caracteres')).optional(),
  customerTypeId: yup.string().nullable().optional(),
  zoneId: yup.string().nullable().optional(),
  vendedorAsignadoId: yup.string().nullable().optional(),
  addresses: yup.array(customerAddressSchema).optional(),
});

const barcodeSchema = yup.object({
  codigoBarra: yup
    .string()
    .trim()
    .required('Código de barras es obligatorio')
    .max(60, 'Código de barra no debe exceder 60 caracteres'),
});

const tagsSchema = yup.object({
  etiquetas: yup
    .array(yup.string().required().max(80, 'Etiqueta no debe exceder 80 caracteres'))
    .max(30, 'No debe exceder 30 etiquetas')
    .required('Etiquetas son obligatorias'),
});

const importSchema = yup.object({
  file: yup
    .mixed<File>()
    .required('Seleccione un archivo xlsx')
    .test('xlsx', 'El archivo debe ser .xlsx', (v) => !!v && /\.xlsx$/i.test(v.name)),
});

const exportSchema = yup.object({
  period: yup
    .mixed<'all' | 'month' | 'between-months' | 'seller'>()
    .oneOf(['all', 'month', 'between-months', 'seller'])
    .required(),
  month: yup.string().optional(),
  fromMonth: yup.string().optional(),
  toMonth: yup.string().optional(),
  sellerId: yup.string().optional(),
});

@Component({
  selector: 'app-clientes',
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
  ],
  templateUrl: './clientes.component.html',
})
export class ClientesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Clientes' },
    { label: 'Listado de Clientes' },
  ];

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'nombre' | 'numeroDocumento' | 'codigoInterno'>('nombre');
  protected readonly customerTypeId = signal('');
  protected readonly zoneId = signal('');
  protected readonly estado = signal<'all' | 'habilitado' | 'inhabilitado'>('all');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;

  protected readonly listQuery = injectQuery(() => {
    const filters: CustomerListFiltersRequest = {
      search: this.searchTerm().trim() || undefined,
      field: this.filterField(),
      customerTypeId: this.customerTypeId() || undefined,
      zoneId: this.zoneId() || undefined,
      estado: this.estado(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: customerQueryKeys.list(filters),
      queryFn: () => firstValueFrom(this.api.listCustomers(filters)),
    };
  });

  protected readonly customerTypesQuery = injectQuery(() => ({
    queryKey: customerQueryKeys.all,
    queryFn: () => firstValueFrom(this.api.listCustomerTypes({ field: 'descripcion' })),
  }));

  protected readonly zonesQuery = injectQuery(() => ({
    queryKey: customerQueryKeys.zones(),
    queryFn: () => firstValueFrom(this.api.listCustomerZones()),
  }));

  protected readonly sellersQuery = injectQuery(() => ({
    queryKey: customerQueryKeys.sellers(),
    queryFn: () => firstValueFrom(this.api.listCustomerSellers()),
  }));

  protected readonly documentTypesQuery = injectQuery(() => ({
    queryKey: customerQueryKeys.documentTypes(),
    queryFn: () => firstValueFrom(this.api.listCustomerDocumentTypes()),
  }));

  protected readonly nationalitiesQuery = injectQuery(() => ({
    queryKey: customerQueryKeys.nationalities(),
    queryFn: () => firstValueFrom(this.api.listCustomerNationalities()),
  }));

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

  protected readonly fieldFilterOptions = [
    { value: 'nombre', label: 'Nombre' },
    { value: 'numeroDocumento', label: 'Número documento' },
    { value: 'codigoInterno', label: 'Cód. interno' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly customers = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);

  protected readonly customerTypeOptions = computed<Option[]>(() => [
    { value: '', label: 'Tipo de cliente' },
    ...(this.customerTypesQuery.data() ?? []).map((x) => ({ value: x.id, label: x.descripcion })),
  ]);

  protected readonly zoneOptions = computed<Option[]>(() => [
    { value: '', label: 'Zona' },
    ...(this.zonesQuery.data() ?? []).map((x) => ({ value: x.id, label: x.nombre })),
  ]);

  protected readonly stateOptions: Option[] = [
    { value: 'all', label: 'Todos' },
    { value: 'habilitado', label: 'Habilitados' },
    { value: 'inhabilitado', label: 'Inhabilitados' },
  ];

  protected readonly columns: ColumnConfig[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'codigoInterno', label: 'Cód interno' },
    { key: 'tipoDocumento', label: 'Tipo de documento' },
    { key: 'numeroDocumento', label: 'Número' },
    { key: 'observaciones', label: 'Observaciones' },
    { key: 'zona', label: 'Zona' },
    { key: 'sitioWeb', label: 'WebSite' },
    { key: 'puntos', label: 'Puntos acumulados' },
    { key: 'tipoCliente', label: 'Tipo de cliente' },
    { key: 'diasCredito', label: 'Días de crédito' },
    { key: 'vendedor', label: 'Vendedor asignado' },
    { key: 'correoElectronico', label: 'Correo electrónico' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'departamento', label: 'Departamento' },
    { key: 'provincia', label: 'Provincia' },
    { key: 'distrito', label: 'Distrito' },
  ];
  protected readonly visibleColumns = signal<Record<string, boolean>>({
    nombre: true,
    codigoInterno: true,
    tipoDocumento: true,
    numeroDocumento: true,
    observaciones: true,
    zona: true,
    sitioWeb: true,
    puntos: true,
    tipoCliente: false,
    diasCredito: false,
    vendedor: false,
    correoElectronico: false,
    telefono: false,
    departamento: false,
    provincia: false,
    distrito: false,
  });

  protected readonly formOpen = signal(false);
  protected readonly importOpen = signal(false);
  protected readonly exportOpen = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly barcodeOpen = signal(false);
  protected readonly tagsOpen = signal(false);
  protected readonly activeTab = signal<CustomerTab>('datos');
  protected readonly customerTabs = CUSTOMER_TABS;
  protected readonly editing = signal<CustomerItemDto | null>(null);
  protected readonly selected = signal<CustomerItemDto | null>(null);

  protected readonly form = signal<CreateCustomerRequest>({
    nombre: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    diasCredito: 0,
    nacionalidad: 'PERU',
    addresses: [],
    etiquetas: [],
    habilitado: true,
    activo: true,
  });
  protected readonly departmentId = signal('');
  protected readonly provinceId = signal('');
  protected readonly districtId = signal('');
  protected readonly extraAddress = signal<CustomerAddressDto>({
    pais: 'PERU',
  });
  protected readonly extraAddresses = signal<CustomerAddressDto[]>([]);

  protected readonly barcodeValue = signal('');
  protected readonly tagsValue = signal('');

  protected readonly importFile = signal<File | null>(null);
  protected readonly exportForm = signal<ExportCustomersRequest>({
    period: 'month',
    month: this.currentMonth(),
  });

  protected readonly departmentOptions = computed<Option[]>(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.departmentsQuery.data() ?? []).map((x) => ({
      value: x.id,
      label: (x as { name?: string; nombre?: string }).name ?? (x as { nombre?: string }).nombre ?? x.id,
    })),
  ]);
  protected readonly provinceOptions = computed<Option[]>(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.provincesQuery.data() ?? []).map((x) => ({
      value: x.id,
      label: (x as { name?: string; nombre?: string }).name ?? (x as { nombre?: string }).nombre ?? x.id,
    })),
  ]);
  protected readonly districtOptions = computed<Option[]>(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.districtsQuery.data() ?? []).map((x) => ({
      value: x.id,
      label: (x as { name?: string; nombre?: string }).name ?? (x as { nombre?: string }).nombre ?? x.id,
    })),
  ]);

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id?: string; body: CreateCustomerRequest }) =>
      id ? firstValueFrom(this.api.updateCustomer(id, body)) : firstValueFrom(this.api.createCustomer(body)),
    onSuccess: () => {
      this.notify.success(this.editing() ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
      this.formOpen.set(false);
      this.resetForm();
      void this.queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo guardar el cliente'));
    },
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteCustomer(id)),
    onSuccess: () => {
      this.notify.success('Cliente eliminado correctamente');
      this.deleteOpen.set(false);
      this.selected.set(null);
      void this.queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el cliente')),
  }));

  protected readonly statusMutation = injectMutation(() => ({
    mutationFn: ({ id, habilitado }: { id: string; habilitado: boolean }) =>
      firstValueFrom(this.api.updateCustomerStatus(id, habilitado)),
    onSuccess: (_, vars) => {
      this.notify.success(vars.habilitado ? 'Cliente habilitado' : 'Cliente inhabilitado');
      void this.queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar estado')),
  }));

  protected readonly barcodeMutation = injectMutation(() => ({
    mutationFn: ({ id, codigoBarra }: { id: string; codigoBarra: string }) =>
      firstValueFrom(this.api.updateCustomerBarcode(id, codigoBarra)),
    onSuccess: () => {
      this.notify.success('Código de barras actualizado');
      this.barcodeOpen.set(false);
      this.barcodeValue.set('');
      this.selected.set(null);
      void this.queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar código de barras')),
  }));

  protected readonly tagsMutation = injectMutation(() => ({
    mutationFn: ({ id, etiquetas }: { id: string; etiquetas: string[] }) =>
      firstValueFrom(this.api.updateCustomerTags(id, etiquetas)),
    onSuccess: () => {
      this.notify.success('Etiquetas actualizadas');
      this.tagsOpen.set(false);
      this.tagsValue.set('');
      this.selected.set(null);
      void this.queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar etiquetas')),
  }));

  protected readonly importMutation = injectMutation(() => ({
    mutationFn: (file: File) => firstValueFrom(this.api.importCustomers(file)),
    onSuccess: (res) => {
      this.notify.success(`Importación completada. Creados: ${res.created}, actualizados: ${res.updated}`);
      if (res.errors.length) {
        this.notify.warning(`Se detectaron ${res.errors.length} filas con error.`);
      }
      this.importOpen.set(false);
      this.importFile.set(null);
      void this.queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo importar clientes')),
  }));

  constructor() {
    effect(() => {
      const key = 'clientes.visible.columns';
      const current = this.visibleColumns();
      localStorage.setItem(key, JSON.stringify(current));
    });
    const stored = localStorage.getItem('clientes.visible.columns');
    if (stored) {
      try {
        this.visibleColumns.set({ ...this.visibleColumns(), ...JSON.parse(stored) });
      } catch {
        // ignore
      }
    }
  }

  protected onSearchChange(v: string) {
    this.searchTerm.set(v);
    this.currentPage.set(1);
  }

  protected onFieldChange(v: string) {
    this.filterField.set((v || 'nombre') as 'all' | 'nombre' | 'numeroDocumento' | 'codigoInterno');
    this.currentPage.set(1);
  }

  protected onTypeFilterChange(v: string) {
    this.customerTypeId.set(v);
    this.currentPage.set(1);
  }

  protected onZoneFilterChange(v: string) {
    this.zoneId.set(v);
    this.currentPage.set(1);
  }

  protected onStateFilterChange(v: string) {
    this.estado.set((v || 'all') as 'all' | 'habilitado' | 'inhabilitado');
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('nombre');
    this.customerTypeId.set('');
    this.zoneId.set('');
    this.estado.set('all');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected isVisible(key: ColumnConfig['key']) {
    return !!this.visibleColumns()[key];
  }

  protected toggleColumn(key: ColumnConfig['key']) {
    this.visibleColumns.update((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  protected openCreateModal() {
    this.editing.set(null);
    this.activeTab.set('datos');
    this.formOpen.set(true);
    this.resetForm();
    void this.ensureUbigeoCatalogs();
  }

  protected openEditModal(row: CustomerItemDto) {
    this.editing.set(row);
    this.activeTab.set('datos');
    this.formOpen.set(true);
    this.departmentId.set(row.addresses[0]?.departmentId ?? '');
    this.provinceId.set(row.addresses[0]?.provinceId ?? '');
    this.districtId.set(row.addresses[0]?.districtId ?? '');
    this.form.set({
      nombre: row.nombre,
      nombreComercial: row.nombreComercial ?? undefined,
      tipoDocumento: row.tipoDocumento,
      numeroDocumento: row.numeroDocumento,
      nacionalidad: row.nacionalidad ?? 'PERU',
      diasCredito: row.diasCredito,
      codigoInterno: row.codigoInterno ?? undefined,
      codigoBarra: row.codigoBarra ?? undefined,
      observaciones: row.observaciones ?? undefined,
      sitioWeb: row.sitioWeb ?? undefined,
      contactoNombre: row.contactoNombre ?? undefined,
      contactoTelefono: row.contactoTelefono ?? undefined,
      telefono: row.telefono ?? undefined,
      correoElectronico: row.correoElectronico ?? undefined,
      correosOpcionales: row.correosOpcionales ?? undefined,
      puntosAcumulados: row.puntosAcumulados,
      activo: row.activo,
      habilitado: row.habilitado,
      etiquetas: row.etiquetas,
      customerTypeId: row.customerTypeId ?? null,
      zoneId: row.zoneId ?? null,
      vendedorAsignadoId: row.vendedorAsignadoId ?? null,
      addresses: row.addresses,
    });
    this.extraAddresses.set(row.addresses.filter((x) => !x.esPrincipal));
    void this.ensureUbigeoCatalogs();
  }

  protected closeFormModal() {
    if (this.saveMutation.isPending()) return;
    this.formOpen.set(false);
    this.resetForm();
  }

  protected setTab(tab: string) {
    this.activeTab.set(tab as CustomerTab);
  }

  protected async submitForm() {
    const body = this.form();
    const mainAddress: CustomerAddressDto = {
      esPrincipal: true,
      pais: 'PERU',
      departmentId: this.departmentId() || null,
      provinceId: this.provinceId() || null,
      districtId: this.districtId() || null,
      direccion: body.addresses?.[0]?.direccion ?? null,
      telefono: body.addresses?.[0]?.telefono ?? null,
      correoElectronico: body.addresses?.[0]?.correoElectronico ?? null,
      correosOpcionales: body.addresses?.[0]?.correosOpcionales ?? null,
    };
    const payload: CreateCustomerRequest = {
      ...body,
      addresses: [mainAddress, ...this.extraAddresses()],
    };

    const validation = await this.validateCustomerPayload(payload);
    if (validation.length) {
      this.notify.warning(validation.join('\n'));
      return;
    }

    const id = this.editing()?.id;
    this.saveMutation.mutate({ id, body: payload });
  }

  protected onDepartmentChange(v: string) {
    this.departmentId.set(v);
    this.provinceId.set('');
    this.districtId.set('');
  }

  protected onProvinceChange(v: string) {
    this.provinceId.set(v);
    this.districtId.set('');
  }

  protected addExtraAddress() {
    const addr = this.extraAddress();
    if (!addr.direccion?.trim() && !addr.telefono?.trim() && !addr.correoElectronico?.trim()) {
      this.notify.warning('Ingrese datos para agregar la dirección.');
      return;
    }
    this.extraAddresses.update((prev) => [...prev, { ...addr, esPrincipal: false }]);
    this.extraAddress.set({ pais: 'PERU' });
  }

  protected removeExtraAddress(index: number) {
    this.extraAddresses.update((prev) => prev.filter((_, i) => i !== index));
  }

  protected updateMainAddressField(key: keyof CustomerAddressDto, value: string) {
    this.form.update((f) => {
      const base = f.addresses?.[0] ?? { esPrincipal: true, pais: 'PERU' };
      return { ...f, addresses: [{ ...base, [key]: value }] };
    });
  }

  protected updateFormField<K extends keyof CreateCustomerRequest>(key: K, value: CreateCustomerRequest[K]) {
    this.form.update((prev) => ({ ...prev, [key]: value }));
  }

  protected onDocumentTypeChange(value: string) {
    this.updateFormField('tipoDocumento', value as CreateCustomerRequest['tipoDocumento']);
  }

  protected openDeleteModal(row: CustomerItemDto) {
    this.selected.set(row);
    this.deleteOpen.set(true);
  }

  protected confirmDelete() {
    const row = this.selected();
    if (!row || this.deleteMutation.isPending()) return;
    this.deleteMutation.mutate(row.id);
  }

  protected toggleStatus(row: CustomerItemDto) {
    if (this.statusMutation.isPending()) return;
    this.statusMutation.mutate({ id: row.id, habilitado: !row.habilitado });
  }

  protected openBarcodeModal(row: CustomerItemDto) {
    this.selected.set(row);
    this.barcodeValue.set(row.codigoBarra ?? '');
    this.barcodeOpen.set(true);
  }

  protected submitBarcode() {
    const row = this.selected();
    if (!row) return;
    const codigoBarra = this.barcodeValue().trim();
    const valid = this.validateBarcode(codigoBarra);
    if (!valid.ok) {
      this.notify.warning(valid.message);
      return;
    }
    this.barcodeMutation.mutate({ id: row.id, codigoBarra });
  }

  protected openTagsModal(row: CustomerItemDto) {
    this.selected.set(row);
    this.tagsValue.set((row.etiquetas ?? []).join(', '));
    this.tagsOpen.set(true);
  }

  protected submitTags() {
    const row = this.selected();
    if (!row) return;
    const etiquetas = this.tagsValue().split(',').map((x) => x.trim()).filter(Boolean);
    const valid = this.validateTags(etiquetas);
    if (!valid.ok) {
      this.notify.warning(valid.message);
      return;
    }
    this.tagsMutation.mutate({ id: row.id, etiquetas });
  }

  protected openImportModal() {
    this.importOpen.set(true);
    this.importFile.set(null);
  }

  protected onImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.importFile.set(input.files?.[0] ?? null);
  }

  protected async downloadImportTemplate() {
    try {
      const blob = await firstValueFrom(this.api.downloadCustomerImportTemplate());
      this.downloadBlob(blob, 'clientes-formato.xlsx');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo descargar formato'));
    }
  }

  protected processImport() {
    const file = this.importFile();
    const valid = this.validateImport(file);
    if (!valid.ok) {
      this.notify.warning(valid.message);
      return;
    }
    this.importMutation.mutate(file as File);
  }

  protected openExportModal() {
    this.exportForm.set({ period: 'month', month: this.currentMonth() });
    this.exportOpen.set(true);
  }

  protected updateExportField<K extends keyof ExportCustomersRequest>(key: K, value: ExportCustomersRequest[K]) {
    this.exportForm.update((prev) => ({ ...prev, [key]: value }));
  }

  protected onExportPeriodChange(value: string) {
    this.updateExportField('period', value as ExportCustomersRequest['period']);
  }

  protected async processExport() {
    const valid = this.validateExport(this.exportForm());
    if (!valid.ok) {
      this.notify.warning(valid.message);
      return;
    }
    try {
      const blob = await firstValueFrom(this.api.exportCustomers(this.exportForm()));
      this.downloadBlob(blob, 'clientes-export.xlsx');
      this.exportOpen.set(false);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar clientes'));
    }
  }

  protected customerTypeLabel(row: CustomerItemDto): string {
    return row.customerType?.descripcion ?? '—';
  }

  protected departmentLabel(row: CustomerItemDto): string {
    const id = row.addresses[0]?.departmentId;
    const found = this.departmentsQuery.data()?.find((x) => x.id === id);
    return found?.name ?? '—';
  }

  protected provinceLabel(row: CustomerItemDto): string {
    return row.addresses[0]?.provinceId ?? '—';
  }

  protected districtLabel(row: CustomerItemDto): string {
    return row.addresses[0]?.districtId ?? '—';
  }

  protected documentLabel(row: CustomerItemDto): string {
    return this.documentTypesQuery.data()?.find((x) => x.value === row.tipoDocumento)?.label ?? row.tipoDocumento;
  }

  protected async refetchRows() {
    const r = await this.listQuery.refetch();
    if (r.isError) {
      this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el listado.'));
    }
  }

  private resetForm() {
    this.departmentId.set('');
    this.provinceId.set('');
    this.districtId.set('');
    this.extraAddress.set({ pais: 'PERU' });
    this.extraAddresses.set([]);
    this.form.set({
      nombre: '',
      nombreComercial: '',
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nacionalidad: 'PERU',
      diasCredito: 0,
      codigoInterno: '',
      codigoBarra: '',
      observaciones: '',
      sitioWeb: '',
      contactoNombre: '',
      contactoTelefono: '',
      telefono: '',
      correoElectronico: '',
      correosOpcionales: '',
      puntosAcumulados: 0,
      activo: true,
      habilitado: true,
      etiquetas: [],
      customerTypeId: null,
      zoneId: null,
      vendedorAsignadoId: null,
      addresses: [{ esPrincipal: true, pais: 'PERU' }],
    });
  }

  private currentMonth() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${m}/${d.getFullYear()}`;
  }

  private downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private async validateCustomerPayload(payload: CreateCustomerRequest): Promise<string[]> {
    try {
      await customerCreateSchema.validate(payload, { abortEarly: false });
      return [];
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const messages = [...new Set(err.errors.map((x) => x.trim()).filter(Boolean))];
        return messages.length ? messages : ['Formulario inválido.'];
      }
      return ['No se pudo validar el formulario.'];
    }
  }

  private async ensureUbigeoCatalogs(): Promise<void> {
    const dep = await this.departmentsQuery.refetch();
    if (dep.isError) {
      this.notify.error(httpErrorMessage(dep.error, 'No se pudo cargar departamentos.'));
      return;
    }
    if (this.departmentId()) {
      const prov = await this.provincesQuery.refetch();
      if (prov.isError) {
        this.notify.error(httpErrorMessage(prov.error, 'No se pudo cargar provincias.'));
        return;
      }
    }
    if (this.provinceId()) {
      const dist = await this.districtsQuery.refetch();
      if (dist.isError) {
        this.notify.error(httpErrorMessage(dist.error, 'No se pudo cargar distritos.'));
      }
    }
  }

  private validateTags(etiquetas: string[]): { ok: boolean; message: string } {
    try {
      tagsSchema.validateSync({ etiquetas }, { abortEarly: false });
      return { ok: true, message: '' };
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return { ok: false, message: err.errors[0] ?? 'Etiquetas inválidas' };
      }
      return { ok: false, message: 'No se pudo validar etiquetas' };
    }
  }

  private validateBarcode(codigoBarra: string): { ok: boolean; message: string } {
    try {
      barcodeSchema.validateSync({ codigoBarra }, { abortEarly: false });
      return { ok: true, message: '' };
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return { ok: false, message: err.errors[0] ?? 'Código de barra inválido' };
      }
      return { ok: false, message: 'No se pudo validar código de barra' };
    }
  }

  private validateImport(file: File | null): { ok: boolean; message: string } {
    try {
      importSchema.validateSync({ file }, { abortEarly: false });
      return { ok: true, message: '' };
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return { ok: false, message: err.errors[0] ?? 'Archivo inválido' };
      }
      return { ok: false, message: 'No se pudo validar archivo' };
    }
  }

  private validateExport(body: ExportCustomersRequest): { ok: boolean; message: string } {
    try {
      exportSchema.validateSync(body, { abortEarly: false });
      const monthRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
      if (body.period === 'month' && !monthRegex.test(body.month ?? '')) {
        return { ok: false, message: 'Para "Por mes", ingrese Mes de en formato MM/YYYY.' };
      }
      if (body.period === 'between-months') {
        if (!monthRegex.test(body.fromMonth ?? '') || !monthRegex.test(body.toMonth ?? '')) {
          return { ok: false, message: 'Para "Entre meses", use formato MM/YYYY en ambos campos.' };
        }
      }
      if (body.period === 'seller' && !body.sellerId?.trim()) {
        return { ok: false, message: 'Para "Vendedor", seleccione un vendedor.' };
      }
      return { ok: true, message: '' };
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return { ok: false, message: err.errors[0] ?? 'Parámetros de exportación inválidos' };
      }
      return { ok: false, message: 'No se pudo validar exportación' };
    }
  }
}
