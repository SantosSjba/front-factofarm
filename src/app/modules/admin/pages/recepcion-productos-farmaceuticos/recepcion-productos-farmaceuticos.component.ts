import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';

@Component({
  selector: 'app-recepcion-productos-farmaceuticos',
  standalone: true,
  imports: [RouterLink, BreadcrumbInlineComponent, PageToolbarComponent, ComponentCardComponent],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Compras' }, { label: 'Recepción farmacéutica' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Recepción de productos farmacéuticos</h1>
    </app-page-toolbar>
    <app-component-card className="mt-4">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        La recepción de mercadería y el control de lotes se gestionan en los módulos de compras e inventario.
      </p>
      <div class="mt-6 flex flex-wrap gap-4">
        <a routerLink="/recepcion-mercaderia" class="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600">
          Ir a recepción de mercadería
        </a>
        <a routerLink="/lotes" class="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold hover:border-brand-500 dark:border-gray-700">
          Control de lotes
        </a>
        <a routerLink="/inventario-movimientos" class="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold hover:border-brand-500 dark:border-gray-700">
          Movimientos de inventario
        </a>
      </div>
    </app-component-card>
  `,
})
export class RecepcionProductosFarmaceuticosComponent {}
