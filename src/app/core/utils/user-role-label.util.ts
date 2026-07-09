/** Etiquetas en español para roles de usuario (tabla, filtros, badges). */
export const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN_CADENA: 'Admin cadena',
  GERENTE_SUCURSAL: 'Gerente de sucursal',
  FARMACEUTICO_TITULAR: 'Farmacéutico titular',
  FARMACEUTICO: 'Farmacéutico',
  TECNICO_FARMACEUTICO: 'Técnico farmacéutico',
  CAJERO: 'Cajero',
  ALMACENERO: 'Almacenero',
  CONTADOR: 'Contador',
  ADMINISTRADOR: 'Administrador',
  VENDEDOR: 'Vendedor',
};

export function userRoleLabel(role: string): string {
  return USER_ROLE_LABELS[role] ?? role;
}
