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

const DYNAMIC_ROOT_CODE = 'nav.usuarios_series';

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

function mergeDynamicSection(staticNav: NavItem[], tree: PermissionMenuNodeDto | null): NavItem[] {
  if (!tree?.children?.length) return staticNav;

  const dynamicSubItems = navSubItemsFromTree(tree);
  if (dynamicSubItems.length === 0) return staticNav;

  return staticNav.map((item) => {
    const hasManagedChild = item.subItems?.some((s) => s.permissionCode?.startsWith('nav.'));
    if (!hasManagedChild) return item;
    return {
      ...item,
      name: tree.label ?? item.name,
      subItems: dynamicSubItems,
    };
  });
}

@Injectable({ providedIn: 'root' })
export class SidebarMenuService {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);

  getNavItems$(): Observable<NavItem[]> {
    const canAccess = (code?: string) => (code ? this.auth.hasPermission(code) : true);

    return this.api.getPermissionMenuTree().pipe(
      map((tree) => {
        const merged =
          tree?.code === DYNAMIC_ROOT_CODE
            ? mergeDynamicSection(MAIN_NAV_ITEMS, tree)
            : MAIN_NAV_ITEMS;
        return filterNavItems(merged, canAccess);
      }),
      catchError(() => of(filterNavItems(MAIN_NAV_ITEMS, canAccess))),
    );
  }
}
