import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { DirectoryApiService } from '../../modules/admin/services/directory-api.service';
import type { PermissionMenuNodeDto } from '../../modules/admin/models/directory.models';
import {
  MAIN_NAV_ITEMS,
  NavItem,
  NavSubItem,
} from '../../shared/layout/app-sidebar/sidebar-menu.config';
import { PERMISSION_ROUTE_MAP } from '../../shared/layout/app-sidebar/sidebar-route.map';
import { map, Observable, of, catchError } from 'rxjs';

const TREE_SECTION_MATCHERS: Record<string, (item: NavItem) => boolean> = {
  'nav.dashboard': (item) => item.name === 'Dashboard',
  'nav.usuarios_series': (item) =>
    item.subItems?.some((s) => s.permissionCode === 'nav.usuarios') ?? false,
  'nav.clientes': (item) => item.name === 'Clientes',
  'nav.productos_catalogo': (item) => item.icon === 'lucide:package-search',
  'nav.compras': (item) => item.name === 'Compras',
  'nav.pos': (item) => item.name === 'POS',
  'nav.ventas': (item) => item.name === 'Ventas',
  'nav.inventario': (item) => item.name === 'Inventario',
  'nav.comprobantes_avanzados': (item) => item.name === 'Comprobantes Avanzados',
  'nav.guias_remision': (item) => item.name === 'Guias de remision',
  'nav.reportes': (item) => item.name === 'Reportes',
  'nav.contabilidad': (item) => item.name === 'Contabilidad',
  'nav.finanzas': (item) => item.name === 'Finanzas',
  'nav.farmacos': (item) => item.name === 'Farmacos',
};

function filterNavSubItems(
  items: NavSubItem[],
  canAccess: (code?: string) => boolean,
): NavSubItem[] {
  return items.reduce<NavSubItem[]>((acc, item) => {
    if (item.subItems?.length) {
      const subItems = filterNavSubItems(item.subItems, canAccess);
      if (subItems.length > 0) acc.push({ ...item, subItems });
      return acc;
    }
    if (canAccess(item.permissionCode)) acc.push(item);
    return acc;
  }, []);
}

function filterNavItems(items: NavItem[], canAccess: (code?: string) => boolean): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    if (item.subItems?.length) {
      const subItems = filterNavSubItems(item.subItems, canAccess);
      if (subItems.length > 0) acc.push({ ...item, subItems });
      return acc;
    }
    if (canAccess(item.permissionCode)) acc.push(item);
    return acc;
  }, []);
}

function navSubItemsFromTree(tree: PermissionMenuNodeDto): NavSubItem[] {
  const items: NavSubItem[] = [];
  for (const child of tree.children ?? []) {
    const route = PERMISSION_ROUTE_MAP[child.code];
    if (!route?.path) continue;
    items.push({
      name: child.label ?? child.code,
      path: route.path,
      permissionCode: child.code,
    });
  }
  return items;
}

function mergeNavLabels(staticItems: NavSubItem[], dynamicItems: NavSubItem[]): NavSubItem[] {
  const labelByCode = new Map(
    dynamicItems
      .filter((d) => d.permissionCode)
      .map((d) => [d.permissionCode!, d.name] as const),
  );

  return staticItems.map((sub) => {
    if (sub.subItems?.length) {
      return { ...sub, subItems: mergeNavLabels(sub.subItems, dynamicItems) };
    }
    if (sub.permissionCode && labelByCode.has(sub.permissionCode)) {
      return { ...sub, name: labelByCode.get(sub.permissionCode)! };
    }
    return sub;
  });
}

function mergeDynamicSections(staticNav: NavItem[], trees: PermissionMenuNodeDto[]): NavItem[] {
  let result = staticNav;

  for (const tree of trees) {
    const matcher = TREE_SECTION_MATCHERS[tree.code];
    if (!matcher || !tree.children?.length) continue;

    const dynamicSubItems = navSubItemsFromTree(tree);
    if (dynamicSubItems.length === 0) continue;

    result = result.map((item) => {
      if (!matcher(item)) return item;

      const sectionName = tree.label ?? item.name;
      const hasNested = item.subItems?.some((s) => s.subItems?.length) ?? false;

      if (hasNested) {
        return {
          ...item,
          name: sectionName,
          subItems: mergeNavLabels(item.subItems ?? [], dynamicSubItems),
        };
      }

      if (tree.code === 'nav.productos_catalogo') {
        const dynamicPaths = new Set(dynamicSubItems.map((s) => s.path));
        const staticRest = (item.subItems ?? []).filter(
          (s) => !s.permissionCode || !dynamicPaths.has(s.path),
        );
        return {
          ...item,
          name: sectionName,
          subItems: [
            ...dynamicSubItems,
            ...staticRest.filter((s) => !dynamicSubItems.some((d) => d.path === s.path)),
          ],
        };
      }

      return { ...item, name: sectionName, subItems: dynamicSubItems };
    });
  }

  return result;
}

@Injectable({ providedIn: 'root' })
export class SidebarMenuService {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);

  getNavItems$(): Observable<NavItem[]> {
    const canAccess = (code?: string) => (code ? this.auth.hasPermission(code) : true);

    return this.api.getPermissionMenuTrees().pipe(
      map((trees) => {
        const merged = trees?.length ? mergeDynamicSections(MAIN_NAV_ITEMS, trees) : MAIN_NAV_ITEMS;
        return filterNavItems(merged, canAccess);
      }),
      catchError(() => of(filterNavItems(MAIN_NAV_ITEMS, canAccess))),
    );
  }
}
