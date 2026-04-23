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
