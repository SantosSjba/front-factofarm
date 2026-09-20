import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SidebarService } from '../../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantBrandingService } from '../../../core/services/tenant-branding.service';
import { ThemeToggleButtonComponent } from '../../components/common/theme-toggle/theme-toggle-button.component';
import { NotificationDropdownComponent } from '../../components/header/notification-dropdown/notification-dropdown.component';
import { UserDropdownComponent } from '../../components/header/user-dropdown/user-dropdown.component';
import { IconComponent } from '../../components/ui/icon/icon.component';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { MAIN_NAV_ITEMS, NavItem, NavSubItem } from '../app-sidebar/sidebar-menu.config';

type SearchMenuOption = {
  name: string;
  path: string;
  section: string;
};

type QuickLink = {
  label: string;
  path: string;
  icon: string;
  permissionCode: string;
};

/** Mismo corte que el sidebar docked (`xl` / 1280px). */
const DESKTOP_SIDEBAR_MQ = '(min-width: 1280px)';

const QUICK_LINKS: QuickLink[] = [
  {
    label: 'Punto de venta',
    path: '/punto-venta',
    icon: 'mdi:point-of-sale',
    permissionCode: 'nav.punto_venta',
  },
  {
    label: 'Caja',
    path: '/caja-chica-pos',
    icon: 'mdi:cash-register',
    permissionCode: 'nav.caja_chica_pos',
  },
  {
    label: 'Productos',
    path: '/productos',
    icon: 'mdi:pill',
    permissionCode: 'nav.productos',
  },
  {
    label: 'Clientes',
    path: '/clientes',
    icon: 'mdi:account-outline',
    permissionCode: 'nav.clientes_list',
  },
  {
    label: 'Recepción',
    path: '/recepcion-mercaderia',
    icon: 'mdi:truck-delivery-outline',
    permissionCode: 'nav.recepcion_mercaderia',
  },
  {
    label: 'Panel',
    path: '/dashboard',
    icon: 'mdi:view-dashboard-outline',
    permissionCode: 'nav.dashboard_admin',
  },
];

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleButtonComponent,
    NotificationDropdownComponent,
    UserDropdownComponent,
    IconComponent,
    TooltipDirective,
  ],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  protected readonly branding = inject(TenantBrandingService);

  protected readonly tenantLabel = computed(() => {
    const user = this.auth.user();
    if (!user || this.auth.isPlatformAdmin() || this.auth.isSupportSession()) return null;
    return user.tenantNombre ?? 'Mi farmacia';
  });

  protected readonly supportBanner = computed(() => {
    if (!this.auth.isSupportSession()) return null;
    const name = this.auth.user()?.tenantNombre ?? 'cliente';
    return `Soporte FactoSys · ${name}`;
  });

  /** Accesos directos filtrados por permiso del usuario. */
  protected readonly quickLinks = computed(() =>
    QUICK_LINKS.filter((link) => this.auth.hasPermission(link.permissionCode)),
  );

  /** Sidebar permanente (docked). En este modo el logo vive solo en el sidebar. */
  protected readonly isDesktopSidebar = signal(
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_SIDEBAR_MQ).matches : false,
  );

  /** Ancho de viewport para accesos (actualiza en resize). */
  protected readonly viewportWidth = signal(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );

  private desktopMq?: MediaQueryList;
  private readonly onDesktopMqChange = (event: MediaQueryListEvent) => {
    this.isDesktopSidebar.set(event.matches);
    if (event.matches) this.sidebarService.setMobileOpen(false);
  };
  private readonly onWindowResize = () => {
    this.viewportWidth.set(window.innerWidth);
  };

  protected endSupportSession(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/signin');
  }

  isMobileSearchOpen = false;
  readonly isMobileOpen$;
  /** Drawer móvil abierto (logo del header se oculta: el drawer ya lo muestra). */
  protected readonly isMobileOpen;
  searchTerm = '';
  isSearchDropdownOpen = false;
  readonly searchOptions: SearchMenuOption[] = this.buildSearchOptions();

  /** Logo en header: solo móvil/tablet con menú cerrado. */
  protected readonly showHeaderLogo = computed(
    () => !this.isDesktopSidebar() && !this.isMobileOpen(),
  );

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mobileSearchInput') mobileSearchInput?: ElementRef<HTMLInputElement>;

  constructor(
    public sidebarService: SidebarService,
    private readonly router: Router,
  ) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isMobileOpen = toSignal(this.sidebarService.isMobileOpen$, { initialValue: false });
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleMobileSearch() {
    this.isMobileSearchOpen = !this.isMobileSearchOpen;
    if (this.isMobileSearchOpen) {
      this.isSearchDropdownOpen = true;
      setTimeout(() => this.mobileSearchInput?.nativeElement.focus(), 0);
    } else {
      this.isSearchDropdownOpen = false;
    }
  }

  ngAfterViewInit() {
    document.addEventListener('keydown', this.handleKeyDown);
    if (typeof window === 'undefined') return;
    this.desktopMq = window.matchMedia(DESKTOP_SIDEBAR_MQ);
    this.isDesktopSidebar.set(this.desktopMq.matches);
    this.viewportWidth.set(window.innerWidth);
    this.desktopMq.addEventListener('change', this.onDesktopMqChange);
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.desktopMq?.removeEventListener('change', this.onDesktopMqChange);
    window.removeEventListener('resize', this.onWindowResize);
  }

  /** Cuántos accesos mostrar según ancho. */
  protected quickLinkVisible(index: number): boolean {
    if (index < 2) return true;
    const w = this.viewportWidth();
    if (index < 4) return w >= 640;
    return w >= 1024;
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.isSearchDropdownOpen = false;
      this.isMobileSearchOpen = false;
      this.sidebarService.setMobileOpen(false);
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      if (window.innerWidth < 768) {
        this.isMobileSearchOpen = true;
        this.isSearchDropdownOpen = true;
        setTimeout(() => this.mobileSearchInput?.nativeElement.focus(), 0);
        return;
      }
      this.searchInput?.nativeElement.focus();
      this.isSearchDropdownOpen = true;
    }
  };

  onSearchFocus() {
    this.isSearchDropdownOpen = true;
  }

  onSearchInput(value: string) {
    this.searchTerm = value;
    this.isSearchDropdownOpen = true;
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isSearchDropdownOpen = false;
    }, 120);
  }

  get filteredSearchOptions(): SearchMenuOption[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return this.searchOptions.slice(0, 10);
    return this.searchOptions
      .filter((option) =>
        `${option.section} ${option.name}`.toLowerCase().includes(query),
      )
      .slice(0, 12);
  }

  navigateToOption(path: string) {
    this.router.navigateByUrl(path);
    this.searchTerm = '';
    this.isSearchDropdownOpen = false;
    this.isMobileSearchOpen = false;
  }

  onSearchEnter() {
    const firstResult = this.filteredSearchOptions[0];
    if (!firstResult) return;
    this.navigateToOption(firstResult.path);
  }

  private buildSearchOptions(): SearchMenuOption[] {
    const options: SearchMenuOption[] = [];
    MAIN_NAV_ITEMS.forEach((item) => this.flattenMenuItem(item, options, []));
    return options;
  }

  private flattenMenuItem(
    item: NavItem | NavSubItem,
    bucket: SearchMenuOption[],
    parents: string[],
  ) {
    const currentParents = [...parents, item.name];
    if (item.path) {
      if (item.permissionCode && !this.auth.hasPermission(item.permissionCode)) return;
      bucket.push({
        name: item.name,
        path: item.path,
        section: parents.join(' / ') || item.name,
      });
    }
    (item.subItems ?? []).forEach((subItem) =>
      this.flattenMenuItem(subItem, bucket, currentParents),
    );
  }
}
