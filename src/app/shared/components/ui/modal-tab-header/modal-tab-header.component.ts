import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  TabStripComponent,
  type TabStripItem,
} from '../tab-strip/tab-strip.component';

/**
 * Cabecera de modal con título + {@link TabStripComponent}.
 * Dentro de `app-modal`, envolver en `<div data-modal-header>` (hijo directo del modal)
 * para que el slot de cabecera proyecte bien; el host de un componente no siempre matchea el `select`.
 */
@Component({
  selector: 'app-modal-tab-header',
  standalone: true,
  imports: [CommonModule, TabStripComponent],
  templateUrl: './modal-tab-header.component.html',
})
export class ModalTabHeaderComponent {
  readonly title = input('');
  readonly titleClass = input(
    'mb-4 text-lg font-semibold text-gray-800 dark:text-white/90',
  );
  readonly hostClass = input(
    'shrink-0 border-b border-gray-100 px-4 pb-4 pt-4 dark:border-gray-800 sm:px-8 sm:pb-5 sm:pt-6',
  );
  readonly tabs = input.required<TabStripItem[]>();
  readonly activeId = input.required<string>();
  readonly tabChange = output<string>();

  protected selectTab(id: string) {
    this.tabChange.emit(id);
  }
}
