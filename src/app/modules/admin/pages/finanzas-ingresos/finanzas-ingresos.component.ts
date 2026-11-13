import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { PurchaseBudgetMonthDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { MONTH_NAMES, soles } from '../../utils/finance-labels';

/** Presupuesto de compras: cuánto planeas comprar cada mes contra lo que realmente compraste. */
@Component({
  selector: 'app-finanzas-ingresos',
  standalone: true,
  imports: [
    CurrencyPipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    KpiTileComponent,
    ModalComponent,
    PageStateComponent,
    PageToolbarComponent,
    TextAreaComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Presupuesto de compras</h1>
      <div data-toolbar-actions class="w-36">
        <app-form-select ariaLabel="Año" [showPlaceholder]="false" [options]="yearOptions" [value]="'' + anio()" (valueChange)="anio.set(+$event)" />
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="finanzas-ingresos">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Fija cuánto piensas gastar en compras cada mes y compáralo con lo que realmente compraste (facturas de proveedores registradas).</li>
        <li>Pulsa un mes para poner o cambiar su presupuesto. En rojo, los meses en que compraste más de lo previsto.</li>
      </ol>
    </app-help-panel>

    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (summary(); as s) {
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <app-kpi-tile label="Presupuesto del año" [value]="s.presupuesto" icon="mdi:target" tone="brand" [sub]="s.mesesConPresupuesto + ' de 12 meses con presupuesto'" />
          <app-kpi-tile label="Comprado en el año" [value]="s.actual" icon="mdi:cart-outline" tone="info" />
          <app-kpi-tile label="Diferencia" [value]="s.diferencia" icon="mdi:scale-balance" [tone]="!s.mesesConPresupuesto ? 'gray' : s.excedido ? 'error' : 'success'" [sub]="!s.mesesConPresupuesto ? 'Aún no fijas presupuesto' : s.excedido ? 'Compraste más de lo previsto' : 'Dentro del presupuesto'" />
          <app-kpi-tile label="Meses excedidos" [value]="'' + s.mesesExcedidos" icon="mdi:alert-circle-outline" [tone]="s.mesesExcedidos ? 'warning' : 'gray'" />
        </div>

        <app-component-card [title]="'Mes a mes · ' + anio()" className="mt-4 overflow-hidden" [bodyClass]="'p-0 sm:p-0'">
          <div class="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
            <div class="max-w-full overflow-x-auto">
              <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
                <thead class="border-b border-gray-100 dark:border-white/[0.05]">
                  <tr>
                    <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Mes</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Presupuesto</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Comprado</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Diferencia</th>
                    <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Avance</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  @for (m of months(); track m.mes) {
                    <tr [attr.data-row-tone]="over(m) ? 'error-light' : null">
                      <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {{ monthName(m.mes) }}
                        @if (m.notas) { <span class="block text-theme-xs font-normal text-gray-500 dark:text-gray-400">{{ m.notas }}</span> }
                      </td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ m.tienePresupuesto ? (m.presupuesto | currency: 'PEN' : 'symbol' : '1.2-2') : '—' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ m.actual | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm font-medium tabular-nums" [class.text-error-600]="over(m)">{{ m.tienePresupuesto ? (m.variacion | currency: 'PEN' : 'symbol' : '1.2-2') : '—' }}</td>
                      <td class="px-5 py-3 text-theme-sm">
                        @if (m.tienePresupuesto && +m.presupuesto > 0) {
                          <div class="flex items-center gap-2">
                            <div class="h-2 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                              <div class="h-full rounded-full" [class]="over(m) ? 'bg-error-500' : 'bg-brand-500'" [style.width.%]="progress(m)"></div>
                            </div>
                            <span class="text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">{{ ratio(m) }} %</span>
                          </div>
                        }
                      </td>
                      <td class="px-5 py-3 text-end">
                        @if (canEdit) {
                          <app-button size="sm" variant="outline" [startIconName]="m.tienePresupuesto ? 'mdi:pencil-outline' : 'mdi:plus'" (btnClick)="openEdit(m)">{{ m.tienePresupuesto ? 'Editar' : 'Fijar' }}</app-button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </app-component-card>
      }
    </app-page-state>

    <app-modal compact [isOpen]="!!editing()" (closed)="editing.set(null)" className="w-full max-w-lg shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-xl font-semibold text-gray-800 dark:text-white/90">Presupuesto de {{ editing() ? monthName(editing()!.mes) : '' }} {{ anio() }}</h3>
        @if (editing(); as e) {
          <p class="mt-1 pe-12 text-sm text-gray-500 dark:text-gray-400">Comprado hasta ahora: {{ e.actual | currency: 'PEN' : 'symbol' : '1.2-2' }}</p>
        }
      </div>
      <div data-modal-body class="space-y-4 px-4 py-4 sm:px-6">
        <app-input-field label="Monto presupuestado (S/)" [isRequired]="true" type="number" min="0" step="0.01" inputMode="decimal" [value]="amount() ?? ''" [error]="!!amountError()" [hint]="amountError()" (valueChange)="amount.set($event === '' ? null : +$event); amountError.set('')" />
        <app-text-area label="Notas" placeholder="Ej. Campaña de invierno" [maxLength]="500" [rows]="2" [value]="notes()" (valueChange)="notes.set($event)" />
      </div>
      <div data-modal-footer class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <app-button variant="outline" [disabled]="saveMutation.isPending()" (btnClick)="editing.set(null)">Cancelar</app-button>
        <app-button startIconName="mdi:content-save-outline" [loading]="saveMutation.isPending()" [disabled]="saveMutation.isPending()" (btnClick)="submit()">Guardar</app-button>
      </div>
    </app-modal>
  `,
})
export class FinanzasIngresosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Presupuesto de compras' }];
  private readonly currentYear = Number(this.locale.currentYearMonth().slice(0, 4));
  protected readonly anio = signal(this.currentYear);
  protected readonly yearOptions = [this.currentYear + 1, this.currentYear, this.currentYear - 1, this.currentYear - 2].map((y) => ({ value: `${y}`, label: `${y}` }));
  protected readonly canEdit = ['finance.write', 'nav.finanzas_ingresos'].some((p) => this.auth.hasPermission(p));

  protected readonly query = injectQuery(() => ({
    queryKey: ['purchase-budget', this.anio()] as const,
    queryFn: () => firstValueFrom(this.api.getPurchaseBudgetVsActual(this.anio())),
  }));
  protected readonly error = computed(() => (this.query.isError() ? httpErrorMessage(this.query.error(), 'No se pudo cargar el presupuesto') : null));
  protected readonly months = computed(() => this.query.data()?.months ?? []);
  protected readonly summary = computed(() => {
    const ms = this.months();
    if (!this.query.data()) return null;
    const presupuesto = ms.reduce((a, m) => a + Number(m.presupuesto), 0);
    const actual = ms.reduce((a, m) => a + Number(m.actual), 0);
    return {
      presupuesto: soles(presupuesto),
      actual: soles(actual),
      diferencia: soles(actual - presupuesto),
      excedido: presupuesto > 0 && actual > presupuesto,
      mesesConPresupuesto: ms.filter((m) => m.tienePresupuesto).length,
      mesesExcedidos: ms.filter((m) => this.over(m)).length,
    };
  });

  protected monthName(mes: number) {
    return MONTH_NAMES[mes - 1] ?? `${mes}`;
  }
  protected over(m: PurchaseBudgetMonthDto) {
    return !!m.tienePresupuesto && Number(m.actual) > Number(m.presupuesto);
  }
  protected ratio(m: PurchaseBudgetMonthDto) {
    const p = Number(m.presupuesto);
    return p > 0 ? Math.round((Number(m.actual) / p) * 100) : 0;
  }
  protected progress(m: PurchaseBudgetMonthDto) {
    return Math.min(100, this.ratio(m));
  }

  // ---------- Editar ----------
  protected readonly editing = signal<PurchaseBudgetMonthDto | null>(null);
  protected readonly amount = signal<number | null>(null);
  protected readonly notes = signal('');
  protected readonly amountError = signal('');
  protected openEdit(m: PurchaseBudgetMonthDto) {
    this.amount.set(m.tienePresupuesto ? Number(m.presupuesto) : null);
    this.notes.set(m.notas ?? '');
    this.amountError.set('');
    this.editing.set(m);
  }
  protected submit() {
    const m = this.editing();
    const amount = this.amount();
    if (!m) return;
    if (amount == null || !(amount >= 0)) {
      this.amountError.set('Escribe el monto (0 o más).');
      return;
    }
    this.saveMutation.mutate({ mes: m.mes, amount });
  }
  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: (args: { mes: number; amount: number }) =>
      firstValueFrom(
        this.api.upsertPurchaseBudget({ anio: this.anio(), mes: args.mes, montoPresupuestado: args.amount, notas: this.notes().trim() || undefined }),
      ),
    onSuccess: () => {
      this.notify.success('Presupuesto guardado');
      this.editing.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['purchase-budget'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar el presupuesto')),
  }));
}
