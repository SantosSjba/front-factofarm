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
  /** Sesión de soporte FactoSys dentro de un cliente SaaS. */
  supportSession?: boolean;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type TenantPanelHandoffResponse = {
  exchangeCode: string;
  tenantId: string;
  tenantNombre: string;
  expiresInSeconds: number;
};
