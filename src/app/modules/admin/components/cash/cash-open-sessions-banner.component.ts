import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import type { CashOpenSessionDto, CloseCashSessionResponse } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { CashCloseModalComponent } from './cash-close-modal.component';
import { formatHoursOpen } from './cash-files';

/**
 * Avisa de las cajas abiertas del establecimiento con la opción de cerrarlas con arqueo:
 * la propia si quedó de un día anterior y, para supervisores, las de otros usuarios.
 * - `full`: lista también las cajas abiertas por otros (pantalla de caja / historial).
 * - `compact`: solo lo que exige acción (POS).
 */
@Component({
  selector: 'app-cash-open-sessions-banner',
  standalone: true,
  imports: [CommonModule, AppDatePipe, ButtonComponent, IconComponent, CashCloseModalComponent],
  template: `
    @if (openQuery.isError()) {
      <p class="mb-3 text-sm text-rose-600 dark:text-rose-400">{{ loadError() }}</p>
    }
    @if (staleMine(); as mine) {
      <div class="mb-3 rounded-xl border border-warning-500 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/15 sm:p-4">
        <div class="flex flex-wrap items-start gap-3">
          <app-icon name="mdi:alert-outline" iconClass="mt-0.5 size-5 text-warning-500" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-gray-800 dark:text-white/90">
              Tu caja "{{ mine.cashRegister.nombre }}" sigue abierta desde el {{ mine.openedAt | appDate: 'short' }}
            </p>
            <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
              Lleva {{ formatHours(mine.horasAbierta) }} abierta. Ciérrala con su arqueo para cuadrar ese turno y abrir una caja nueva.
            </p>
          </div>
          <app-button size="sm" startIconName="mdi:cash-lock" (btnClick)="closeId.set(mine.id)">Cerrar con arqueo</app-button>
        </div>
      </div>
    }
    @if (visibleOthers().length) {
      <div class="mb-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03] sm:p-4">
        <p class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-white/90">
          <app-icon name="mdi:cash-register" iconClass="size-4 text-brand-500" />
          {{ mode === 'compact' ? 'Cajas pendientes de cierre' : 'Cajas abiertas en el establecimiento' }}
        </p>
        <ul class="divide-y divide-gray-100 text-sm dark:divide-gray-800">
          @for (s of visibleOthers(); track s.id) {
            <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span class="min-w-0 flex-1">
                <span class="font-medium text-gray-800 dark:text-white/90">{{ s.cashRegister.nombre }}</span>
                <span class="text-gray-500 dark:text-gray-400"> · {{ s.user.nombre }} · desde {{ s.openedAt | appDate: 'short' }}</span>
                @if (s.pendiente) {
                  <span class="ml-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                    {{ formatHours(s.horasAbierta) }} abierta
                  </span>
                }
              </span>
              @if (s.canClose) {
                <app-button size="sm" variant="outline" startIconName="mdi:cash-lock" (btnClick)="closeId.set(s.id)">Cierre forzado</app-button>
              } @else {
                <span class="text-xs text-gray-500 dark:text-gray-400">Solo {{ s.user.nombre }} o un supervisor puede cerrarla</span>
              }
            </li>
          }
        </ul>
      </div>
    }
    <app-cash-close-modal [sessionId]="closeId()" (closed)="closeId.set(null)" (done)="closedSession.emit($event)" />
  `,
})
export class CashOpenSessionsBannerComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly locale = inject(LocaleService);

  @Input() mode: 'full' | 'compact' = 'full';
  @Output() closedSession = new EventEmitter<CloseCashSessionResponse>();

  protected readonly closeId = signal<string | null>(null);
  protected readonly formatHours = formatHoursOpen;

  protected readonly openQuery = injectQuery(() => ({
    queryKey: ['cash', 'open-sessions'] as const,
    queryFn: () => firstValueFrom(this.api.listOpenCashSessions()),
    refetchInterval: 60_000,
  }));

  protected readonly loadError = computed(() =>
    httpErrorMessage(this.openQuery.error(), 'No se pudieron consultar las cajas abiertas.'),
  );

  /** Mi caja abierta si viene de un día anterior o lleva 24 h o más. */
  protected readonly staleMine = computed<CashOpenSessionDto | null>(() => {
    const mine = (this.openQuery.data() ?? []).find((s) => s.isMine);
    if (!mine) return null;
    const otherDay = this.locale.todayYmd(new Date(mine.openedAt)) !== this.locale.todayYmd();
    return mine.pendiente || otherDay ? mine : null;
  });

  protected readonly visibleOthers = computed(() => {
    const others = (this.openQuery.data() ?? []).filter((s) => !s.isMine);
    // En el POS solo interesan las que el usuario puede (y debe) cerrar.
    return this.mode === 'compact' ? others.filter((s) => s.pendiente && s.canClose) : others;
  });
}
