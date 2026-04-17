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

export interface EstablishmentOptionDto {
  id: string;
  nombre: string;
  codigo: string | null;
}

export interface PermissionMenuNodeDto {
  id: string;
  code: string;
  label: string | null;
  children: { id: string; code: string; label: string | null }[];
}
