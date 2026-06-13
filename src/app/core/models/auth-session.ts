/** Respuesta de `POST /auth/login` y `POST /auth/refresh`. */
export type AuthUser = {
  id: string;
  nombre: string;
  email: string;
  role: string;
  tenantId: string | null;
  tenantNombre?: string | null;
  tenantStatus?: string | null;
  establecimientoId: string;
  permissionCodes: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};
