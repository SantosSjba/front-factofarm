import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

export type TabStripItem = { id: string; label: string };

/** Pestañas estilo subrayado (admin / formularios). */
@Component({
  selector: 'app-tab-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-strip.component.html',
})
export class TabStripComponent {
  readonly tabs = input.required<TabStripItem[]>();
  readonly activeId = input.required<string>();
  readonly tabChange = output<string>();

  protected select(id: string) {
    this.tabChange.emit(id);
  }
}
