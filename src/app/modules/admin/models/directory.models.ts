/** Respuestas alineadas con la API Nest (`UserSnapshot`, establecimientos, árbol de permisos). */

export type UserRoleDto =
  | 'SUPER_ADMIN'
  | 'ADMIN_CADENA'
  | 'GERENTE_SUCURSAL'
  | 'FARMACEUTICO_TITULAR'
  | 'FARMACEUTICO'
  | 'TECNICO_FARMACEUTICO'
  | 'CAJERO'
  | 'ALMACENERO'
  | 'CONTADOR'
  | 'ADMINISTRADOR'
  | 'VENDEDOR';

export type IdentityDocumentTypeDto = 'DNI' | 'CE' | 'PASAPORTE' | 'OTRO';

/** Cuerpo POST /api/users (CreateUserDto). Fechas como ISO string para `class-transformer`. */
export interface CreateUserProfileBody {
  tipoDocumento?: IdentityDocumentTypeDto;
  numeroDocumento?: string;
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  emailPersonal?: string;
  direccion?: string;
  celularPersonal?: string;
  emailCorporativo?: string;
  celularCorporativo?: string;
  fechaContratacion?: string;
  cargo?: string;
  fotoUrl?: string;
  fotoArchivoId?: string | null;
}

export interface CreateUserRequest {
  nombre: string;
  email: string;
  password: string;
  role: UserRoleDto;
  establecimientoId: string;
  profile?: CreateUserProfileBody;
  permissionCodes?: string[];
}

export interface UpdateUserRequest {
  nombre?: string;
  email?: string;
  password?: string;
  role?: UserRoleDto;
  establecimientoId?: string;
  profile?: CreateUserProfileBody;
  permissionCodes?: string[];
}

export interface UpdateUserPermissionsRequest {
  permissionCodes: string[];
}

export interface UserProfileDto {
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  nombres: string | null;
  apellidos: string | null;
  fechaNacimiento: string | null;
  emailPersonal: string | null;
  direccion: string | null;
  celularPersonal: string | null;
  emailCorporativo: string | null;
  celularCorporativo: string | null;
  fechaContratacion: string | null;
  cargo: string | null;
  fotoArchivoId: string | null;
  fotoUrl: string | null;
}

