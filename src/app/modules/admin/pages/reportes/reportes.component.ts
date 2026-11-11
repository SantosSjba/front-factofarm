import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { canOpenRoute } from '../../../../core/utils/route-access';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { DirectoryApiService } from '../../services/directory-api.service';

type ReportLink = { label: string; path: string; desc: string; icon: string };
type ReportSection = { title: string; desc: string; icon: string; tone: string; links: ReportLink[] };

const SECTIONS: ReportSection[] = [
  {
    title: 'Ventas y caja',
    desc: 'Qué se vendió, a quién y cómo se cobró.',
    icon: 'mdi:cart-outline',
    tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    links: [
      { label: 'Productos vendidos', path: '/reporte-productos-vendidos', desc: 'Cada producto vendido, del más reciente al más antiguo.', icon: 'mdi:pill' },
      { label: 'Historial de ventas', path: '/notas-venta', desc: 'Todas las ventas con su comprobante y estado.', icon: 'mdi:receipt-text-outline' },
      { label: 'Comprobantes electrónicos', path: '/comprobante-electronico', desc: 'Boletas, facturas y notas enviadas a SUNAT.', icon: 'mdi:file-certificate-outline' },
      { label: 'Historial de cajas', path: '/historial-cajas', desc: 'Turnos de caja con su arqueo y diferencias.', icon: 'mdi:cash-register' },
    ],
  },
  {
    title: 'Inventario',
    desc: 'Stock, movimientos y valor de la mercadería.',
    icon: 'mdi:package-variant-closed',
    tone: 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10 dark:text-blue-light-400',
    links: [
      { label: 'Kardex', path: '/reporte-kardex', desc: 'Entradas, salidas y saldo de un producto.', icon: 'mdi:swap-vertical' },
      { label: 'Inventario valorizado', path: '/kardex-valorizado', desc: 'Cuánto vale tu stock, por producto y almacén.', icon: 'mdi:cash-multiple' },
      { label: 'Conteo físico', path: '/reporte-inventario', desc: 'Conteos de almacén y sus diferencias.', icon: 'mdi:clipboard-check-outline' },
      { label: 'Lotes y vencimientos', path: '/lotes', desc: 'Lotes vencidos o por vencer.', icon: 'mdi:calendar-alert' },
      { label: 'Compras sugeridas', path: '/reporte-compras-sugerido', desc: 'Qué reponer según lo que se vende.', icon: 'mdi:cart-arrow-down' },
    ],
  },
  {
    title: 'Farmacia y DIGEMID',
    desc: 'Reportes que pide la autoridad sanitaria.',
    icon: 'mdi:shield-check-outline',
    tone: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
    links: [
      { label: 'Reporte DIGEMID', path: '/reporte-digemid', desc: 'Precios y ventas de productos regulados.', icon: 'mdi:file-chart-outline' },
      { label: 'Psicotrópicos y estupefacientes', path: '/reporte-psicotropicos-estupefacientes', desc: 'Libro de control de sustancias.', icon: 'mdi:pill-multiple' },
    ],
  },
  {
    title: 'Finanzas y contabilidad',
    desc: 'Dinero que entra y sale, márgenes y libros.',
    icon: 'mdi:chart-line',
    tone: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
    links: [
      { label: 'Flujo de caja', path: '/finanzas-movimientos', desc: 'Ingresos y egresos del periodo.', icon: 'mdi:chart-line' },
      { label: 'Balance y margen', path: '/balance', desc: 'Rentabilidad por producto.', icon: 'mdi:scale-balance' },
      { label: 'Resumen de venta', path: '/contabilidad-resumen-venta', desc: 'Ventas agrupadas para contabilidad.', icon: 'mdi:table-large' },
      { label: 'Reporte resumido', path: '/contabilidad-reporte-resumido', desc: 'Totales del periodo en una vista.', icon: 'mdi:file-document-outline' },
      { label: 'Exportar reporte contable', path: '/contabilidad-exportar-reporte', desc: 'Archivo para tu contador.', icon: 'mdi:file-export-outline' },
      { label: 'Libros electrónicos (PLE)', path: '/contabilidad-exportar-formatos', desc: 'Formatos PLE de SUNAT.', icon: 'mdi:book-open-variant' },
      { label: 'Libro mayor', path: '/libro-mayor', desc: 'Movimientos por cuenta contable.', icon: 'mdi:book-outline' },
    ],
  },
];

/** Panel de reportes: accesos agrupados por tema y un resumen del mes. */
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [RouterLink, BreadcrumbInlineComponent, HelpPanelComponent, IconComponent, KpiTileComponent, PageToolbarComponent],
  templateUrl: './reportes.component.html',
})
export class ReportesComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(DirectoryApiService);
  private readonly locale = inject(LocaleService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Reportes' }];
  private readonly from = this.locale.monthStartYmd();
  private readonly to = this.locale.todayYmd();
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  private readonly qty = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });

  /** Solo los reportes que el usuario puede abrir; secciones vacías no se muestran. */
  protected readonly sections = SECTIONS.map((s) => ({
    ...s,
    links: s.links.filter((l) => canOpenRoute(l.path, (code) => this.auth.hasPermission(code))),
  })).filter((s) => s.links.length);

  private readonly canSales = canOpenRoute('/reporte-productos-vendidos', (c) => this.auth.hasPermission(c));

  protected readonly monthQuery = injectQuery(() => ({
    queryKey: ['sales', 'items-report', 'month', this.from, this.to] as const,
    enabled: this.canSales,
    queryFn: () => firstValueFrom(this.api.listSoldItems({ page: 1, pageSize: 1, from: this.from, to: this.to })),
  }));
  protected readonly month = computed(() => {
    const t = this.monthQuery.data()?.totales;
    if (!t) return null;
    const ticket = t.ventas ? Number(t.monto) / t.ventas : 0;
    return {
      monto: this.pen.format(Number(t.monto)),
      ventas: `${t.ventas}`,
      unidades: this.qty.format(Number(t.unidades)),
      lineas: `${t.lineas} productos vendidos`,
      ticket: this.pen.format(ticket),
    };
  });
  protected readonly monthLink = { from: this.from, to: this.to };
}
