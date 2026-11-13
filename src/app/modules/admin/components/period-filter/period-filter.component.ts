import { booleanAttribute, Component, computed, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../core/services/locale.service';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

export type Period = { from: string; to: string };

/**
 * Filtro de periodo para reportes: atajos (hoy, 7 días, este mes, mes anterior, este año)
 * y fechas Desde / Hasta. Emite el periodo completo en cada cambio.
 */
@Component({
  selector: 'app-period-filter',
  standalone: true,
  imports: [ButtonComponent, InputFieldComponent],
  host: { class: 'block' },
  template: `
    <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" [class]="compact() ? 'mb-4 p-3' : 'mb-5 p-4'">
      <div class="flex flex-wrap items-end" [class]="compact() ? 'gap-2' : 'gap-3'">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Periodos rápidos">
          @for (p of presets(); track p.id) {
            <app-button size="sm" [variant]="isActive(p) ? 'primary' : 'outline'" (btnClick)="change.emit({ from: p.from, to: p.to })">{{ p.label }}</app-button>
          }
        </div>
        <!-- Desde y Hasta siempre juntas; si bajan de línea quedan a la izquierda (sin hueco). -->
        <div class="flex w-full items-end sm:w-auto" [class]="compact() ? 'gap-2' : 'gap-3'">
          <app-input-field class="min-w-0 flex-1 sm:w-40 sm:flex-none" [compact]="compact()" label="Desde" type="date" [max]="value().to" [value]="value().from" (valueChange)="set('from', $event)" />
          <app-input-field class="min-w-0 flex-1 sm:w-40 sm:flex-none" [compact]="compact()" label="Hasta" type="date" [min]="value().from" [value]="value().to" (valueChange)="set('to', $event)" />
        </div>
      </div>
      <ng-content />
    </div>
  `,
})
export class PeriodFilterComponent {
  private readonly locale = inject(LocaleService);

  readonly value = input.required<Period>();
  /** Versión compacta (fechas de 36px, menos padding). */
  readonly compact = input(false, { transform: booleanAttribute });
  readonly change = output<Period>();

  protected readonly presets = computed(() => {
    const today = this.locale.todayYmd();
    const [y, m] = today.split('-').map(Number);
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const prevStart = ymd(new Date(Date.UTC(y, m - 2, 1)));
    const prevEnd = ymd(new Date(Date.UTC(y, m - 1, 0)));
    return [
      { id: 'today', label: 'Hoy', from: today, to: today },
      { id: '7d', label: '7 días', from: this.locale.todayYmd(new Date(Date.now() - 6 * 86_400_000)), to: today },
      { id: 'month', label: 'Este mes', from: this.locale.monthStartYmd(), to: today },
      { id: 'prev', label: 'Mes anterior', from: prevStart, to: prevEnd },
      { id: 'year', label: 'Este año', from: `${y}-01-01`, to: today },
    ];
  });

  protected isActive(p: Period): boolean {
    return p.from === this.value().from && p.to === this.value().to;
  }

  protected set(which: 'from' | 'to', v: string | number) {
    const next = { ...this.value(), [which]: String(v ?? '') };
    if (!next.from || !next.to) return;
    if (next.from > next.to) {
      if (which === 'from') next.to = next.from;
      else next.from = next.to;
    }
    this.change.emit(next);
  }
}