export interface UserListItemDto {
  id: string;
  nombre: string;
  email: string;
  role: UserRoleDto;
  establecimientoId: string;
  establecimientoNombre: string;
  permissionCodes: string[];
  profile: UserProfileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListFiltersRequest {
  search?: string;
  role?: UserRoleDto | 'all';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type UserListResponseDto = PaginatedResponseDto<UserListItemDto>;

export interface EstablishmentOptionDto {
  id: string;
  nombre: string;
  codigo: string | null;
  activo?: boolean;
  pais?: string;
  departmentId?: string | null;
  provinceId?: string | null;
  districtId?: string | null;
  direccionFiscal?: string | null;
  direccionComercial?: string | null;
  telefono?: string | null;
  correoContacto?: string | null;
  direccionWeb?: string | null;
  informacionAdicional?: string | null;
  urlImpresora?: string | null;
  nombreImpresora?: string | null;
  clienteDefault?: string | null;
  logoArchivoId?: string | null;
  sujetoIgv31556?: boolean;
  esHospital?: boolean;
  inventoryValuationMethod?: 'PEPS' | 'PROMEDIO_PONDERADO';
  inventoryLotAllocationMethod?: 'FEFO' | 'FIFO';
  blockExpiredProductSales?: boolean;
  adjustmentQtyThreshold?: string;
  posYapeNumero?: string | null;
  posPlinNumero?: string | null;
}

export interface EstablishmentListFiltersRequest {
  search?: string;
  hospital?: 'all' | 'hospital' | 'no-hospital';
  page?: number;
  pageSize?: number;
}

export type EstablishmentListResponseDto = PaginatedResponseDto<EstablishmentOptionDto>;

export interface PosPaymentSettingsDto {
  id: string;
  nombre: string;
  posYapeNumero: string | null;
  posPlinNumero: string | null;
}

export interface BillingProviderOptionDto {
  value: BillingProviderType;
  label: string;
  available: boolean;
}

/** Perfil comercial + fiscal del establecimiento activo. */
export type SalePdfFormat = 'TICKET_80' | 'TICKET_58' | 'A4';

export interface SalePdfFormatOptionDto {
  value: SalePdfFormat;
  label: string;
}

export interface PharmacyProfileDto {
  establishmentId: string;
  tenantId: string;
  tenantNombre: string;
  tenantRuc: string | null;
  nombre: string;
  codigo: string | null;
  pais: string;
  departmentId: string | null;
  provinceId: string | null;
  districtId: string | null;
  direccionFiscal: string | null;
  direccionComercial: string | null;
  telefono: string | null;
  correoContacto: string | null;
  direccionWeb: string | null;
  informacionAdicional: string | null;
  numeroRegistroDigemid: string | null;
  logoArchivoId: string | null;
  logoUrl: string | null;
  salePdfFormat: SalePdfFormat;
  salePdfFormatOptions: SalePdfFormatOptionDto[];
  rucEmisor: string | null;
  razonSocialEmisor: string | null;
  billingProvider: BillingProviderType;
  apiUrl: string | null;
  consultaApiUrl: string | null;
  modoSandbox: boolean;
  autoEmitOnSale: boolean;
  emitNotaVenta: boolean;
  applyDetraccion: boolean;
  autoEmitGuiaOnTransfer: boolean;
  hasOseCredentials: boolean;
  electronicInvoicingEnabled: boolean;
  billingCapabilities: BillingProviderCapabilitiesDto | null;
  billingProviderOptions: BillingProviderOptionDto[];
}

export interface UpdatePharmacyProfileRequest {
  nombre?: string;
  codigo?: string;
  rucEmisor?: string;
  razonSocialEmisor?: string;
  billingProvider?: BillingProviderType;
  apiUrl?: string;
  consultaApiUrl?: string;
  apiToken?: string;
  modoSandbox?: boolean;
  autoEmitOnSale?: boolean;
  emitNotaVenta?: boolean;
  applyDetraccion?: boolean;
  autoEmitGuiaOnTransfer?: boolean;
  direccionFiscal?: string;
  direccionComercial?: string;
  telefono?: string;
  correoContacto?: string;
  direccionWeb?: string;
  informacionAdicional?: string;
  departmentId?: string | null;
  provinceId?: string | null;
  districtId?: string | null;
  logoArchivoId?: string | null;
  salePdfFormat?: SalePdfFormat;
  numeroRegistroDigemid?: string | null;
}

export interface DashboardInventoryAlertsDto {
  stockBajo: number;
  lotesVencidos: number;
  porVencer30: number;
  porVencer60: number;
  porVencer90: number;
  zonasFrioSinLogHoy: number;
}

export interface DashboardStatsDto {
  usersActive: number;
  establishmentsActive: number;
  customersActive: number;
  productsActive: number;
  inventoryAlerts: DashboardInventoryAlertsDto;
}

export interface ChainSummaryEstablishmentDto {
  establishmentId: string;
  nombre: string;
  codigo: string | null;
  ventas30d: number;
  totalVentas30d: string;
  unidadesStock: string;
}

export interface DashboardChainSummaryDto {
  periodDays: number;
  establishments: ChainSummaryEstablishmentDto[];
}

export interface DashboardSalesTrendPointDto {
  date: string;
  label: string;
  total: string;
  count: number;
}

export interface DashboardSalesTrendDto {
  periodDays: number;
  points: DashboardSalesTrendPointDto[];
}

export interface ManagerDashboardDto {
  ventasHoy: string;
  ventasHoyCount: number;
  ventasSemana: string;
  ventasSemanaCount: number;
  anulacionesPendientes: number;
  cajasAbiertas: number;
  personalPresente: number;
}

export interface PharmacistDashboardDto {
  recetasPendientes: number;
  anulacionesPendientes: number;
  productosControladosActivos: number;
}

export interface CashierDashboardDto {
  ventasHoy: string;
  ventasHoyCount: number;
  cajaAbierta: boolean;
  sesionCaja: { id: string; openedAt: string; montoApertura: string } | null;
}

export interface RoleTemplateDto {
  role: UserRoleDto;
  label: string;
  navPermissionCodes: string[];
}

export interface StaffWorkScheduleRowDto {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  activo: boolean;
}

export interface StaffAttendanceItemDto {
  id: string;
  userId: string;
  user: { id: string; nombre: string };
  checkInAt: string;
  checkOutAt: string | null;
  notas: string | null;
}

export type StaffLeaveTypeDto = 'VACACIONES' | 'LICENCIA_MEDICA' | 'PERMISO' | 'OTRO';
export type StaffLeaveStatusDto = 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';

export interface StaffLeaveItemDto {
  id: string;
  tipo: StaffLeaveTypeDto;
  estado: StaffLeaveStatusDto;
  fromDate: string;
  toDate: string;
  notas: string | null;
  user: { id: string; nombre: string };
}

export interface StaffProductivityEmployeeDto {
  userId: string;
  nombre: string;
  role: UserRoleDto;
  ventasCount: number;
  ventasTotal: string;
  commissionPercent: string;
  comisionEstimada: string;
}

export interface StaffProductivityReportDto {
  from: string;
  to: string;
  employees: StaffProductivityEmployeeDto[];
}

export interface SaleVoidRequestDto {
  id: string;
  saleId: string;
  reason: string;
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  rejectedReason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  sale: { id: string; serie: string | null; numero: string | null; total: string; sellerId: string | null };
  requestedBy: { id: string; nombre: string };
  approvedBy: { id: string; nombre: string } | null;
}

export interface AuditLogItemDto {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  diff: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type AuditLogListResponseDto =
  | PaginatedResponseDto<AuditLogItemDto>
  | { items: AuditLogItemDto[]; nextCursor: string | null; pageSize: number };

export interface PermissionMenuNodeDto {
  id: string;
  code: string;
  label: string | null;
  children: { id: string; code: string; label: string | null }[];
}

export type EstablishmentSeriesDocumentTypeDto =
  | 'FACTURA_ELECTRONICA'
  | 'BOLETA_VENTA_ELECTRONICA'
  | 'NOTA_CREDITO'
  | 'NOTA_DEBITO'
  | 'GUIA_REMISION_REMITENTE'
  | 'COMPROBANTE_RETENCION_ELECTRONICA'
  | 'GUIA_REMISION_TRANSPORTISTA'
  | 'COMPROBANTE_PERCEPCION_ELECTRONICA'
  | 'NOTA_VENTA'
  | 'LIQUIDACION_COMPRA'
  | 'GUIA_INGRESO_ALMACEN'
  | 'GUIA_SALIDA_ALMACEN'
  | 'GUIA_TRANSFERENCIA_ALMACEN';

export interface EstablishmentDocumentTypeOptionDto {
  value: EstablishmentSeriesDocumentTypeDto;
  label: string;
}

export interface UbigeoDepartmentDto {
  id: string;
  name: string;
}

export interface UbigeoProvinceDto {
  id: string;
  name: string;
  departmentId: string;
}

export interface UbigeoDistrictDto {
  id: string;
  name: string;
  provinceId: string;
}

export interface CreateEstablishmentRequest {
  nombre: string;
  codigo?: string;
  activo?: boolean;
  pais?: string;
  departmentId?: string;
  provinceId?: string;
  districtId?: string;
  direccionFiscal?: string;
  direccionComercial?: string;
  telefono?: string;
  correoContacto?: string;
  direccionWeb?: string;
  informacionAdicional?: string;
  urlImpresora?: string;
  nombreImpresora?: string;
  clienteDefault?: string;
  logoArchivoId?: string;
  sujetoIgv31556?: boolean;
  esHospital?: boolean;
  inventoryValuationMethod?: 'PEPS' | 'PROMEDIO_PONDERADO';
  inventoryLotAllocationMethod?: 'FEFO' | 'FIFO';
  blockExpiredProductSales?: boolean;
  adjustmentQtyThreshold?: number;
  posYapeNumero?: string;
  posPlinNumero?: string;
}

export type UpdateEstablishmentRequest = Partial<CreateEstablishmentRequest>;

export type SaleLotAllocationMode = 'AUTO' | 'MANUAL';

export interface SaleLotAllocationPreviewRequest {
  productId: string;
  warehouseId: string;
  quantity: number;
  mode?: SaleLotAllocationMode;
  manualLots?: { lotCode: string; quantity: number }[];
}

export interface SaleLotAllocationLineDto {
  lotId: string;
  codigoLote: string;
  cantidad: string;
  fechaVencimiento: string | null;
  vencido: boolean;
}

export interface SaleLotAllocationPreviewDto {
  mode: SaleLotAllocationMode;
  quantity: string;
  metodoAsignacion: 'FEFO' | 'FIFO';
  blockExpiredProductSales: boolean;
  lotesDisponibles: {
    codigoLote: string;
    stock: string;
    fechaVencimiento: string | null;
    vencido: boolean;
  }[];
  asignacion: SaleLotAllocationLineDto[];
}

export interface DispatchSaleStockRequest extends SaleLotAllocationPreviewRequest {
  reference?: string;
  comment?: string;
}

export interface EstablishmentSeriesItemDto {
  id: string;
  documentType: EstablishmentSeriesDocumentTypeDto;
  numero: string;
  esContingencia: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEstablishmentSeriesRequest {
  documentType: EstablishmentSeriesDocumentTypeDto;
  numero: string;
  esContingencia?: boolean;
}

export interface CustomerTypeItemDto {
  id: string;
  descripcion: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTypeListFiltersRequest {
  search?: string;
  field?: 'all' | 'descripcion';
  page?: number;
  pageSize?: number;
}

export type CustomerTypeListResponseDto = PaginatedResponseDto<CustomerTypeItemDto>;

export interface CreateCustomerTypeRequest {
  descripcion: string;
}

export type UpdateCustomerTypeRequest = Partial<CreateCustomerTypeRequest>;

export interface CategoryItemDto {
  id: string;
  nombre: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNodeDto extends CategoryItemDto {
  children: CategoryTreeNodeDto[];
}

export interface CategoryListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre';
  page?: number;
  pageSize?: number;
}

export type CategoryListResponseDto = PaginatedResponseDto<CategoryItemDto>;

export interface CreateCategoryRequest {
  nombre: string;
  parentId?: string;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export interface BrandItemDto {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre';
  page?: number;
  pageSize?: number;
}

export type BrandListResponseDto = PaginatedResponseDto<BrandItemDto>;

export interface CreateBrandRequest {
  nombre: string;
}

export type UpdateBrandRequest = Partial<CreateBrandRequest>;

export interface LaboratoryItemDto {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaboratoryListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre';
  page?: number;
  pageSize?: number;
}

export type LaboratoryListResponseDto = PaginatedResponseDto<LaboratoryItemDto>;

export interface CreateLaboratoryRequest {
  nombre: string;
}

export type UpdateLaboratoryRequest = Partial<CreateLaboratoryRequest>;

export interface UnitItemDto {
  id: string;
  codigo: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnitListFiltersRequest {
  search?: string;
  field?: 'all' | 'codigo' | 'nombre';
  page?: number;
  pageSize?: number;
}

export type UnitListResponseDto = PaginatedResponseDto<UnitItemDto>;

export interface CreateUnitRequest {
  codigo: string;
  nombre: string;
}

export type UpdateUnitRequest = Partial<CreateUnitRequest>;

export interface PharmaceuticalFormItemDto {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface PharmaceuticalFormListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre';
  page?: number;
  pageSize?: number;
}

export type PharmaceuticalFormListResponseDto = PaginatedResponseDto<PharmaceuticalFormItemDto>;

export interface CreatePharmaceuticalFormRequest {
  nombre: string;
}

export type UpdatePharmaceuticalFormRequest = Partial<CreatePharmaceuticalFormRequest>;

export interface ActivePrincipleItemDto {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivePrincipleListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre';
  page?: number;
  pageSize?: number;
}

export type ActivePrincipleListResponseDto = PaginatedResponseDto<ActivePrincipleItemDto>;

export interface CreateActivePrincipleRequest {
  nombre: string;
}

export type UpdateActivePrincipleRequest = Partial<CreateActivePrincipleRequest>;

export interface AdministrationRouteItemDto {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdministrationRouteListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre';
  page?: number;
  pageSize?: number;
}

export type AdministrationRouteListResponseDto = PaginatedResponseDto<AdministrationRouteItemDto>;

export interface CreateAdministrationRouteRequest {
  nombre: string;
}

export type UpdateAdministrationRouteRequest = Partial<CreateAdministrationRouteRequest>;

export type CustomerDocumentTypeDto =
  | 'DNI'
  | 'RUC'
  | 'CE'
  | 'PASAPORTE'
  | 'DOC_SIN_RUC'
  | 'OTRO';

export interface SupplierItemDto {
  id: string;
  razonSocial: string;
  nombreComercial: string | null;
  tipoDocumento: CustomerDocumentTypeDto;
  numeroDocumento: string;
  departmentId: string | null;
  provinceId: string | null;
  districtId: string | null;
  direccion: string | null;
  telefono: string | null;
  correoElectronico: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  diasCredito: number;
  condicionesPago: string | null;
  observaciones: string | null;
  habilitado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierOptionDto {
  id: string;
  razonSocial: string;
  numeroDocumento: string;
}

export interface SupplierListFiltersRequest {
  search?: string;
  field?: 'all' | 'razonSocial' | 'numeroDocumento';
  page?: number;
  pageSize?: number;
}

export type SupplierListResponseDto = PaginatedResponseDto<SupplierItemDto>;

export interface CreateSupplierRequest {
  razonSocial: string;
  nombreComercial?: string;
  tipoDocumento: CustomerDocumentTypeDto;
  numeroDocumento: string;
  departmentId?: string;
  provinceId?: string;
  districtId?: string;
  direccion?: string;
  telefono?: string;
  correoElectronico?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  diasCredito?: number;
  condicionesPago?: string;
  observaciones?: string;
  habilitado?: boolean;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export interface SupplierProductItemDto {
  id: string;
  supplierId: string;
  productId: string;
  codigoProveedor: string | null;
  precioCompra: number | null;
  plazoDias: number | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    nombre: string;
    codigoInterno: string | null;
  };
}

export interface UpsertSupplierProductRequest {
  productId: string;
  codigoProveedor?: string;
  precioCompra?: number;
  plazoDias?: number;
}

export interface CustomerAddressDto {
  id?: string;
  esPrincipal?: boolean;
  pais?: string;
  departmentId?: string | null;
  provinceId?: string | null;
  districtId?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correoElectronico?: string | null;
  correosOpcionales?: string | null;
}

export interface CustomerZoneDto {
  id: string;
  nombre: string;
}

export interface CustomerSellerDto {
  id: string;
  nombre: string;
}

export interface CustomerCatalogOptionDto {
  value: string;
  label: string;
}

export interface CustomerItemDto {
  id: string;
  nombre: string;
  nombreComercial: string | null;
  tipoDocumento: CustomerDocumentTypeDto;
  numeroDocumento: string;
  nacionalidad: string | null;
  diasCredito: number;
  limiteCredito: number | null;
  codigoInterno: string | null;
  codigoBarra: string | null;
  observaciones: string | null;
  sitioWeb: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  telefono: string | null;
  correoElectronico: string | null;
  correosOpcionales: string | null;
  puntosAcumulados: number;
  activo: boolean;
  habilitado: boolean;
  etiquetas: string[];
  customerTypeId: string | null;
  zoneId: string | null;
  vendedorAsignadoId: string | null;
  createdAt: string;
  updatedAt: string;
  customerType?: { id: string; descripcion: string } | null;
  zone?: { id: string; nombre: string } | null;
  vendedorAsignado?: { id: string; nombre: string } | null;
  addresses: CustomerAddressDto[];
}

export interface CustomerListResponseDto {
  items: CustomerItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre' | 'numeroDocumento' | 'codigoInterno';
  customerTypeId?: string;
  zoneId?: string;
  estado?: 'all' | 'habilitado' | 'inhabilitado';
  page?: number;
  pageSize?: number;
}

export interface CreateCustomerRequest {
  nombre: string;
  nombreComercial?: string;
  tipoDocumento: CustomerDocumentTypeDto;
  numeroDocumento: string;
  nacionalidad?: string;
  diasCredito?: number;
  limiteCredito?: number | null;
  codigoInterno?: string;
  codigoBarra?: string;
  observaciones?: string;
  sitioWeb?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  telefono?: string;
  correoElectronico?: string;
  correosOpcionales?: string;
  puntosAcumulados?: number;
  activo?: boolean;
  habilitado?: boolean;
  etiquetas?: string[];
  customerTypeId?: string | null;
  zoneId?: string | null;
  vendedorAsignadoId?: string | null;
  addresses?: CustomerAddressDto[];
  lpdpConsentAccepted?: boolean;
  lpdpConsentVersion?: string;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export interface CustomerImportResultDto {
  totalRows: number;
  created: number;
  updated: number;
  errors: string[];
  preview?: boolean;
}

export interface SupplierPurchaseHistoryResponseDto {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  message: string;
}

export interface ExportCustomersRequest {
  period?: 'all' | 'month' | 'between-months' | 'seller';
  month?: string;
  fromMonth?: string;
  toMonth?: string;
  sellerId?: string;
}

export type PresentationDefaultPriceDto = 'PRECIO_1' | 'PRECIO_2' | 'PRECIO_3';

export interface ProductCatalogUnitDto {
  id: string;
  codigo: string;
  nombre: string;
}

export interface ProductCatalogCurrencyDto {
  id: string;
  codigo: string;
  nombre: string;
}

export interface ProductCatalogTaxAffectationDto {
  id: string;
  codigo: string;
  descripcion: string;
}

export interface ProductCatalogWarehouseDto {
  id: string;
  nombre: string;
  establishment: { id: string; nombre: string; codigo: string | null };
}

export interface ProductCatalogLocationDto {
  id: string;
  nombre: string;
  establishment: { id: string; nombre: string; codigo: string | null };
}

export interface CreateProductLocationRequest {
  establishmentId: string;
  nombre: string;
}

export interface ProductCatalogAttributeTypeDto {
  id: string;
  nombre: string;
}

export interface ProductCatalogIscSystemDto {
  id: string;
  codigo: string;
  nombre: string;
}

export interface ProductListItemDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  principioActivo: string | null;
  concentracion: string | null;
  formaFarmaceutica: string | null;
  codigoBusqueda: string | null;
  codigoInterno: string | null;
  codigoBarra: string | null;
  codigoSunat: string | null;
  modelo: string | null;
  lineaProducto: string | null;
  registroSanitario: string | null;
  codigoMedicamentoDigemid: string | null;
  saleTaxAffectationId: string;
  purchaseTaxAffectationId: string;
  precioUnitarioVenta: string;
  precioUnitarioCompra: string | null;
  incluyeIgvVenta: boolean;
  incluyeIgvCompra: boolean;
  tipoSistemaIscId: string | null;
  tipoSistemaIscNombre: string | null;
  porcentajeIsc: string | null;
  codigoLote: string | null;
  fechaVencimientoLote: string | null;
  numeroPuntos: string | null;
  habilitado: boolean;
  stockMinimo: number;
  marcaLaboratorio: string | null;
  marcaNombre: string | null;
  categoryId: string | null;
  brandId: string | null;
  productLocationId: string | null;
  unit: ProductCatalogUnitDto;
  currency: ProductCatalogCurrencyDto;
  totalStock: string;
}

export interface ProductListResponseDto {
  items: ProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductEquivalentItemDto {
  id: string;
  nombre: string;
  codigoInterno: string | null;
  generico: boolean;
}

export interface ProductDetailDto extends ProductListItemDto {
  generico: boolean;
  esControlado: boolean;
  esRefrigerado: boolean;
  esHospitalario: boolean;
  stockMaximo: number | null;
  administrationRouteId: string | null;
  administrationRouteNombre: string | null;
  imagenUrl: string | null;
  equivalents: ProductEquivalentItemDto[];
  necesitaRecetaMedica: boolean;
  calcularCantidadPorPrecio: boolean;
  manejaLotes: boolean;
  incluyeIscVenta: boolean;
  incluyeIscCompra: boolean;
  sujetoDetraccion: boolean;
  sePuedeCanjearPorPuntos: boolean;
  aplicaGanancia: boolean;
  porcentajeGanancia: string | null;
  costoUnitario: string | null;
  defaultWarehouseId: string | null;
  imagenArchivoId: string | null;
  warehousePrices: ProductWarehousePriceInput[];
  warehouseStocks: ProductWarehouseStockInput[];
  presentations: ProductPresentationInput[];
  attributes: ProductAttributeInput[];
  supplierLinks: ProductSupplierLinkDto[];
}

export interface ProductHistoryStockItemDto {
  warehouseId: string;
  ubicacion: string;
  stock: string;
  series: string;
}

export type ProductPriceFieldDto =
  | 'PRECIO_VENTA'
  | 'PRECIO_COMPRA'
  | 'COSTO_UNITARIO'
  | 'PRECIO_ALMACEN'
  | 'PRESENTACION_PRECIO_1'
  | 'PRESENTACION_PRECIO_2'
  | 'PRESENTACION_PRECIO_3';

export type ProductPriceChangeSourceDto = 'MANUAL' | 'IMPORT' | 'DUPLICATE';

export interface ProductPriceHistoryItemDto {
  id: string;
  productId: string;
  field: ProductPriceFieldDto;
  fieldLabel: string;
  warehouseId: string | null;
  warehouseNombre: string | null;
  presentationKey: string | null;
  previousValue: string | null;
  newValue: string;
  source: ProductPriceChangeSourceDto;
  sourceLabel: string;
  changedBy: { id: string; nombre: string; email: string } | null;
  createdAt: string;
}

export type ProductPriceHistoryListResponseDto = PaginatedResponseDto<ProductPriceHistoryItemDto>;

export interface ProductHistorySaleItemDto {
  id: string;
  saleId: string;
  fecha: string;
  documento: string;
  cliente: string | null;
  cantidad: string;
  precioUnitario: string;
  totalLinea: string;
}

export interface ProductHistoryPurchaseItemDto {
  id: string;
  purchaseOrderId: string;
  fecha: string;
  numero: string | null;
  estado: string;
  proveedor: string;
  cantidadPedida: string;
  cantidadRecibida: string;
  precioUnitario: string;
  totalLinea: string;
}

export type ProductHistorySalesListResponseDto = PaginatedResponseDto<ProductHistorySaleItemDto>;
export type ProductHistoryPurchasesListResponseDto = PaginatedResponseDto<ProductHistoryPurchaseItemDto>;

export interface ProductStockByLocationDto {
  warehouseId: string;
  ubicacion: string;
  stock: string;
}

export interface ProductStockPriceRowDto {
  id: string;
  unidad: string;
  descripcion: string;
  factor: string;
  precio1: string;
  precio2: string;
  precio3: string;
  precioDefecto: PresentationDefaultPriceDto;
}

export interface ProductStockSummaryDto {
  stockByLocation: ProductStockByLocationDto[];
  priceList: ProductStockPriceRowDto[];
}

export interface ProductListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre' | 'codigoInterno' | 'codigoBarra' | 'codigoBusqueda' | 'descripcion';
  categoryId?: string;
  brandId?: string;
  habilitado?: boolean;
  generico?: boolean;
  necesitaRecetaMedica?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProductSupplierLinkDto {
  id: string;
  supplierId: string;
  codigoProveedor: string | null;
  precioCompra: number | null;
  plazoDias: number | null;
  supplier: {
    id: string;
    razonSocial: string;
    numeroDocumento: string;
    habilitado: boolean;
  };
}

export interface UpsertProductSupplierRequest {
  supplierId: string;
  codigoProveedor?: string;
  precioCompra?: number;
  plazoDias?: number;
}

export interface ProductWarehousePriceInput {
  warehouseId: string;
  precio: number;
}

export interface ProductWarehouseStockInput {
  warehouseId: string;
  cantidad: number;
}

export interface ProductPresentationInput {
  codigoBarra?: string;
  unitId: string;
  descripcion?: string;
  factor?: number;
  precio1?: number;
  precio2?: number;
  precio3?: number;
  precioDefecto?: PresentationDefaultPriceDto;
  precioPuntos?: number;
}

export interface ProductAttributeInput {
  attributeTypeId: string;
  descripcion: string;
}

export interface CreateProductRequest {
  nombre: string;
  descripcion?: string;
  principioActivo?: string;
  concentracion?: string;
  registroSanitario?: string;
  formaFarmaceutica?: string;
  codigoBusqueda?: string;
  codigoInterno?: string;
  codigoBarra?: string;
  codigoSunat?: string;
  codigoMedicamentoDigemid?: string;
  lineaProducto?: string;
  modelo?: string;
  marcaLaboratorio?: string;
  unitId: string;
  currencyId: string;
  saleTaxAffectationId: string;
  purchaseTaxAffectationId?: string;
  precioUnitarioVenta: number;
  precioUnitarioCompra?: number;
  incluyeIgvVenta?: boolean;
  incluyeIgvCompra?: boolean;
  generico?: boolean;
  esControlado?: boolean;
  esRefrigerado?: boolean;
  esHospitalario?: boolean;
  necesitaRecetaMedica?: boolean;
  calcularCantidadPorPrecio?: boolean;
  manejaLotes?: boolean;
  incluyeIscVenta?: boolean;
  incluyeIscCompra?: boolean;
  tipoSistemaIscId?: string;
  porcentajeIsc?: number;
  sujetoDetraccion?: boolean;
  sePuedeCanjearPorPuntos?: boolean;
  numeroPuntos?: number;
  codigoLote?: string;
  fechaVencimientoLote?: string;
  aplicaGanancia?: boolean;
  porcentajeGanancia?: number;
  costoUnitario?: number;
  stockMinimo?: number;
  stockMaximo?: number;
  administrationRouteId?: string;
  categoryId?: string;
  brandId?: string;
  productLocationId?: string;
  defaultWarehouseId?: string;
  imagenArchivoId?: string;
  warehousePrices?: ProductWarehousePriceInput[];
  warehouseStocks?: ProductWarehouseStockInput[];
  presentations?: ProductPresentationInput[];
  attributes?: ProductAttributeInput[];
}

export type ProductImportMode = 'PRODUCTOS' | 'L_PRECIOS' | 'ACTUALIZAR_PRECIOS';

export interface ProductImportResultDto {
  totalRows: number;
  created: number;
  updated: number;
  errors: string[];
  preview?: boolean;
}

export interface ServiceCatalogUnitDto {
  id: string;
  codigo: string;
  nombre: string;
}

export interface ServiceCatalogCurrencyDto {
  id: string;
  codigo: string;
  nombre: string;
}

export interface ServiceCatalogTaxAffectationDto {
  id: string;
  codigo: string;
  descripcion: string;
}

export interface ServiceCatalogLocationDto {
  id: string;
  nombre: string;
  establishment: { id: string; nombre: string; codigo: string | null };
}

export interface ServiceCatalogAttributeTypeDto {
  id: string;
  nombre: string;
}

export interface ServiceCatalogIscSystemDto {
  id: string;
  codigo: string;
  nombre: string;
}

export interface ServiceListItemDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  principioActivo: string | null;
  concentracion: string | null;
  formaFarmaceutica: string | null;
  codigoBusqueda: string | null;
  codigoInterno: string | null;
  codigoBarra: string | null;
  codigoSunat: string | null;
  modelo: string | null;
  lineaProducto: string | null;
  registroSanitario: string | null;
  codigoMedicamentoDigemid: string | null;
  saleTaxAffectationId: string;
  purchaseTaxAffectationId: string;
  precioUnitarioVenta: string;
  precioUnitarioCompra: string | null;
  incluyeIgvVenta: boolean;
  incluyeIgvCompra: boolean;
  tipoSistemaIscId: string | null;
  tipoSistemaIscNombre: string | null;
  porcentajeIsc: string | null;
  numeroPuntos: string | null;
  marcaLaboratorio: string | null;
  marcaNombre: string | null;
  categoryId: string | null;
  brandId: string | null;
  productLocationId: string | null;
  habilitado: boolean;
  unit: ServiceCatalogUnitDto;
  currency: ServiceCatalogCurrencyDto;
  totalStock: string;
}

export interface ServiceListResponseDto {
  items: ServiceListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ServiceHistoryStockItemDto {
  warehouseId: string;
  ubicacion: string;
  stock: string;
  series: string;
}

export interface ServiceListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre' | 'codigoInterno' | 'codigoBarra' | 'codigoBusqueda' | 'descripcion';
  page?: number;
  pageSize?: number;
}

export interface ServiceAttributeInput {
  attributeTypeId: string;
  descripcion: string;
}

export interface CreateServiceRequest {
  nombre: string;
  descripcion?: string;
  principioActivo?: string;
  concentracion?: string;
  registroSanitario?: string;
  formaFarmaceutica?: string;
  codigoBusqueda?: string;
  codigoInterno?: string;
  codigoBarra?: string;
  codigoSunat?: string;
  codigoMedicamentoDigemid?: string;
  lineaProducto?: string;
  modelo?: string;
  marcaLaboratorio?: string;
  unitId?: string;
  currencyId: string;
  saleTaxAffectationId: string;
  purchaseTaxAffectationId?: string;
  precioUnitarioVenta: number;
  precioUnitarioCompra?: number;
  incluyeIgvVenta?: boolean;
  incluyeIgvCompra?: boolean;
  generico?: boolean;
  necesitaRecetaMedica?: boolean;
  incluyeIscVenta?: boolean;
  incluyeIscCompra?: boolean;
  tipoSistemaIscId?: string;
  porcentajeIsc?: number;
  sujetoDetraccion?: boolean;
  sePuedeCanjearPorPuntos?: boolean;
  numeroPuntos?: number;
  categoryId?: string;
  brandId?: string;
  productLocationId?: string;
  imagenArchivoId?: string;
  attributes?: ServiceAttributeInput[];
}

export interface CompoundProductCatalogPlatformDto {
  id: string;
  nombre: string;
}

export interface CompoundProductListItemDto {
  id: string;
  nombre: string;
  nombreSecundario: string | null;
  descripcion: string | null;
  modelo: string | null;
  codigoSunat: string | null;
  codigoInterno: string | null;
  precioUnitarioVenta: string;
  precioUnitarioCompra: string;
  totalPrecioCompraReferencia: string;
  incluyeIgvVenta: boolean;
  categoryId: string | null;
  brandId: string | null;
  marcaNombre: string | null;
  imagenArchivoId: string | null;
  unit: ProductCatalogUnitDto;
  currency: ProductCatalogCurrencyDto;
}

export interface CompoundProductDetailItemDto {
  id: string;
  productId: string;
  cantidad: string;
  precioUnitario: string;
  total: string;
  product: {
    id: string;
    nombre: string;
    codigoInterno: string | null;
    descripcion: string | null;
    precioUnitarioVenta: string;
  };
}

export interface CompoundProductDetailDto extends CompoundProductListItemDto {
  saleTaxAffectationId: string;
  plataformaId: string | null;
  items: CompoundProductDetailItemDto[];
}

export interface CompoundProductListResponseDto {
  items: CompoundProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CompoundProductListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre' | 'codigoInterno' | 'descripcion';
  page?: number;
  pageSize?: number;
}

export interface CompoundProductItemInput {
  productId: string;
  cantidad: number;
  precioUnitario?: number;
}

export interface CreateCompoundProductRequest {
  nombre: string;
  nombreSecundario?: string;
  descripcion?: string;
  modelo?: string;
  unitId: string;
  currencyId: string;
  saleTaxAffectationId: string;
  precioUnitarioVenta: number;
  incluyeIgvVenta?: boolean;
  plataformaId?: string;
  codigoSunat?: string;
  codigoInterno?: string;
  precioUnitarioCompra: number;
  totalPrecioCompraReferencia?: number;
  categoryId?: string;
  brandId?: string;
  imagenArchivoId?: string;
  items: CompoundProductItemInput[];
}

export type CompoundProductImportMode =
  | 'PRODUCTOS_COMPUESTOS'
  | 'DETALLE_PRODUCTOS_COMPUESTOS';

export type ProductSerialStatus = 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'ANULADO';

export interface SeriesListItemDto {
  id: string;
  serie: string;
  fecha: string;
  estado: ProductSerialStatus;
  vendido: boolean;
  product: {
    id: string;
    nombre: string;
    codigoInterno: string | null;
  };
}

export interface SeriesListResponseDto {
  items: SeriesListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SeriesListFiltersRequest {
  search?: string;
  field?: 'all' | 'serie' | 'producto' | 'estado';
  page?: number;
  pageSize?: number;
}

export interface InventoryMovementListItemDto {
  id: string;
  productId: string;
  producto: string;
  codigoInterno: string | null;
  marca: string;
  almacen: string;
  stock: string;
}

export interface InventoryMovementListResponseDto {
  items: InventoryMovementListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventoryMovementListFiltersRequest {
  search?: string;
  field?: 'all' | 'producto' | 'marca' | 'almacen';
  page?: number;
  pageSize?: number;
}

export interface InventoryWarehouseOptionDto {
  id: string;
  nombre: string;
  establishment: {
    id: string;
    nombre: string;
    codigo: string | null;
  };
}

export interface InventoryTransferReasonOptionDto {
  id: string;
  codigo: string;
  nombre: string;
}

export type InventoryLotSearchMode = 'INBOUND' | 'OUTBOUND';

export interface InventoryLotCodeOptionDto {
  id: string;
  codigoLote: string;
  stock: string;
  fechaVencimiento: string | null;
}

export interface InventoryCreateInboundRequest {
  productId: string;
  warehouseId: string;
  transferReasonId: string;
  quantity: number;
  lotCode?: string;
  expirationDate?: string;
  registeredAt?: string;
  comment?: string;
}

export interface InventoryCreateOutboundRequest {
  productId: string;
  warehouseId: string;
  transferReasonId: string;
  quantity: number;
  lotCode?: string;
  registeredAt?: string;
  comment?: string;
}

export type InventoryImportMode = 'LOTES' | 'SERIES';

export interface InventoryLotListItemDto {
  id: string;
  productId: string;
  producto: string;
  codigoInterno: string | null;
  categoria: string;
  almacen: string;
  establecimiento: string;
  codigoLote: string;
  stock: string;
  costoUnitario: string | null;
  fechaVencimiento: string | null;
  stockMinimo: number;
}

export type InventoryLotListResponseDto = PaginatedResponseDto<InventoryLotListItemDto>;

export interface InventoryLotListFiltersRequest {
  search?: string;
  field?: 'all' | 'producto' | 'lote' | 'almacen';
  warehouseId?: string;
  establishmentId?: string;
  categoryId?: string;
  expiryFilter?: 'all' | 'expired' | '30' | '60' | '90';
  page?: number;
  pageSize?: number;
}

/** hot = operativo; archived = cold storage; all = hot table incl. marcados archivedAt */
export type DataStorageMode = 'hot' | 'archived' | 'all';

export interface KardexLineDto {
  id: string;
  fecha: string;
  tipo: string | null;
  motivo: string | null;
  almacen: string | null;
  lote: string | null;
  cantidad: string;
  saldo: string | null;
  costoUnitario: string | null;
  valorLinea: string | null;
  referencia: string | null;
  comentario: string | null;
  usuario: string | null;
  storage?: DataStorageMode | 'hot' | 'archived';
  archivedAt?: string | null;
  fromColdStorage?: boolean;
}

export type KardexListResponseDto = PaginatedResponseDto<KardexLineDto>;

export interface KardexFiltersRequest {
  productId: string;
  warehouseId?: string;
  from?: string;
  to?: string;
  storage?: DataStorageMode;
  page?: number;
  pageSize?: number;
}

export interface InventoryTransferItemDto {
  id: string;
  cantidad: string;
  codigoLote: string | null;
  product: { id: string; nombre: string; codigoInterno: string | null };
}

export interface InventoryTransferDto {
  id: string;
  estado: 'BORRADOR' | 'EN_TRANSITO' | 'RECIBIDO' | 'ANULADO';
  guiaNumero: string | null;
  comentario: string | null;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  createdAt: string;
  fromWarehouse: { id: string; nombre: string };
  toWarehouse: { id: string; nombre: string };
  user: { nombre: string } | null;
  items: InventoryTransferItemDto[];
}

export type InventoryTransferListResponseDto = PaginatedResponseDto<InventoryTransferDto>;

export interface InventoryTransferListFiltersRequest {
  estado?: 'BORRADOR' | 'EN_TRANSITO' | 'RECIBIDO' | 'ANULADO';
  warehouseId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateInventoryTransferRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  guiaNumero?: string;
  comentario?: string;
  items: {
    productId: string;
    codigoLote?: string;
    cantidad: number;
    costoUnitario?: number;
  }[];
}

export interface CreateInventoryAdjustmentRequest {
  productId: string;
  warehouseId: string;
  countedQuantity: number;
  lotCode?: string;
  reason: string;
}

export interface InventoryAdjustmentResultDto {
  ok: boolean;
  applied?: boolean;
  pendingApproval?: boolean;
  pendingId?: string;
  message: string;
}

export interface InventoryPendingAdjustmentDto {
  id: string;
  cantidadAjuste: string;
  codigoLote: string | null;
  motivo: string;
  createdAt: string;
  product: { id: string; nombre: string; codigoInterno: string | null };
  warehouse: { id: string; nombre: string };
  requestedBy: { id: string; nombre: string };
}

export interface InventoryValuationRowDto {
  productId: string;
  producto: string;
  codigoInterno: string | null;
  almacen: string;
  establecimiento: string;
  metodoValoracion: 'PEPS' | 'PROMEDIO_PONDERADO';
  stock: string;
  costoUnitario: string;
  valorTotal: string;
}

export interface InventoryValuationReportResponseDto extends PaginatedResponseDto<InventoryValuationRowDto> {
  valorTotalPagina: string;
}

export interface InventoryValuationFiltersRequest {
  warehouseId?: string;
  establishmentId?: string;
  page?: number;
  pageSize?: number;
}

export interface InventoryPhysicalCountListItemDto {
  id: string;
  estado: string;
  fecha: string;
  comentario: string | null;
  almacen: string;
  usuario: string | null;
  itemsCount: number;
}

export interface InventoryPhysicalCountDetailDto {
  id: string;
  estado: string;
  comentario: string | null;
  almacen: string;
  warehouseId: string;
  usuario: string | null;
  items: {
    id: string;
    productId: string;
    producto: string;
    codigoInterno: string | null;
    codigoLote: string | null;
    stockSistema: string;
    stockContado: string;
    diferencia: string;
  }[];
}

export interface CreatePhysicalCountRequest {
  warehouseId: string;
  comentario?: string;
}

export interface UpsertPhysicalCountItemRequest {
  productId: string;
  codigoLote?: string;
  stockContado: number;
}

export interface WarehouseZoneDto {
  id: string;
  nombre: string;
  tipo: 'NORMAL' | 'REFRIGERADO' | 'CONTROLADO';
  activo: boolean;
  warehouse?: { id: string; nombre: string };
}

export interface CreateWarehouseZoneRequest {
  warehouseId: string;
  nombre: string;
  tipo: 'NORMAL' | 'REFRIGERADO' | 'CONTROLADO';
}

export interface ColdChainTemperatureLogDto {
  id: string;
  fecha: string;
  temperaturaCelsius: string;
  observacion: string | null;
  user?: { nombre: string };
}

export interface CreateTemperatureLogRequest {
  warehouseZoneId: string;
  temperaturaCelsius: number;
  observacion?: string;
  fecha?: string;
}

export type SaleDocumentType = 'BOLETA' | 'FACTURA' | 'NOTA_VENTA' | 'TICKET';
export type PaymentMethod =
  | 'EFECTIVO'
  | 'TARJETA'
  | 'YAPE'
  | 'PLIN'
  | 'TRANSFERENCIA'
  | 'CREDITO'
  | 'MIXTO';
export type SaleStatus = 'COMPLETADA' | 'ANULADA' | 'PARCIALMENTE_DEVUELTA';
export type CashMovementType = 'APERTURA' | 'CIERRE' | 'INGRESO' | 'EGRESO' | 'VENTA' | 'DEVOLUCION';
export type QuotationStatus = 'BORRADOR' | 'ENVIADA' | 'CONVERTIDA' | 'VENCIDA' | 'ANULADA';

export interface PosCatalogItemDto {
  id: string;
  nombre: string;
  codigoInterno: string | null;
  codigoBarra: string | null;
  precio: string;
  /** Stock realmente vendible (lotes elegibles si maneja lotes). */
  stock: string;
  /** Stock total en almacén (puede diferir si hay lotes vencidos o desincronización). */
  warehouseStock?: string;
  necesitaRecetaMedica: boolean;
  manejaLotes: boolean;
  esControlado: boolean;
  imagenArchivoId?: string | null;
}

export interface PosSubstituteItemDto {
  id: string;
  nombre: string;
  codigoInterno: string | null;
  generico: boolean;
  precio: string;
  stock: string;
}

export interface PharmaApproverDto {
  id: string;
  nombre: string;
  role: string;
}

export type DrugInteractionSeverity = 'LEVE' | 'MODERADA' | 'GRAVE';

export interface SaleInteractionAlertDto {
  severidad: DrugInteractionSeverity;
  principioA: string;
  principioB: string;
  descripcion: string;
  recomendacion: string | null;
  productos: { id: string; nombre: string; principioActivo: string }[];
}

export interface SaleInteractionsCheckDto {
  hasAlerts: boolean;
  alerts: SaleInteractionAlertDto[];
  missingPrinciples: { id: string; nombre: string }[];
}

export interface SaleListItemDto {
  id: string;
  documentType: SaleDocumentType;
  serie: string | null;
  numero: string | null;
  estado: SaleStatus;
  subtotal: string;
  descuentoTotal: string;
  igvTotal: string;
  total: string;
  createdAt: string;
  archivedAt?: string | null;
  storage?: DataStorageMode | 'hot' | 'archived';
  customer: { id: string; nombre: string } | null;
  seller: { id: string; nombre: string } | null;
  /** Estado SUNAT del CPE asociado, o null si aún no se emitió. */
  sunatStatus?: SunatDocumentStatus | null;
  electronicDocumentId?: string | null;
  canEmitCpe?: boolean;
  canConvertToCpe?: boolean;
  canReturn?: boolean;
  canDebit?: boolean;
  emitBlockedReason?: string | null;
  convertBlockedReason?: string | null;
  returnBlockedReason?: string | null;
  debitBlockedReason?: string | null;
}

export interface SaleDetailDto {
  id: string;
  documentType: SaleDocumentType;
  serie: string | null;
  numero: string | null;
  estado: SaleStatus;
  subtotal: string;
  descuentoTotal: string;
  igvTotal: string;
  total: string;
  prescriptionValidated: boolean;
  prescriptionNote: string | null;
  comentario: string | null;
  createdAt: string;
  archivedAt?: string | null;
  storage?: DataStorageMode | 'hot' | 'archived';
  fromColdStorage?: boolean;
  customer: { id: string; nombre: string; numeroDocumento: string } | null;
  seller: { id: string; nombre: string } | null;
  sunatStatus?: SunatDocumentStatus | null;
  electronicDocumentId?: string | null;
  canEmitCpe?: boolean;
  canConvertToCpe?: boolean;
  canReturn?: boolean;
  canDebit?: boolean;
  emitBlockedReason?: string | null;
  convertBlockedReason?: string | null;
  returnBlockedReason?: string | null;
  debitBlockedReason?: string | null;
  items: {
    id: string;
    producto: string;
    codigoInterno: string | null;
    cantidad: string;
    /** Cantidad ya devuelta (acumulada). */
    cantidadDevuelta?: string;
    /** Saldo aún devoluble. */
    cantidadRestante?: string;
    precioUnitario: string;
    subtotalLinea: string;
    igvLinea: string;
    totalLinea: string;
    lotes: { codigoLote: string; cantidad: string }[];
  }[];
  payments: { metodo: PaymentMethod; monto: string; referencia: string | null }[];
}

export type SaleLineDiscountType = 'PORCENTAJE' | 'MONTO_FIJO';

export interface CreateSaleItemRequest {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountType?: SaleLineDiscountType;
  discountValue?: number;
  lotAllocationMode?: SaleLotAllocationMode;
  manualLots?: { lotCode: string; quantity: number }[];
}

export interface CreateSalePaymentRequest {
  metodo: PaymentMethod;
  monto: number;
  referencia?: string;
}

export interface CreateSaleSubstitutionRequest {
  originalProductId: string;
  substituteProductId: string;
  motivo?: string;
}

export interface CreateSaleRequest {
  warehouseId: string;
  cashSessionId?: string;
  customerId?: string;
  documentType: SaleDocumentType;
  serie?: string;
  prescriptionValidated?: boolean;
  prescriptionId?: string;
  controlledApprovedById?: string;
  prescriptionNote?: string;
  promotionCode?: string;
  comentario?: string;
  substitutions?: CreateSaleSubstitutionRequest[];
  items: CreateSaleItemRequest[];
  payments: CreateSalePaymentRequest[];
}

export interface SaleListFiltersRequest {
  page?: number;
  pageSize?: number;
  customerId?: string;
  estado?: SaleStatus;
  documentType?: SaleDocumentType;
  from?: string;
  to?: string;
  paymentMetodo?: PaymentMethod;
  paymentReferencia?: string;
  storage?: DataStorageMode;
}

export interface CashRegisterDto {
  id: string;
  nombre: string;
  activo: boolean;
  printerPaperWidth: PosPrinterPaperWidth;
  printerAutoPrint: boolean;
  openCashDrawerOnPrint: boolean;
  barcodeWedgeEnabled: boolean;
  customerDisplayEnabled: boolean;
  escposPrinterName: string | null;
}

export type PosPrinterPaperWidth = 'MM_58' | 'MM_80';

export type CashRegisterHardwareDto = Pick<
  CashRegisterDto,
  | 'printerPaperWidth'
  | 'printerAutoPrint'
  | 'openCashDrawerOnPrint'
  | 'barcodeWedgeEnabled'
  | 'customerDisplayEnabled'
  | 'escposPrinterName'
>;

export interface UpdateCashRegisterHardwareRequest {
  printerPaperWidth?: PosPrinterPaperWidth;
  printerAutoPrint?: boolean;
  openCashDrawerOnPrint?: boolean;
  barcodeWedgeEnabled?: boolean;
  customerDisplayEnabled?: boolean;
  escposPrinterName?: string;
}

export interface CashActiveSessionDto {
  id: string;
  montoApertura: string;
  openedAt: string;
  cashRegister: {
    id: string;
    nombre: string;
    printerPaperWidth: PosPrinterPaperWidth;
    printerAutoPrint: boolean;
    openCashDrawerOnPrint: boolean;
    barcodeWedgeEnabled: boolean;
    customerDisplayEnabled: boolean;
    escposPrinterName: string | null;
  };
}

export interface SyncSalesRequest {
  sales: { offlineLocalId: string; sale: CreateSaleRequest }[];
}

export interface SyncSalesResponse {
  synced: number;
  failed: number;
  results: { offlineLocalId: string; ok: boolean; saleId?: string; error?: string }[];
}

export interface OpenCashSessionRequest {
  cashRegisterId: string;
  montoApertura?: number;
}

export interface CloseCashSessionRequest {
  montoCierreFisico: number;
  notasCierre?: string;
}

export interface CashMovementRequest {
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  metodoPago?: PaymentMethod;
  comentario?: string;
}

export interface CashSessionSummaryDto {
  id: string;
  estado: string;
  montoApertura: string;
  saldoActual: string;
  totalesPorMetodo: Partial<Record<PaymentMethod, string>>;
  pagosDigitales: {
    saleId: string;
    comprobante: string;
    metodo: PaymentMethod;
    monto: string;
    referencia: string | null;
  }[];
  movimientos: {
    id: string;
    tipo: CashMovementType;
    monto: string;
    metodoPago: PaymentMethod | null;
    comentario: string | null;
    createdAt: string;
  }[];
  ventas: {
    id: string;
    documentType: SaleDocumentType;
    numero: string | null;
    total: string;
  }[];
}

export interface QuotationListItemDto {
  id: string;
  estado: QuotationStatus;
  total: string;
  createdAt: string;
  customer: { nombre: string } | null;
  seller: { nombre: string };
}

export interface QuotationDetailDto {
  id: string;
  estado: QuotationStatus;
  warehouseId: string;
  customerId: string | null;
  total: string;
  subtotal: string;
  igvTotal: string;
  comentario: string | null;
  customer: { id: string; nombre: string } | null;
  items: {
    id: string;
    productId: string;
    producto: string;
    cantidad: string;
    precioUnitario: string;
    totalLinea: string;
  }[];
}

export interface CreateQuotationItemRequest {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreateQuotationRequest {
  warehouseId: string;
  customerId?: string;
  comentario?: string;
  items: CreateQuotationItemRequest[];
}

// —— Compras (Fase 4) ——

export type PurchaseOrderStatus =
  | 'BORRADOR'
  | 'APROBADA'
  | 'ENVIADA'
  | 'PARCIALMENTE_RECIBIDA'
  | 'RECIBIDA'
  | 'CERRADA'
  | 'ANULADA';

export type AccountPayableStatus = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA' | 'ANULADA';

export interface PurchaseOrderListItemDto {
  id: string;
  numero: string | null;
  estado: PurchaseOrderStatus;
  total: string;
  fechaEmision: string;
  createdAt: string;
  supplier: { id: string; razonSocial: string };
  warehouse: { id: string; nombre: string };
}

export interface PurchaseOrderDetailDto {
  id: string;
  numero: string | null;
  estado: PurchaseOrderStatus;
  subtotal: string;
  igvTotal: string;
  total: string;
  moneda: string;
  comentario: string | null;
  condicionesPago: string | null;
  fechaEmision: string;
  fechaEntregaEstimada: string | null;
  createdAt: string;
  supplier: { id: string; razonSocial: string; numeroDocumento: string; diasCredito: number };
  warehouse: { id: string; nombre: string };
  createdBy: { id: string; nombre: string };
  approvedBy: { id: string; nombre: string } | null;
  items: PurchaseOrderItemDto[];
  goodsReceipts: {
    id: string;
    numero: string | null;
    fechaRecepcion: string;
    referenciaDoc: string | null;
  }[];
}

export interface PurchaseOrderItemDto {
  id: string;
  productId: string;
  producto: string;
  codigoInterno: string | null;
  manejaLotes: boolean;
  cantidadPedida: string;
  cantidadRecibida: string;
  cantidadPendiente: string;
  precioUnitario: string;
  subtotalLinea: string;
  igvLinea: string;
  totalLinea: string;
  codigoProveedor: string | null;
}

export interface CreatePurchaseOrderItemRequest {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreatePurchaseOrderRequest {
  supplierId: string;
  warehouseId: string;
  fechaEntregaEstimada?: string;
  comentario?: string;
  condicionesPago?: string;
  items: CreatePurchaseOrderItemRequest[];
}

export interface CreateGoodsReceiptItemRequest {
  purchaseOrderItemId: string;
  quantity: number;
  lotCode?: string;
  expirationDate?: string;
  unitCost?: number;
}

export interface CreateGoodsReceiptRequest {
  items: CreateGoodsReceiptItemRequest[];
  referenciaDoc?: string;
  comentario?: string;
}

export interface AccountPayableListItemDto {
  id: string;
  numeroDocumento: string | null;
  montoTotal: string;
  montoPagado: string;
  saldo: string;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: AccountPayableStatus;
  supplier: { id: string; razonSocial: string };
}

export interface ReplenishmentSuggestionDto {
  productId: string;
  producto: string;
  codigoInterno: string | null;
  warehouseId: string;
  warehouse: string;
  stockActual: string;
  stockMinimo: number;
  cantidadSugerida: number;
  rotacion90d: string;
  claseAbc: 'A' | 'B' | 'C';
  proveedorSugerido: string | null;
  precioSugerido: string | null;
}

export interface PriceComparisonItemDto {
  productId: string;
  producto: string;
  codigoInterno: string | null;
  proveedores: {
    supplierId: string;
    razonSocial: string;
    numeroDocumento: string;
    precioCompra: string;
    plazoDias: number;
    codigoProveedor: string | null;
  }[];
  mejorPrecio: string | null;
}

// —— Facturación electrónica (Fase 5) ——

export type SunatDocumentStatus =
  | 'PENDIENTE'
  | 'ENVIANDO'
  | 'ACEPTADO'
  | 'OBSERVADO'
  | 'RECHAZADO'
  | 'ANULADO'
  | 'CONTINGENCIA';

export type BillingProviderType = 'MOCK' | 'NUBEFACT' | 'FACTILIZA' | 'APISPERU' | 'BIZLINKS';

export interface BillingProviderCapabilitiesDto {
  mockAllowed: boolean;
  supportsDailySummary: boolean;
  supportsVoidDocument: boolean;
  supportedSpecialDocuments: string[];
  unsupportedSpecialDocuments: { documentType: string; reason: string }[];
  notes: string[];
}

export interface BillingConfigDto {
  provider: BillingProviderType;
  rucEmisor: string | null;
  razonSocialEmisor: string | null;
  apiUrl: string | null;
  consultaApiUrl: string | null;
  modoSandbox: boolean;
  autoEmitOnSale: boolean;
  emitNotaVenta: boolean;
  applyDetraccion: boolean;
  autoEmitGuiaOnTransfer: boolean;
  hasApiToken: boolean;
  hasCertificate: boolean;
  capabilities?: BillingProviderCapabilitiesDto;
}

export interface UpsertBillingConfigRequest {
  provider?: BillingProviderType;
  rucEmisor?: string;
  razonSocialEmisor?: string;
  apiUrl?: string;
  consultaApiUrl?: string;
  apiToken?: string;
  certificateBase64?: string;
  certificatePassword?: string;
  modoSandbox?: boolean;
  autoEmitOnSale?: boolean;
  emitNotaVenta?: boolean;
  applyDetraccion?: boolean;
  autoEmitGuiaOnTransfer?: boolean;
}

export interface ValidateRucResponseDto {
  ruc: string;
  razonSocial: string;
  estado: string;
  condicion: string;
  direccion: string | null;
}

export interface EmitSpecialDocumentRequest {
  documentType: 'RETENCION' | 'PERCEPCION' | 'LIQUIDACION_COMPRA' | 'GUIA_REMISION_TRANSPORTISTA';
  customerNombre: string;
  customerDocType: string;
  customerDocNumber: string;
  subtotal: string;
  igvTotal: string;
  total: string;
  lines: Array<{
    descripcion: string;
    cantidad: string;
    precioUnitario: string;
    subtotalLinea: string;
    igvLinea: string;
    totalLinea: string;
    codigoProducto?: string;
    unidadMedida?: string;
  }>;
}

export interface ElectronicDocumentListItemDto {
  id: string;
  documentType: string;
  serie: string;
  numero: string;
  sunatStatus: SunatDocumentStatus;
  total: string;
  customerNombre: string | null;
  emittedAt: string | null;
  createdAt: string;
  saleId: string | null;
}

export interface ElectronicDocumentDetailDto extends ElectronicDocumentListItemDto {
  subtotal: string;
  igvTotal: string;
  moneda: string;
  esContingencia: boolean;
  externalId: string | null;
  sunatCodigo: string | null;
  sunatDescripcion: string | null;
  customerDocNumber: string | null;
  xmlArchivoId: string | null;
  pdfArchivoId: string | null;
  cdrArchivoId: string | null;
  lines: Array<{
    lineNumber: number;
    descripcion: string;
    cantidad: string;
    precioUnitario: string;
    subtotalLinea: string;
    igvLinea: string;
    totalLinea: string;
    taxAffectationCodigo: string | null;
  }>;
  taxLines: Array<{ taxCodigo: string; taxNombre: string; baseImponible: string; monto: string }>;
  responses: Array<{ tipo: string; codigo: string | null; descripcion: string | null; createdAt: string }>;
  saleReturnId?: string | null;
  relatedDocumentId?: string | null;
  relatedDocument?: {
    id: string;
    documentType: string;
    serie: string;
    numero: string;
  } | null;
}

export interface SaleBillingStatusDto {
  electronicDocumentId: string;
  sunatStatus: SunatDocumentStatus;
  sunatCodigo: string | null;
  sunatDescripcion: string | null;
  serie: string;
  numero: string;
}

export interface CreateSaleReturnRequest {
  motivo: string;
  items: { saleItemId: string; quantity: number; lotCode?: string }[];
}

export interface SaleReturnResponseDto {
  ok: boolean;
  message: string;
  saleReturnId: string;
  totalDevuelto: string;
  electronicDocumentId: string | null;
}

export interface CreateSaleDebitNoteRequest {
  motivo: string;
  descripcion: string;
  total: number;
}

export interface SaleDebitNoteResponseDto {
  ok: boolean;
  message: string;
  electronicDocumentId: string;
}

export interface MedicoItemDto {
  id: string;
  cmp: string;
  nombres: string;
  apellidos: string;
  especialidad: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicoRequest {
  cmp: string;
  nombres: string;
  apellidos: string;
  especialidad?: string;
}

export interface PrescriptionListItemDto {
  id: string;
  numero: string;
  fechaEmision: string;
  estado: string;
  medicoNombre: string | null;
  medicoCmp: string | null;
  customer: { id: string; nombre: string; numeroDocumento: string };
  items: Array<{
    id: string;
    productId: string;
    cantidadPrescrita: string;
    cantidadDispensada: string;
    product: { nombre: string; codigoInterno: string | null };
  }>;
  createdAt: string;
}

export interface CreatePrescriptionRequest {
  customerId: string;
  medicoId?: string;
  fechaEmision: string;
  validUntil?: string;
  diagnostico?: string;
  notas?: string;
  imagenArchivoId?: string;
  items: Array<{ productId: string; cantidadPrescrita: string; dosis?: string; indicaciones?: string }>;
}

export type AdverseEventSeverity = 'LEVE' | 'MODERADO' | 'GRAVE';

export interface AdverseEventItemDto {
  id: string;
  fecha: string;
  descripcion: string;
  severidad: AdverseEventSeverity;
  notificadoDigemid: boolean;
  digemidReportNumber: string | null;
  medidasCorrectivas: string | null;
  fechaNotificacion: string | null;
  pacienteEdad: number | null;
  pacienteSexo: string | null;
  reaccionTipo: string | null;
  cie10Codigo: string | null;
  product: { nombre: string; codigoInterno: string | null };
  customer: { nombre: string; numeroDocumento: string } | null;
}

export interface CreateAdverseEventRequest {
  productId: string;
  customerId?: string;
  descripcion: string;
  severidad?: AdverseEventSeverity;
  pacienteEdad?: number;
  pacienteSexo?: string;
  reaccionTipo?: string;
  cie10Codigo?: string;
}

export interface NotifyDigemidRequest {
  digemidReportNumber: string;
  medidasCorrectivas?: string;
  fechaNotificacion?: string;
  pacienteEdad?: number;
  pacienteSexo?: string;
  reaccionTipo?: string;
  cie10Codigo?: string;
}

export interface Cie10CodeDto {
  id: string;
  codigo: string;
  descripcion: string;
}

export interface ControlledLedgerEntryDto {
  id: string;
  fecha: string;
  movementType: 'ENTRADA' | 'SALIDA';
  cantidad: string;
  saldo: string;
  referencia: string | null;
  product: {
    nombre: string;
    codigoInterno: string | null;
    controlledSubstanceCategory: { codigo: string; nombre: string; schedule: string } | null;
  };
  user: { nombre: string } | null;
}

export interface ControlledMonthlyReportDto {
  period: { year: number; month: number; from: string; to: string };
  entries: Array<{
    id: string;
    fecha: string;
    movementType: string;
    cantidad: string;
    saldo: string;
    referencia: string | null;
    producto: string;
    codigoInterno: string | null;
    categoria: string | null;
    schedule: string | null;
    usuario: string | null;
  }>;
  summary: Array<{
    productId: string;
    producto: string;
    codigoInterno: string | null;
    categoria: string | null;
    schedule: string | null;
    entradas: string;
    salidas: string;
    saldoFinal: string;
  }>;
}

export interface PrescriptionSummaryDto {
  id: string;
  numero: string;
  fechaEmision: string;
  estado: string;
  medicoNombre: string | null;
}

export interface LegalDocumentDto {
  version: string;
  title: string;
  content: string;
}

export interface ValidateDniResponseDto {
  dni: string;
  nombre: string;
}

export interface LpdTreatmentMatrixDto {
  version: string;
  encryptionEnabled: boolean;
  rows: Array<{
    proceso: string;
    datos: string[];
    finalidad: string;
    baseLegal: string;
    retencion: string;
    destinatarios: string[];
  }>;
}

export interface ArcoRequestDto {
  id: string;
  requestType: string;
  status: string;
  createdAt: string;
  customer?: { id: string; nombre: string; numeroDocumento: string };
}

export interface LpdpRetentionDto {
  policy: string;
  cutoffDate: string;
  candidates: Array<{ id: string; nombre: string; numeroDocumento: string; updatedAt: string }>;
}

export interface PharmacistLicenseDto {
  id: string;
  colegiaturaCqp: string;
  fullName: string;
  vigenciaHasta: string | null;
  activo: boolean;
  titularEstablishments?: Array<{ id: string; nombre: string; codigo: string | null }>;
}

export interface CreatePharmacistLicenseRequest {
  colegiaturaCqp: string;
  fullName: string;
  vigenciaHasta?: string;
  userId?: string;
  activo?: boolean;
}

export interface RegulatedPriceDto {
  id: string;
  codigoDigemid: string | null;
  nombre: string;
  precioMaximo: string;
}

export interface UpsertRegulatedPriceRequest {
  codigoDigemid?: string;
  nombre: string;
  precioMaximo: number;
  vigenteDesde?: string;
  vigenteHasta?: string;
  fuente?: string;
}

export interface PleExportDto {
  filename: string;
  content: string;
  rowCount: number;
}

export interface AccountantSummaryDto {
  period: string;
  ventas: { count: number; subtotal: string; igv: string; total: string };
  compras: { count: number; total: string };
  comprobantesElectronicos: Array<{ tipo: string; count: number; total: string }>;
}

export interface ShippingCarrierDto {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
}

export interface ShippingDriverDto {
  id: string;
  carrierId: string | null;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  licencia: string | null;
  telefono: string | null;
  activo: boolean;
  carrier: { id: string; razonSocial: string } | null;
}

export interface ShippingVehicleDto {
  id: string;
  carrierId: string | null;
  placa: string;
  marca: string | null;
  modelo: string | null;
  capacidadKg: string | null;
  activo: boolean;
  carrier: { id: string; razonSocial: string } | null;
}

export interface DepartureAddressDto {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  departmentId: string | null;
  provinceId: string | null;
  districtId: string | null;
  activo: boolean;
  department: { id: string; name: string } | null;
  province: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
}

export type TaxWithholdingKind = 'RETENCION' | 'PERCEPCION' | 'DETRACCION';

export interface SunatWithholdingRateDto {
  id: string;
  codigo: string;
  nombre: string;
  kind: TaxWithholdingKind;
  tasa: string;
  activo: boolean;
}

export interface TaxWithholdingRecordDto {
  id: string;
  kind: TaxWithholdingKind;
  partyNombre: string;
  partyDocType: string;
  partyDocNumber: string;
  regimenCodigo: string | null;
  fechaOperacion: string;
  comprobanteModificadoSerie: string | null;
  comprobanteModificadoNumero: string | null;
  baseImponible: string;
  tasa: string;
  monto: string;
  observaciones: string | null;
  electronicDocument?: {
    id: string;
    serie: string;
    numero: string;
    sunatStatus: string;
    documentType?: string;
  } | null;
}

export interface CreateTaxWithholdingRequest {
  partyNombre: string;
  partyDocType: string;
  partyDocNumber: string;
  regimenCodigo?: string;
  tasa?: number;
  baseImponible: number;
  fechaOperacion?: string;
  comprobanteModificadoTipo?: string;
  comprobanteModificadoSerie?: string;
  comprobanteModificadoNumero?: string;
  observaciones?: string;
}

export interface TaxWithholdingCalculateDto {
  baseImponible: string;
  tasa: string;
  monto: string;
}

export interface SyncDetraccionesResponseDto {
  synced: number;
  totalCandidates?: number;
  message?: string;
}

export interface SanitaryRegistryAlertDto {
  id: string;
  nombre: string;
  registroSanitario: string | null;
  codigoMedicamentoDigemid: string | null;
  registroSanitarioVigencia: string | null;
  estado: string;
}

export interface LotTraceabilityDto {
  codigoLote: string;
  entradas: Array<{
    fecha: string;
    producto: string;
    codigo: string;
    almacen: string;
    cantidad: string;
    referencia: string;
  }>;
  ventas: Array<{
    saleId: string;
    documento: string;
    fecha: string;
    producto: string;
    cantidad: string;
    cliente: string;
    documentoCliente: string;
  }>;
}

export type DeliveryOrderStatus =
  | 'RECIBIDO'
  | 'PREPARANDO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type DeliveryChannel = 'TELEFONO' | 'WHATSAPP' | 'WEB' | 'PRESENCIAL';

export type PromotionType =
  | 'PORCENTAJE_ITEM'
  | 'MONTO_ITEM'
  | 'PORCENTAJE_VENTA'
  | 'CANTIDAD_MINIMA'
  | 'DOS_POR_UNO';

export interface DeliveryOrderListItemDto {
  id: string;
  numero: string;
  estado: DeliveryOrderStatus;
  canal: DeliveryChannel;
  clienteNombre: string;
  clienteTelefono: string;
  total: string;
  createdAt: string;
  assignedTo: { id: string; nombre: string } | null;
}

export interface DeliveryOrderDetailDto {
  id: string;
  numero: string;
  estado: DeliveryOrderStatus;
  canal: DeliveryChannel;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string | null;
  direccionEntrega: string;
  referenciaDireccion: string | null;
  distritoEntrega: string | null;
  costoDelivery: string;
  subtotal: string;
  igvTotal: string;
  total: string;
  notasCliente: string | null;
  notasInternas: string | null;
  programadoPara: string | null;
  entregadoAt: string | null;
  cancelReason: string | null;
  saleId: string | null;
  createdAt: string;
  customer: { id: string; nombre: string; numeroDocumento: string } | null;
  warehouse: { id: string; nombre: string };
  createdBy: { id: string; nombre: string };
  assignedTo: { id: string; nombre: string } | null;
  sale: { id: string; serie: string | null; numero: string | null; total: string } | null;
  items: Array<{
    id: string;
    productId: string;
    producto: string;
    codigoInterno: string | null;
    cantidad: string;
    precioUnitario: string;
    totalLinea: string;
    notas: string | null;
  }>;
  notifications: Array<{
    id: string;
    channel: string;
    templateKey: string;
    destino: string;
    enviadoOk: boolean;
    createdAt: string;
  }>;
  whatsappLink?: string | null;
}

export interface CreateDeliveryOrderRequest {
  warehouseId: string;
  customerId?: string;
  canal?: DeliveryChannel;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string;
  direccionEntrega: string;
  referenciaDireccion?: string;
  distritoEntrega?: string;
  costoDelivery?: number;
  notasCliente?: string;
  notasInternas?: string;
  programadoPara?: string;
  items: Array<{ productId: string; quantity: number; unitPrice?: number; notas?: string }>;
}

export interface PromotionListItemDto {
  id: string;
  codigo: string;
  nombre: string;
  tipo: PromotionType;
  valor: string;
  cantidadMinima: number | null;
  activo: boolean;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
}

export interface CreatePromotionRequest {
  codigo: string;
  nombre: string;
  tipo: PromotionType;
  valor: number;
  cantidadMinima?: number;
  activo?: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface CustomerLoyaltyHistoryDto {
  customerId: string;
  nombre: string;
  puntosAcumulados: number;
  transactions: Array<{
    id: string;
    tipo: string;
    puntos: number;
    saldoAfter: number;
    referencia: string | null;
    createdAt: string;
  }>;
}

export interface CustomerPurchaseRecommendationsDto {
  frequentPurchases: Array<{
    productId: string;
    nombre: string;
    codigoInterno: string | null;
    qty: number;
  }>;
  recommendations: Array<{
    productId: string;
    nombre: string;
    codigoInterno: string | null;
    qty: number;
  }>;
}

export type AgreementType = 'EPS' | 'CLINICA' | 'EMPRESA' | 'HOSPITAL' | 'SEGURO';
export type HospitalAreaType = 'PABELLON' | 'SERVICIO' | 'CARRO_PARO' | 'BOTIQUIN';

export interface AgreementListItemDto {
  id: string;
  codigo: string;
  nombre: string;
  tipo: AgreementType;
  institucionTipo: string | null;
  coberturaPorcentaje: string;
  diasCredito: number;
  activo: boolean;
  createdAt: string;
}

export interface CreateAgreementRequest {
  codigo: string;
  nombre: string;
  tipo: AgreementType;
  institucionTipo?: string;
  coberturaPorcentaje?: number;
  diasCredito?: number;
  contactoNombre?: string;
  contactoEmail?: string;
  contactoTelefono?: string;
  notas?: string;
}

export interface AccountReceivableListItemDto {
  id: string;
  documentoRef: string | null;
  montoTotal: string;
  montoPagado: string;
  saldo: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  estado: string;
  customer: { id: string; nombre: string; numeroDocumento: string };
  agreement: { id: string; codigo: string; nombre: string } | null;
  sale: { id: string; serie: string | null; numero: string | null } | null;
}

export interface CashFlowReportDto {
  from: string;
  to: string;
  ingresos: { ventas: string; ventasCount: number; cobrosClientes: string; cobrosCount: number };
  egresos: {
    compras: string;
    comprasCount: number;
    pagosProveedores: string;
    pagosProveedoresCount: number;
  };
  caja: { movimientosTotal: string; movimientosCount: number };
  flujoNeto: string;
}

export interface MarginReportDto {
  ventaTotal: string;
  costoTotal: string;
  margen: string;
  margenPorcentaje: string;
  topProducts: Array<{
    productId: string;
    nombre: string;
    venta: string;
    costo: string;
    margen: string;
  }>;
}

export interface BankAccountDto {
  id: string;
  nombre: string;
  tipo: string;
  banco: string | null;
  numeroCuenta: string | null;
  saldoLibro: string;
  activo: boolean;
}

export interface BankMovementListItemDto {
  id: string;
  bankAccountId: string;
  bankAccount: { id: string; nombre: string };
  tipo: string;
  monto: string;
  referencia: string | null;
  descripcion: string | null;
  conciliado: boolean;
  conciliadoAt: string | null;
  movimientoAt: string;
}

export interface PaymentsByMethodReportDto {
  from: string;
  to: string;
  totalIngresos: string;
  totalEgresos: string;
  neto: string;
  methods: Array<{
    metodo: string;
    ingresos: string;
    egresos: string;
    neto: string;
    transacciones: number;
  }>;
}

export interface RecentPaymentListItemDto {
  id: string;
  fecha: string;
  tipo: string;
  monto: string;
  metodo: string;
  referencia: string | null;
  descripcion: string;
}

export interface GeneralLedgerListItemDto {
  id: string;
  fecha: string;
  cuenta: string;
  descripcion: string;
  debe: string;
  haber: string;
  origen: string;
}

export interface GeneralLedgerReportDto extends PaginatedResponseDto<GeneralLedgerListItemDto> {
  from: string;
  to: string;
  totalDebe: string;
  totalHaber: string;
}

export interface AccountingExportResultDto {
  filename: string;
  content: string;
  mimeType: string;
}

export interface HospitalAreaListItemDto {
  id: string;
  codigo: string;
  nombre: string;
  tipo: HospitalAreaType;
  activo: boolean;
}

export interface HospitalConsumptionListItemDto {
  id: string;
  estado: string;
  motivo: string | null;
  comentario: string | null;
  dispensadoAt: string | null;
  createdAt: string;
  hospitalArea: { id: string; codigo: string; nombre: string; tipo: HospitalAreaType };
  solicitadoPor: { id: string; nombre: string };
  items: Array<{
    id: string;
    productId: string;
    cantidad: string;
    notas: string | null;
    product: { id: string; nombre: string };
  }>;
}

export type TenantPlanDto = 'BOTICA' | 'FARMACIA_PRO' | 'CADENA' | 'CUSTOM';
export type TenantStatusDto = 'PENDING' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED';
export type TenantLeadStatusDto = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'REJECTED';

export interface TenantUsageDto {
  users: number;
  establishments: number;
  usersRemaining: number;
  establishmentsRemaining: number;
}

export interface TenantDetailDto {
  id: string;
  nombre: string;
  ruc: string | null;
  slug: string;
  plan: TenantPlanDto;
  status: TenantStatusDto;
  maxEstablishments: number;
  maxUsers: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  usage: TenantUsageDto;
  enabledModules: string[];
}

export type ComplaintKindDto = 'RECLAMO' | 'QUEJA';
export type ComplaintStatusDto = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

export interface ComplaintDto {
  id: string;
  numeroRegistro: string;
  tipo: ComplaintKindDto;
  status: ComplaintStatusDto;
  nombresApellidos: string;
  domicilio: string;
  documentoIdentidad: string;
  telefono: string;
  email: string | null;
  bienContratado: string;
  montoReclamado: string | null;
  detalle: string;
  pedido: string;
  internalNotes: string | null;
  responseNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantLeadDto {
  id: string;
  tenantId: string | null;
  nombre: string;
  farmacia: string;
  telefono: string;
  email: string;
  mensaje: string | null;
  status: TenantLeadStatusDto;
  planInterest: TenantPlanDto | null;
  source: string;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
