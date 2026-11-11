import type { StatusTone } from '../../../shared/components/ui/badge/status-badge.component';

/**
 * Reglas de gestión de usuarios: las mismas que aplica la API (users.service / role-policy).
 * Sirven para no mostrar acciones que la API va a rechazar.
 */
export const CHAIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_CADENA', 'ADMINISTRADOR']);

export type PolicyActor = { id: string; role: string } | null | undefined;
export type PolicyTarget = { id: string; role: string };

export function hasChainScope(role: string | null | undefined): boolean {
  return !!role && CHAIN_ROLES.has(role);
}

/** Editar datos o permisos: un administrador solo lo gestiona otro administrador. */
export function canManageUser(actor: PolicyActor, target: PolicyTarget): boolean {
  if (!actor) return false;
  if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') return false;
  return hasChainScope(actor.role) || !hasChainScope(target.role);
}

/** Cambiar rol o permisos: nadie (salvo administradores) se cambia a sí mismo. */
export function canChangeAccess(actor: PolicyActor, target: PolicyTarget): boolean {
  if (!canManageUser(actor, target)) return false;
  return hasChainScope(actor!.role) || actor!.id !== target.id;
}

/** Eliminar: nunca a uno mismo. */
export function canDeleteUser(actor: PolicyActor, target: PolicyTarget): boolean {
  return canManageUser(actor, target) && actor!.id !== target.id;
}

const ROLE_TONE: Record<string, StatusTone> = {
  SUPER_ADMIN: 'error',
  ADMIN_CADENA: 'purple',
  ADMINISTRADOR: 'purple',
  GERENTE_SUCURSAL: 'brand',
  FARMACEUTICO_TITULAR: 'info',
  FARMACEUTICO: 'info',
  TECNICO_FARMACEUTICO: 'info',
  CAJERO: 'success',
  VENDEDOR: 'success',
  ALMACENERO: 'warning',
  CONTADOR: 'neutral',
};

export function roleTone(role: string): StatusTone {
  return ROLE_TONE[role] ?? 'neutral';
}
