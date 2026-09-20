import { Component, input } from '@angular/core';

export type SkeletonVariant =
  | 'line'
  | 'circle'
  | 'rect'
  | 'kpi'
  | 'kpi-grid'
  | 'card'
  | 'table'
  | 'chart'
  | 'list'
  | 'panel';

/**
 * Placeholders de carga (shimmer). Usar vía `app-page-state` `[skeleton]` o suelto.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div
      class="w-full"
      role="status"
      aria-live="polite"
      [attr.aria-label]="label()"
    >
      <span class="sr-only">{{ label() }}</span>

      @switch (variant()) {
        @case ('line') {
          <div class="ff-skel h-3 w-full rounded-md" [class]="className()" [style.width]="width() || null"></div>
        }
        @case ('circle') {
          <div
            class="ff-skel shrink-0 rounded-full"
            [class]="className()"
            [style.width]="width() || '2.75rem'"
            [style.height]="height() || width() || '2.75rem'"
          ></div>
        }
        @case ('rect') {
          <div
            class="ff-skel rounded-xl"
            [class]="className()"
            [style.width]="width() || '100%'"
            [style.height]="height() || '6rem'"
          ></div>
        }
        @case ('kpi') {
          <div
            class="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            <div class="ff-skel size-12 shrink-0 rounded-xl"></div>
            <div class="min-w-0 flex-1 space-y-2">
              <div class="ff-skel h-3 w-24 rounded-md"></div>
              <div class="ff-skel h-7 w-16 rounded-md"></div>
            </div>
          </div>
        }
        @case ('kpi-grid') {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
            @for (_ of items(); track $index) {
              <div
                class="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
              >
                <div class="ff-skel size-12 shrink-0 rounded-xl"></div>
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="ff-skel h-3 w-24 rounded-md"></div>
                  <div class="ff-skel h-7 w-16 rounded-md"></div>
                </div>
              </div>
            }
          </div>
        }
        @case ('card') {
          <div class="space-y-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div class="ff-skel h-4 w-1/3 max-w-[12rem] rounded-md"></div>
            <div class="ff-skel h-3 w-full rounded-md"></div>
            <div class="ff-skel h-3 w-4/5 max-w-full rounded-md"></div>
            <div class="ff-skel h-3 w-2/3 max-w-full rounded-md"></div>
          </div>
        }
        @case ('table') {
          <div
            class="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
          >
            <div
              class="flex gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]"
            >
              @for (_ of [1, 2, 3, 4]; track $index) {
                <div class="ff-skel h-3 flex-1 rounded-md"></div>
              }
            </div>
            <div class="divide-y divide-gray-50 dark:divide-white/[0.03]">
              @for (_ of items(); track $index) {
                <div class="flex gap-4 px-5 py-3.5">
                  @for (__ of [1, 2, 3, 4]; track $index) {
                    <div
                      class="ff-skel h-3.5 flex-1 rounded-md"
                      [style.opacity]="0.55 + ($index % 3) * 0.1"
                    ></div>
                  }
                </div>
              }
            </div>
          </div>
        }
        @case ('list') {
          <div class="space-y-3">
            @for (_ of items(); track $index) {
              <div
                class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
              >
                <div class="ff-skel size-10 shrink-0 rounded-lg"></div>
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="ff-skel h-3.5 w-40 max-w-[45%] rounded-md"></div>
                  <div class="ff-skel h-3 w-56 max-w-[65%] rounded-md"></div>
                </div>
                <div class="ff-skel h-8 w-16 shrink-0 rounded-lg"></div>
              </div>
            }
          </div>
        }
        @case ('chart') {
          <div
            class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            <div class="mb-6 flex items-end justify-between gap-2">
              <div class="space-y-2">
                <div class="ff-skel h-4 w-40 rounded-md"></div>
                <div class="ff-skel h-3 w-56 rounded-md"></div>
              </div>
              <div class="ff-skel h-8 w-24 rounded-lg"></div>
            </div>
            <div class="flex h-[220px] items-end gap-2 sm:gap-3">
              @for (h of chartBars(); track $index) {
                <div class="flex flex-1 flex-col justify-end">
                  <div class="ff-skel w-full rounded-t-md" [style.height]="h"></div>
                </div>
              }
            </div>
          </div>
        }
        @case ('panel') {
          <div class="space-y-6">
            <div class="space-y-2">
              <div class="ff-skel h-7 w-56 rounded-md"></div>
              <div class="ff-skel h-3 w-72 max-w-full rounded-md"></div>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
              @for (_ of items(); track $index) {
                <div
                  class="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <div class="ff-skel size-12 shrink-0 rounded-xl"></div>
                  <div class="min-w-0 flex-1 space-y-2">
                    <div class="ff-skel h-3 w-24 rounded-md"></div>
                    <div class="ff-skel h-7 w-16 rounded-md"></div>
                  </div>
                </div>
              }
            </div>
            <div
              class="ff-skel h-56 w-full rounded-2xl"
            ></div>
          </div>
        }
      }
    </div>
  `,
})
export class SkeletonComponent {
  readonly variant = input<SkeletonVariant>('list');
  /** Filas / cards a repetir (kpi-grid, table, list, panel). */
  readonly count = input(4);
  readonly label = input('Cargando…');
  readonly className = input('');
  readonly width = input<string | undefined>(undefined);
  readonly height = input<string | undefined>(undefined);

  protected items(): number[] {
    const n = Math.max(1, Math.min(12, this.count()));
    return Array.from({ length: n }, (_, i) => i);
  }

  protected chartBars(): string[] {
    const heights = ['40%', '65%', '45%', '80%', '55%', '70%', '50%', '85%', '60%', '48%', '72%', '58%'];
    const n = Math.max(6, Math.min(14, this.count() > 4 ? this.count() : 12));
    return heights.slice(0, n);
  }
}
