import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, ChangeDetectorRef } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { IconComponent } from '../../components/ui/icon/icon.component';
import { combineLatest, Subscription } from 'rxjs';

type NavSubItem = {
  name: string;
  path?: string;
  pro?: boolean;
  new?: boolean;
  subItems?: NavSubItem[];
};

type NavItem = {
  name: string;
  icon: string;
  path?: string;
  new?: boolean;
  subItems?: NavSubItem[];
};

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {

  /** Menú principal FactoFarm. */
  navItems: NavItem[] = [
    {
      icon: 'lucide:layout-dashboard',
      name: 'Dashboard',
      subItems: [
        { name: 'Dashboard Admin', path: '/dashboard' },
      ]
    },
    {
      icon: 'lucide:users',
      name: 'Usuarios/Establecimientos',
      subItems: [
        { name: 'Usuarios', path: '/usuarios' },
        { name: 'Establecimientos', path: '/establecimientos' },
      ],
    },
    {
      icon: 'lucide:users-round',
      name: 'Clientes',
      subItems: [
        { name: 'Clientes', path: '/clientes' },
        { name: 'Tipos de Clientes', path: '/tipo-clientes' },
      ],
    },
    {
      icon: 'lucide:package-search',
      name: 'Productos/Servicios',
      subItems: [
        { name: 'Productos', path: '/productos' },
        { name: 'Conjuntos/Packs/Promociones', path: '/conjuntos-packs-promociones' },
        { name: 'Servicios', path: '/servicios' },
        { name: 'Categorías', path: '/categorias' },
        { name: 'Marcas', path: '/marcas' },
        { name: 'Series', path: '/series' },
        { name: 'Zonas', path: '/zonas' },
        { name: 'Importar Precios', path: '/importar-precios' },
      ]
    },
    {
      icon: 'lucide:shopping-cart',
      name: 'POS',
      subItems: [
        { name: 'Punto de Venta', path: '/punto-venta' },
        { name: 'Caja Chica POS', path: '/caja-chica-pos' },
      ],
    },
    {
      icon: 'lucide:receipt-text',
      name: 'Ventas',
      subItems: [
        { name: 'Comprobante electrónico', path: '/comprobante-electronico' },
        { name: 'Notas de venta', path: '/notas-venta' },
        {
          name: 'Resúmenes - Anulaciones',
          subItems: [
            { name: 'Resúmenes', path: '/resumenes' },
            { name: 'Anulaciones', path: '/anulaciones' },
          ]
        },
        { name: 'Cotizaciones', path: '/cotizaciones' },
      ],
    },
    {
      icon: 'lucide:boxes',
      name: 'Inventario',
      subItems: [
        { name: 'Movimientos', path: '/inventario-movimientos' },
        { name: 'Traslados', path: '/traslados' },
        { name: 'Devolución-retiro', path: '/devolucion-retiro' },
        { name: 'Reporte Kardex', path: '/reporte-kardex' },
        { name: 'Reporte Inventario', path: '/reporte-inventario' },
        { name: 'Kardex valorizado', path: '/kardex-valorizado' },
        { name: 'Lotes', path: '/lotes' },
      ],
    },
    {
      icon: 'lucide:file-check-2',
      name: 'Comprobantes Avanzados',
      subItems: [
        { name: 'Retenciones', path: '/retenciones' },
        { name: 'Percepciones', path: '/percepciones' },
        { name: 'Órdenes de pedido', path: '/ordenes-pedido' },
      ],
    },
    {
      icon: 'lucide:truck',
      name: 'Guías de remisión',
      subItems: [
        { name: 'G.R. Remitente', path: '/gr-remitente' },
        { name: 'G.R. Transportista', path: '/gr-transportista' },
        { name: 'Transportistas', path: '/transportistas' },
        { name: 'Conductores', path: '/conductores' },
        { name: 'Vehículos', path: '/vehiculos' },
        { name: 'Direcciones de partida', path: '/direcciones-partida' },
      ],
    },
    {
      icon: 'lucide:chart-no-axes-column',
      name: 'Reportes',
      path: '/reportes',
    },
    {
      icon: 'lucide:calculator',
      name: 'Contabilidad',
      subItems: [
        { name: 'Exportar Reporte', path: '/contabilidad-exportar-reporte' },
        { name: 'Resumen de venta', path: '/contabilidad-resumen-venta' },
        { name: 'Exportar formatos sistema contable', path: '/contabilidad-exportar-formatos' },
        { name: 'Reporte resumido de ventas', path: '/contabilidad-reporte-resumido' },
        { name: 'Libro Mayor', path: '/libro-mayor' },
        {
          name: 'SIRE',
          subItems: [
            { name: 'Ventas', path: '/sire-ventas' },
            { name: 'Compras', path: '/sire-compras' },
          ]
        },
      ],
    },
    {
      icon: 'lucide:wallet',
      name: 'Finanzas',
      subItems: [
        { name: 'Movimientos', path: '/finanzas-movimientos' },
        { name: 'Transacciones', path: '/transacciones' },
        { name: 'Ingresos', path: '/finanzas-ingresos' },
        { name: 'Cuentas por cobrar', path: '/cuentas-cobrar' },
        { name: 'Cuentas por pagar', path: '/cuentas-pagar' },
        { name: 'Pagos', path: '/pagos' },
        { name: 'Balance', path: '/balance' },
        { name: 'Ingresos y Egresos M. pago', path: '/ingresos-egresos-medio-pago' },
      ],
    },
    {
      icon: 'lucide:pill',
      name: 'Fármacos',
      subItems: [
        { name: 'Reporte Digemid', path: '/reporte-digemid' },
        { name: 'Médicos', path: '/medicos' },
        { name: 'CIE 10', path: '/cie-10' },
        { name: 'Reporte de psicotrópicos y estupefacientes', path: '/reporte-psicotropicos-estupefacientes' },
        { name: 'Recepción de productos farmacéuticos', path: '/recepcion-productos-farmaceuticos' },
      ],
    }
  ];

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
    // Subscribe to router events
    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      })
    );

    // Subscribe to combined observables to close submenus when all are false
    this.subscription.add(
      combineLatest([this.isExpanded$, this.isMobileOpen$, this.isHovered$]).subscribe(
        ([isExpanded, isMobileOpen, isHovered]) => {
          if (!isExpanded && !isMobileOpen && !isHovered) {
            // this.openSubmenu = null;
            // this.savedSubMenuHeights = { ...this.subMenuHeights };
            // this.subMenuHeights = {};
            this.cdr.detectChanges();
          } else {
            // Restore saved heights when reopening
            // this.subMenuHeights = { ...this.savedSubMenuHeights };
            // this.cdr.detectChanges();
          }
        }
      )
    );

    // Initial load
    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy() {
    // Clean up subscriptions
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
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;
    } else {
      this.openSubmenu = key;

      setTimeout(() => {
        const el = document.getElementById(key);
        if (el) {
          this.subMenuHeights[key] = el.scrollHeight;
          this.cdr.detectChanges(); // Ensure UI updates
        }
      });
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

              setTimeout(() => {
                const el = document.getElementById(key);
                if (el) {
                  this.subMenuHeights[key] = el.scrollHeight;
                  this.cdr.detectChanges(); // Ensure UI updates
                }
              });
            }
          });
        }
      });
    });
  }

  private getNestedSubmenuKey(parentKey: string, index: number): string {
    return `${parentKey}-nested-${index}`;
  }

  onSubmenuClick() {
    console.log('click submenu');
    this.isMobileOpen$.subscribe(isMobile => {
      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }
    }).unsubscribe();
  }


}
