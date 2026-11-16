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
  const clean = cleanRoutePath(path);
  const codes = ROUTE_PERMISSIONS.get(clean);
  return !codes || codes.some((code) => hasPermission(code));
}

/** Ruta sin parámetros ni fragmento, y sin «/» final: «/notas-venta?x=1#a» → «/notas-venta». */
export function cleanRoutePath(url: string | null | undefined): string {
  return (url ?? '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

/**
 * ¿La opción del menú con esta ruta corresponde a la URL actual? Ignora parámetros y fragmento
 * (los accesos desde reportes, notificaciones o paneles los agregan) y acepta subrutas
 * («/productos/123» resalta «Productos»).
 */
export function isMenuPathActive(currentUrl: string | null | undefined, menuPath: string | null | undefined): boolean {
  if (!menuPath) return false;
  const current = cleanRoutePath(currentUrl);
  const target = cleanRoutePath(menuPath);
  return current === target || (target !== '/' && current.startsWith(target + '/'));
}
