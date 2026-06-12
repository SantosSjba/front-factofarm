import { MAIN_NAV_ITEMS, NavItem, NavSubItem } from './sidebar-menu.config';
import { PERMISSION_ROUTE_MAP } from './sidebar-route.map';

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
    const mapCodes = Object.keys(PERMISSION_ROUTE_MAP).sort();
    expect(mapCodes).toEqual(navCodes);
  });
});
