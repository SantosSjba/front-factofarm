import { describe, expect, it } from 'vitest';
import { sidebarHelp } from './sidebar-help';
import { MAIN_NAV_ITEMS, type NavItem, type NavSubItem } from './sidebar-menu.config';

function walk(items: (NavItem | NavSubItem)[]): (NavItem | NavSubItem)[] {
  return items.flatMap((item) => [item, ...walk(item.subItems ?? [])]);
}

describe('sidebarHelp', () => {
  it('toda opción del menú explica para qué sirve', () => {
    const missing = walk(MAIN_NAV_ITEMS)
      .filter((item) => !sidebarHelp(item))
      .map((item) => item.name);
    expect(missing).toEqual([]);
  });
});
