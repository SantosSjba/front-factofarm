/** Respuesta de `POST /auth/login` — alineada con la API Nest. */
export type AuthUser = {
  id: string;
  nombre: string;
  email: string;
  role: string;
  establecimientoId: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};
