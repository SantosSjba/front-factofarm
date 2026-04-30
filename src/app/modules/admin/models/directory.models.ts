/** Respuestas alineadas con la API Nest (`UserSnapshot`, establecimientos, árbol de permisos). */

export type UserRoleDto = 'ADMINISTRADOR' | 'VENDEDOR';

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
}

export interface UpdateUserRequest {
  nombre?: string;
  email?: string;
  password?: string;
  role?: UserRoleDto;
  establecimientoId?: string;
  profile?: CreateUserProfileBody;
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
}

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
}

export interface EstablishmentListFiltersRequest {
  search?: string;
  hospital?: 'all' | 'hospital' | 'no-hospital';
}

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
}

export type UpdateEstablishmentRequest = Partial<CreateEstablishmentRequest>;

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
}

export interface CreateCustomerTypeRequest {
  descripcion: string;
}

export type UpdateCustomerTypeRequest = Partial<CreateCustomerTypeRequest>;

export interface CategoryItemDto {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre';
}

export interface CreateCategoryRequest {
  nombre: string;
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
}

export interface CreateBrandRequest {
  nombre: string;
}

export type UpdateBrandRequest = Partial<CreateBrandRequest>;

export type CustomerDocumentTypeDto =
  | 'DNI'
  | 'RUC'
  | 'CE'
  | 'PASAPORTE'
  | 'DOC_SIN_RUC'
  | 'OTRO';

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
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export interface CustomerImportResultDto {
  totalRows: number;
  created: number;
  updated: number;
  errors: string[];
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

export interface ProductListFiltersRequest {
  search?: string;
  field?: 'all' | 'nombre' | 'codigoInterno' | 'codigoBarra' | 'codigoBusqueda' | 'descripcion';
  page?: number;
  pageSize?: number;
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
}
