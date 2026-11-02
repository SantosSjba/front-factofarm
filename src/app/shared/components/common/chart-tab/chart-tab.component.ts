import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

export type ChartTabOption = { id: string; label: string };

/** Control segmentado compacto (periodo de un dashboard, vista de un gráfico…). */
@Component({
  selector: 'app-chart-tab',
  imports: [CommonModule],
  templateUrl: './chart-tab.component.html',
})
export class ChartTabComponent {
  readonly options = input.required<ChartTabOption[]>();
  readonly value = input.required<string>();
  readonly ariaLabel = input('Opciones');
  readonly valueChange = output<string>();

  protected buttonClass(id: string): string {
    return this.value() === id
      ? 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
      : 'text-gray-500 dark:text-gray-400';
  }
}
