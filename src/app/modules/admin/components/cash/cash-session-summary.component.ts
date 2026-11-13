import { CurrencyPipe, KeyValuePipe, NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import type { CashSessionSummaryDto } from '../../models/directory.models';
import { documentNumber, documentTypeLabel, paymentMethodLabel, saleStatusLabel, saleStatusTone } from '../../utils/sale-labels';

const MOVEMENT_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  VENTA: 'Venta',
  ANULACION: 'Anulación',
  DEVOLUCION: 'Devolución',
  CIERRE: 'Cierre (contado)',
};

/**
 * Detalle de una sesión de caja: arqueo de efectivo, ventas por medio de pago, códigos de
 * operación, movimientos y ventas. Lo usan Caja (sesión activa) e Historial de cajas.
 */
@Component({
  selector: 'app-cash-session-summary',
  standalone: true,
  imports: [AppDatePipe, CurrencyPipe, KeyValuePipe, NgClass, StatusBadgeComponent],
  host: { class: 'block space-y-4' },
  template: `
    @let s = summary();
    <div class="grid gap-3 lg:grid-cols-2">
      <section class="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
        <h4 class="mb-2 font-medium text-gray-800 dark:text-white/90">Arqueo de efectivo</h4>
        <dl class="space-y-1.5">
          <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Monto inicial</dt><dd class="tabular-nums">{{ s.resumenEfectivo.apertura | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
          <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">(+) Ventas en efectivo</dt><dd class="tabular-nums">{{ s.resumenEfectivo.ventasEfectivo | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
          <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">(+) Ingresos de caja</dt><dd class="tabular-nums">{{ s.resumenEfectivo.ingresos | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
          <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">(−) Egresos de caja</dt><dd class="tabular-nums">{{ abs(s.resumenEfectivo.egresos) | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
          @if (+s.resumenEfectivo.anulaciones !== 0) {
            <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">(−) Anulaciones</dt><dd class="tabular-nums">{{ abs(s.resumenEfectivo.anulaciones) | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
          }
          <div class="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
            <dt>{{ closed() ? 'Esperado al cierre' : 'Debe haber en la gaveta' }}</dt><dd class="tabular-nums">{{ s.efectivoEsperado | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd>
          </div>
          @if (closed()) {
            <div class="flex justify-between font-semibold text-gray-800 dark:text-white/90"><dt>Contado</dt><dd class="tabular-nums">{{ s.montoCierreFisico === null ? '—' : (s.montoCierreFisico | currency: 'PEN' : 'symbol' : '1.2-2') }}</dd></div>
            <div class="flex justify-between font-semibold"><dt>Diferencia</dt><dd class="tabular-nums" [ngClass]="diffClass(s.diferenciaArqueo)">{{ s.diferenciaArqueo === null ? '—' : (s.diferenciaArqueo | currency: 'PEN' : 'symbol' : '1.2-2') }}</dd></div>
          }
        </dl>
      </section>
      <section class="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
        <h4 class="mb-2 font-medium text-gray-800 dark:text-white/90">Ventas por medio de pago ({{ s.numVentas }})</h4>
        <dl class="space-y-1.5">
          @for (entry of s.totalesPorMetodo | keyvalue; track entry.key) {
            <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">{{ payLabel(entry.key) }}</dt><dd class="tabular-nums">{{ entry.value | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
          } @empty {
            <p class="text-gray-500 dark:text-gray-400">Sin ventas en esta sesión.</p>
          }
          <div class="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90"><dt>Total vendido</dt><dd class="tabular-nums">{{ s.totalVentas | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
          @if (s.ventasAnuladas) {
            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400"><dt>Ventas anuladas (no suman)</dt><dd>{{ s.ventasAnuladas }}</dd></div>
          }
        </dl>
        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Solo el efectivo se cuenta en el arqueo; Yape, Plin, tarjeta y transferencias se concilian con sus códigos de operación.</p>
      </section>
    </div>

    @if (s.pagosDigitales.length) {
      <section>
        <h4 class="mb-2 text-sm font-medium text-gray-800 dark:text-white/90">Códigos de operación (para conciliar)</h4>
        <div class="max-h-64 max-w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table class="w-full min-w-[420px] text-sm text-gray-700 dark:text-gray-300">
            <thead class="sticky top-0 border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Comprobante</th>
                <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Medio</th>
                <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Código</th>
                <th class="px-4 py-2 text-end text-xs font-medium text-gray-500 dark:text-gray-400">Monto</th>
              </tr>
            </thead>
            <tbody>
              @for (p of s.pagosDigitales; track p.saleId + p.metodo + p.referencia) {
                <tr class="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                  <td class="px-4 py-2">{{ p.comprobante }}</td>
                  <td class="px-4 py-2">{{ payLabel(p.metodo) }}</td>
                  <td class="px-4 py-2">{{ p.referencia || '—' }}</td>
                  <td class="px-4 py-2 text-end tabular-nums">{{ p.monto | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

    <section>
      <h4 class="mb-2 text-sm font-medium text-gray-800 dark:text-white/90">Movimientos de caja</h4>
      <div class="max-h-72 max-w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table class="w-full min-w-[520px] text-sm text-gray-700 dark:text-gray-300">
          <thead class="sticky top-0 border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <tr>
              <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Hora</th>
              <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</th>
              <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Medio</th>
              <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Detalle</th>
              <th class="px-4 py-2 text-end text-xs font-medium text-gray-500 dark:text-gray-400">Monto</th>
            </tr>
          </thead>
          <tbody>
            @for (m of s.movimientos; track m.id) {
              <tr class="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                <td class="whitespace-nowrap px-4 py-2">{{ m.createdAt | appDate: 'dd/MM HH:mm' }}</td>
                <td class="px-4 py-2">{{ movementLabel(m.tipo) }}</td>
                <td class="px-4 py-2">{{ payLabel(m.metodoPago) }}</td>
                <td class="px-4 py-2">{{ m.comentario || m.referencia || '—' }}</td>
                <td class="px-4 py-2 text-end tabular-nums" [ngClass]="+m.monto < 0 ? 'text-error-600 dark:text-error-400' : ''">{{ m.monto | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="px-4 py-4 text-center text-gray-500">Sin movimientos.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (s.ventas.length) {
      <section>
        <h4 class="mb-2 text-sm font-medium text-gray-800 dark:text-white/90">Ventas de la sesión</h4>
        <div class="max-h-72 max-w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table class="w-full min-w-[420px] text-sm text-gray-700 dark:text-gray-300">
            <thead class="sticky top-0 border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Hora</th>
                <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Comprobante</th>
                <th class="px-4 py-2 text-start text-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                <th class="px-4 py-2 text-end text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              @for (v of s.ventas; track v.id) {
                <tr class="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                  <td class="whitespace-nowrap px-4 py-2">{{ v.createdAt | appDate: 'dd/MM HH:mm' }}</td>
                  <td class="px-4 py-2">{{ typeLabel(v.documentType) }} {{ number(v) }}</td>
                  <td class="px-4 py-2"><app-status-badge [status]="v.estado" [tone]="statusTone(v.estado)" [label]="statusLabel(v.estado)" /></td>
                  <td class="px-4 py-2 text-end tabular-nums" [class.line-through]="v.estado === 'ANULADA'">{{ v.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class CashSessionSummaryComponent {
  readonly summary = input.required<CashSessionSummaryDto>();
  protected readonly closed = computed(() => this.summary().estado !== 'ABIERTA');

  protected readonly abs = (value: string) => Math.abs(Number(value));
  protected readonly movementLabel = (tipo: string) => MOVEMENT_LABELS[tipo] ?? tipo;
  protected readonly payLabel = paymentMethodLabel;
  protected readonly typeLabel = documentTypeLabel;
  protected readonly number = documentNumber;
  protected readonly statusLabel = saleStatusLabel;
  protected readonly statusTone = saleStatusTone;

  protected diffClass(value: string | null): string {
    const n = Number(value ?? 0);
    if (n < 0) return 'text-error-600 dark:text-error-400';
    if (n > 0) return 'text-success-600 dark:text-success-400';
    return 'text-gray-800 dark:text-white/90';
  }
}
