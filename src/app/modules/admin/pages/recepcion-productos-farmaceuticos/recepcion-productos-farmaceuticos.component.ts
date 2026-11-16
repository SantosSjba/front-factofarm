import { Component } from '@angular/core';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ShortcutSectionComponent, type ShortcutLink } from '../../../../shared/components/common/shortcut-section/shortcut-section.component';

@Component({
  selector: 'app-recepcion-productos-farmaceuticos',
  standalone: true,
  imports: [BreadcrumbInlineComponent, PageToolbarComponent, HelpPanelComponent, ShortcutSectionComponent],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Fármacos' }, { label: 'Recepción farmacéutica' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Recepción de productos farmacéuticos</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="recepcion-farmaceutica">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Reúne los pasos para recibir medicamentos: registrar lo que llega con su lote y vencimiento, y revisar después que el stock cuadre.</li>
        <li>Si compraste con orden de compra, usa «Recepción de mercadería». Si no, registra el ingreso en «Movimientos de inventario».</li>
      </ol>
    </app-help-panel>

    <app-shortcut-section
      title="Recibir mercadería"
      desc="Elige cómo registrar lo que llegó."
      icon="mdi:truck-check-outline"
      [links]="links"
    />
  `,
})
export class RecepcionProductosFarmaceuticosComponent {
  protected readonly links: ShortcutLink[] = [
    { label: 'Recepción de mercadería', path: '/recepcion-mercaderia', desc: 'Recibe una orden de compra: lotes, vencimientos y cantidades.', icon: 'mdi:truck-check-outline' },
    { label: 'Movimientos de inventario', path: '/inventario-movimientos', desc: 'Registra un ingreso sin orden de compra.', icon: 'mdi:swap-vertical' },
    { label: 'Lotes y vencimientos', path: '/lotes', desc: 'Revisa los lotes recibidos y sus fechas.', icon: 'mdi:calendar-alert' },
    { label: 'Cadena de frío', path: '/cadena-frio', desc: 'Temperaturas de los productos refrigerados.', icon: 'mdi:snowflake-thermometer' },
  ];
}
