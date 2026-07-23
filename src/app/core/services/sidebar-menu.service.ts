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
  'nav.platform': (item) => item.name === 'Plataforma',
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

/**
 * Combina el menú estático con el árbol del API.
 * Prioriza el orden/rutas del config (p. ej. «Mi farmacia» y «Establecimientos»
 * pueden compartir `nav.establecimientos` con paths distintos).
 */
function mergeSectionSubItems(
  staticSubs: NavSubItem[],
  dynamicSubs: NavSubItem[],
): NavSubItem[] {
  const dynamicByPath = new Map(
    dynamicSubs.filter((d) => d.path).map((d) => [d.path!, d] as const),
  );
  const usedPaths = new Set<string>();
  const result: NavSubItem[] = [];

  for (const s of staticSubs) {
    if (s.subItems?.length) {
      result.push({
        ...s,
        subItems: mergeSectionSubItems(s.subItems, dynamicSubs),
      });
      continue;
    }
    if (!s.path) continue;

    const dyn = dynamicByPath.get(s.path);
    if (dyn) {
      result.push({
        ...s,
        name: dyn.name ?? s.name,
        permissionCode: dyn.permissionCode ?? s.permissionCode,
      });
    } else {
      // Ítem solo en el front (misma permiso, otra ruta): conservar.
      result.push(s);
    }
    usedPaths.add(s.path);
  }

  for (const d of dynamicSubs) {
    if (d.path && !usedPaths.has(d.path)) {
      result.push(d);
      usedPaths.add(d.path);
    }
  }

  return result;
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

      return {
        ...item,
        name: sectionName,
        subItems: mergeSectionSubItems(item.subItems ?? [], dynamicSubItems),
      };
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
