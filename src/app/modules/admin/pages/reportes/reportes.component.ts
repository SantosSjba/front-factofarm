import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';

const REPORT_LINKS = [
  { label: 'Reporte DIGEMID', path: '/reporte-digemid', desc: 'Ventas farmacéuticas reguladas' },
  { label: 'Psicotrópicos y estupefacientes', path: '/reporte-psicotropicos-estupefacientes', desc: 'Control de sustancias' },
  { label: 'Kardex', path: '/reporte-kardex', desc: 'Movimientos de inventario' },
  { label: 'Kardex valorizado', path: '/kardex-valorizado', desc: 'Inventario con valorización' },
  { label: 'Inventario', path: '/reporte-inventario', desc: 'Stock actual por producto' },
  { label: 'Compras sugeridas', path: '/reporte-compras-sugerido', desc: 'Reposición automática' },
  { label: 'Flujo de caja', path: '/finanzas-movimientos', desc: 'Ingresos y egresos del periodo' },
  { label: 'Balance y margen', path: '/balance', desc: 'Rentabilidad por producto' },
  { label: 'Exportar formatos PLE', path: '/contabilidad-exportar-formatos', desc: 'Libros electrónicos SUNAT' },
] as const;

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [RouterLink, BreadcrumbInlineComponent, PageToolbarComponent, ComponentCardComponent],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Reportes' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Panel de reportes</h1>
    </app-page-toolbar>
    <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      @for (link of links; track link.path) {
        <a [routerLink]="link.path" class="block rounded-xl border border-gray-200 p-4 transition hover:border-brand-500 hover:shadow-sm dark:border-gray-800">
          <p class="font-semibold text-gray-800 dark:text-white">{{ link.label }}</p>
          <p class="mt-1 text-sm text-gray-500">{{ link.desc }}</p>
        </a>
      }
    </div>
    <app-component-card title="Contabilidad" className="mt-6">
      <div class="flex flex-wrap gap-3 text-sm">
        <a routerLink="/contabilidad-exportar-reporte" class="text-brand-600 hover:underline">Exportar reporte contable</a>
        <a routerLink="/contabilidad-resumen-venta" class="text-brand-600 hover:underline">Resumen de venta</a>
        <a routerLink="/contabilidad-reporte-resumido" class="text-brand-600 hover:underline">Reporte resumido</a>
        <a routerLink="/libro-mayor" class="text-brand-600 hover:underline">Libro mayor</a>
      </div>
    </app-component-card>
  `,
})
export class ReportesComponent {
  protected readonly links = REPORT_LINKS;
}
