import { MAIN_NAV_ITEMS, NavItem, NavSubItem } from './sidebar-menu.config';
import { LEGACY_NAV_ALIASES, PERMISSION_ROUTE_MAP } from './sidebar-route.map';

function collectNavPermissionCodes(items: NavItem[] | NavSubItem[]): string[] {
  const codes: string[] = [];
  for (const item of items) {
    if (item.permissionCode?.startsWith('nav.')) {
      codes.push(item.permissionCode);
    }
    if (item.subItems?.length) {
      codes.push(...collectNavPermissionCodes(item.subItems));
    }
  }
  return codes;
}

describe('sidebar permissions', () => {
  const navCodes = [...new Set(collectNavPermissionCodes(MAIN_NAV_ITEMS))].sort();

  it('cada nav.* del sidebar tiene ruta en PERMISSION_ROUTE_MAP', () => {
    for (const code of navCodes) {
      expect(PERMISSION_ROUTE_MAP[code]?.path).toBeDefined();
    }
  });

  it('PERMISSION_ROUTE_MAP no tiene códigos huérfanos respecto al sidebar', () => {
    const mapCodes = Object.keys(PERMISSION_ROUTE_MAP)
      .filter((code) => !LEGACY_NAV_ALIASES.includes(code))
      .sort();
    expect(mapCodes).toEqual(navCodes);
  });

  it('cada alias antiguo abre la pantalla de una opción que sí está en el sidebar', () => {
    const sidebarPaths = new Set(navCodes.map((code) => PERMISSION_ROUTE_MAP[code]?.path));
    for (const alias of LEGACY_NAV_ALIASES) {
      expect(navCodes).not.toContain(alias);
      expect(sidebarPaths.has(PERMISSION_ROUTE_MAP[alias]?.path)).toBe(true);
    }
  });
});
