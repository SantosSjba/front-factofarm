import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/icon/icon.component';

export type ShortcutLink = { label: string; path: string; desc: string; icon: string };

/**
 * Bloque de accesos directos: encabezado con ícono y una grilla de enlaces a otras pantallas.
 * Se usa en paneles que reúnen opciones (Reportes, Recepción farmacéutica…).
 */
@Component({
  selector: 'app-shortcut-section',
  standalone: true,
  imports: [IconComponent, RouterLink],
  host: { class: 'block' },
  template: `
    <section class="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <header class="mb-4 flex items-start gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl" [class]="tone">
          <app-icon [name]="icon" iconClass="size-5" />
        </span>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-gray-800 dark:text-white/90">{{ title }}</h2>
          @if (desc) {
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ desc }}</p>
          }
        </div>
      </header>
      <div class="grid gap-2" [class.sm:grid-cols-2]="columns === 2" [class.sm:grid-cols-3]="columns === 3">
        @for (link of links; track link.path) {
          <a
            [routerLink]="link.path"
            class="group flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-800 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
          >
            <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-brand-100 group-hover:text-brand-600 dark:bg-white/5 dark:text-gray-300 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400">
              <app-icon [name]="link.icon" iconClass="size-4" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-medium text-gray-800 dark:text-white/90">{{ link.label }}</span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">{{ link.desc }}</span>
            </span>
          </a>
        }
      </div>
    </section>
  `,
})
export class ShortcutSectionComponent {
  @Input({ required: true }) title!: string;
  @Input() desc = '';
  @Input() icon = 'mdi:link-variant';
  /** Clases de color del ícono del encabezado. */
  @Input() tone = 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400';
  @Input() links: ShortcutLink[] = [];
  @Input() columns: 1 | 2 | 3 = 2;
}
