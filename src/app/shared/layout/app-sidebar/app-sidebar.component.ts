import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, ChangeDetectorRef, inject, OnDestroy, OnInit } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { IconComponent } from '../../components/ui/icon/icon.component';
import { Subscription } from 'rxjs';
import { SidebarMenuService } from '../../../core/services/sidebar-menu.service';
import { TenantBrandingService } from '../../../core/services/tenant-branding.service';
import { NavItem, NavSubItem } from './sidebar-menu.config';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent implements OnInit, OnDestroy {
  private readonly sidebarMenu = inject(SidebarMenuService);
  protected readonly branding = inject(TenantBrandingService);

  navItems: NavItem[] = [];
  othersItems: NavItem[] = [];

  openSubmenu: string | null | number = null;
  subMenuHeights: { [key: string]: number } = {};
  nestedSubmenuOpen: Record<string, boolean> = {};
  @ViewChildren('subMenu') subMenuRefs!: QueryList<ElementRef>;

  readonly isExpanded$;
  readonly isMobileOpen$;
  readonly isHovered$;

  private subscription: Subscription = new Subscription();

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isHovered$ = this.sidebarService.isHovered$;
  }

  ngOnInit() {
    this.subscription.add(
      this.sidebarMenu.getNavItems$().subscribe((items) => {
        this.navItems = items;
        this.setActiveMenuFromRoute(this.router.url);
        this.cdr.detectChanges();
      }),
    );

    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      })
    );

    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  isSubItemActive(subItem: NavSubItem): boolean {
    if (subItem.path && this.isActive(subItem.path)) return true;
    return (subItem.subItems ?? []).some((child) => this.isSubItemActive(child));
  }

  isNestedSubmenuOpen(parentKey: string, index: number): boolean {
    return this.nestedSubmenuOpen[this.getNestedSubmenuKey(parentKey, index)] ?? false;
  }

  toggleNestedSubmenu(parentKey: string, index: number) {
    const key = this.getNestedSubmenuKey(parentKey, index);
    this.nestedSubmenuOpen[key] = !this.nestedSubmenuOpen[key];
    // Primero pintar hijos anidados; luego medir altura del contenedor padre.
    this.cdr.detectChanges();
    this.updateSubmenuHeight(parentKey);
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;
    } else {
      this.openSubmenu = key;
      this.cdr.detectChanges();
      this.updateSubmenuHeight(key);
    }
  }

  onSidebarMouseEnter() {
    this.isExpanded$.subscribe(expanded => {
      if (!expanded) {
        this.sidebarService.setHovered(true);
      }
    }).unsubscribe();
  }

  private setActiveMenuFromRoute(currentUrl: string) {
    const menuGroups = [
      { items: this.navItems, prefix: 'main' },
      { items: this.othersItems, prefix: 'others' },
    ];

    menuGroups.forEach(group => {
      group.items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem, subIndex) => {
            if (this.isSubItemActive(subItem)) {
              const key = `${group.prefix}-${i}`;
              this.openSubmenu = key;
              if (subItem.subItems?.length) {
                this.nestedSubmenuOpen[this.getNestedSubmenuKey(key, subIndex)] = true;
              }
              this.cdr.detectChanges();
              this.updateSubmenuHeight(key);
            }
          });
        }
      });
    });
  }

  private getNestedSubmenuKey(parentKey: string, index: number): string {
    return `${parentKey}-nested-${index}`;
  }

  private updateSubmenuHeight(key: string) {
    // Medir en el siguiente frame para incluir submenús anidados ya renderizados.
    // Si medimos con height fija previa, overflow:hidden puede recortar hermanos.
    requestAnimationFrame(() => {
      const el = document.getElementById(key);
      if (!el) return;
      const previousHeight = el.style.height;
      el.style.height = 'auto';
      const measured = el.scrollHeight;
      el.style.height = previousHeight;
      this.subMenuHeights[key] = measured;
      this.cdr.detectChanges();
    });
  }

  onSubmenuClick() {
    this.isMobileOpen$.subscribe(isMobile => {
      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }
    }).unsubscribe();
  }
}
