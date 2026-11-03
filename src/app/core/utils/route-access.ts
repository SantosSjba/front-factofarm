import { PERMISSION_ROUTE_MAP } from '../../shared/layout/app-sidebar/sidebar-route.map';

/** Ruta del panel → permisos `nav.*` que la habilitan (cualquiera basta, como el guard). */
const ROUTE_PERMISSIONS: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const [code, { path }] of Object.entries(PERMISSION_ROUTE_MAP)) {
    map.set(path, [...(map.get(path) ?? []), code]);
  }
  return map;
})();

/**
 * ¿El usuario puede abrir esta ruta? Sirve para no mostrar enlaces que terminarían en
 * "no tienes acceso". Rutas sin permiso propio (perfil, onboarding…) se consideran abiertas.
 */
export function canOpenRoute(path: string | null | undefined, hasPermission: (code: string) => boolean): boolean {
  if (!path) return false;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const codes = ROUTE_PERMISSIONS.get(clean);
  return !codes || codes.some((code) => hasPermission(code));
}
