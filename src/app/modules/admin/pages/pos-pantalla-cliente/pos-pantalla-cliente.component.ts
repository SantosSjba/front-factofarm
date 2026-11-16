import { CommonModule, CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ThemeService } from '../../../../shared/services/theme.service';
import {
  PosCustomerDisplayService,
  type PosDisplayBrandMessage,
  type PosDisplayCartMessage,
  type PosDisplayLine,
  type PosDisplayMessage,
  type PosDisplaySaleMessage,
} from '../../services/pos/pos-customer-display.service';

@Component({
  selector: 'app-pos-pantalla-cliente',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, IconComponent, NgTemplateOutlet],
  template: `
    <!-- Sigue el tema del sistema (claro/oscuro) y cambia en vivo si el cajero lo cambia en el POS.
         En la ventana de 480px va en una columna; en un monitor ancho, productos | total. -->
    <div class="flex min-h-dvh flex-col bg-gray-50 text-gray-800 dark:bg-gray-950 dark:text-white/90">
      <header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
       <div class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div class="logo-dark-glow flex min-w-0 items-center gap-3">
          <img
            [src]="logoSrc()"
            [alt]="brandName()"
            class="h-10 w-auto max-w-[200px] object-contain sm:h-12 sm:max-w-[260px]"
            (error)="onLogoError()"
          />
          @if (brand()?.logo && brandName()) {
            <span class="hidden truncate text-sm font-medium text-gray-500 sm:inline dark:text-gray-400">{{ brandName() }}</span>
          }
        </div>
        @if (documentLabel()) {
          <p class="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" [class]="badgeClass()">
            <app-icon [name]="phaseIcon()" iconClass="size-3.5 shrink-0" />
            <span class="truncate">{{ documentLabel() }}</span>
            @if (comprobanteRef()) {
              <span class="font-mono normal-case tracking-normal">· {{ comprobanteRef() }}</span>
            }
          </p>
        }
       </div>
      </header>

      @if (phase() === 'completed' && sale(); as s) {
        <main class="mx-auto grid w-full max-w-6xl flex-1 content-start gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section class="order-2 min-w-0 lg:order-1">
            <ng-container [ngTemplateOutlet]="linesList" [ngTemplateOutletContext]="{ big: false }" />
          </section>
          <section class="order-1 rounded-2xl border border-success-200 bg-white p-5 text-center lg:order-2 dark:border-success-500/30 dark:bg-gray-900">
            <app-icon name="mdi:check-decagram" iconClass="mx-auto size-12 text-success-500" />
            <p class="mt-2 text-lg font-medium text-success-600 dark:text-success-400">¡Gracias por su compra!</p>
            <p class="mt-1 text-base font-semibold [overflow-wrap:anywhere]">{{ s.documentLabel }} {{ s.serie ?? '' }}-{{ s.numero ?? '' }}</p>
            @if (s.customerName) {
              <p class="mt-0.5 text-sm text-gray-500 [overflow-wrap:anywhere] dark:text-gray-400">{{ s.customerName }}</p>
            }
            <div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
              <p class="text-sm text-gray-500 dark:text-gray-400">Total pagado</p>
              <p class="text-4xl font-bold tabular-nums lg:text-5xl">{{ s.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</p>
            </div>
            <p class="mt-3 text-xs text-gray-400 dark:text-gray-500">Comprobante generado · espere la siguiente venta</p>
          </section>
        </main>
      } @else if (phase() === 'cart' || phase() === 'paying') {
        <!-- Angosto: la fila del total va al fondo (1fr arriba). Ancho: dos columnas. -->
        <main class="mx-auto grid w-full max-w-6xl flex-1 grid-rows-[minmax(0,1fr)_auto] gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-none lg:items-start">
          <section class="flex min-w-0 flex-col">
            @if (customerName()) {
              <p class="mb-2 inline-flex min-w-0 items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <app-icon name="mdi:account-outline" iconClass="size-4 shrink-0" />
                <span class="truncate">{{ customerName() }}</span>
              </p>
            }
            <ng-container [ngTemplateOutlet]="linesList" [ngTemplateOutletContext]="{ big: true }" />
          </section>
          <!-- Total siempre a la vista: abajo y fijo en la ventana angosta, a la derecha en monitor ancho. -->
          <section class="sticky bottom-0 -mx-4 -mb-4 border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-6px_12px_-8px_rgba(0,0,0,0.12)] sm:-mx-6 sm:-mb-6 sm:px-6 lg:top-6 lg:m-0 lg:rounded-2xl lg:border lg:p-5 lg:shadow-none dark:border-gray-800 dark:bg-gray-900">
            @if (phase() === 'paying') {
              <div class="mb-3 flex items-center justify-center gap-2 rounded-lg bg-warning-50 px-3 py-2 text-sm font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-300">
                <app-icon name="mdi:cash-fast" iconClass="size-4 animate-pulse" />
                Procesando cobro…
              </div>
            }
            <dl class="space-y-1 text-sm">
              <div class="flex justify-between text-gray-500 dark:text-gray-400"><dt>Subtotal</dt><dd class="tabular-nums">{{ subtotal() | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
              <div class="flex justify-between text-gray-500 dark:text-gray-400"><dt>IGV</dt><dd class="tabular-nums">{{ igv() | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
              <div class="flex items-baseline justify-between gap-3 border-t border-gray-200 pt-2 dark:border-gray-800">
                <dt class="font-medium">Total a pagar</dt>
                <dd class="text-3xl font-bold tabular-nums text-brand-600 lg:text-4xl dark:text-brand-400">{{ total() | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd>
              </div>
            </dl>
          </section>
        </main>
      } @else {
        <main class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <span class="flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
            <app-icon name="mdi:cart-outline" iconClass="size-9" />
          </span>
          <p class="mt-2 text-lg font-medium">Bienvenido{{ brandName() ? ' a ' + brandName() : '' }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Aquí verá sus productos y el total en tiempo real.</p>
        </main>
      }
    </div>

    <ng-template #linesList let-big="big">
      <ul class="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
        @for (line of lines(); track $index) {
          <li class="flex items-start justify-between gap-3 px-4 py-2.5" [class]="big ? 'text-base lg:text-lg' : 'text-sm'">
            <span class="flex min-w-0 items-start gap-2">
              <span class="shrink-0 rounded-md bg-gray-100 px-1.5 text-sm font-semibold tabular-nums text-gray-700 dark:bg-white/10 dark:text-gray-200">{{ line.quantity }}×</span>
              <span class="min-w-0 [overflow-wrap:anywhere]">{{ line.nombre }}</span>
            </span>
            <span class="shrink-0 font-medium tabular-nums">{{ lineTotal(line) | currency: 'PEN' : 'symbol' : '1.2-2' }}</span>
          </li>
        } @empty {
          <li class="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">Agregando productos…</li>
        }
      </ul>
    </ng-template>
  `,
})
export class PosPantallaClienteComponent implements OnInit, OnDestroy {
  private readonly display = inject(PosCustomerDisplayService);
  /** Se inyecta para que esta ventana siga el tema que el cajero elija en el POS (ThemeService escucha `storage`). */
  private readonly theme = inject(ThemeService);
  private unsubscribe: (() => void) | null = null;

  /** Logo propio del establecimiento (lo manda el POS) o el de FactoFarm. */
  protected readonly brand = signal<PosDisplayBrandMessage | null>(null);
  private readonly logoFailed = signal(false);
  protected readonly logoSrc = computed(() =>
    !this.logoFailed() && this.brand()?.logo ? this.brand()!.logo! : '/images/logo/logo-nav.png',
  );
  protected readonly brandName = computed(() => this.brand()?.name?.trim() || '');
  protected onLogoError() {
    this.logoFailed.set(true);
  }

  protected readonly phase = signal<'idle' | 'cart' | 'paying' | 'completed'>('idle');
  protected readonly lines = signal<PosDisplayLine[]>([]);
  protected readonly total = signal(0);
  protected readonly subtotal = signal(0);
  protected readonly igv = signal(0);
  protected readonly documentLabel = signal('');
  protected readonly documentType = signal('');
  protected readonly serie = signal('');
  protected readonly customerName = signal<string | null>(null);
  protected readonly sale = signal<PosDisplaySaleMessage | null>(null);

  protected readonly comprobanteRef = computed(() => {
    const s = this.sale();
    if (s?.serie || s?.numero) return `${s.serie ?? ''}-${s.numero ?? ''}`.replace(/^-|-$/g, '');
    return this.serie() || '';
  });

  protected readonly badgeClass = computed(() => {
    switch (this.phase()) {
      case 'paying':
        return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300';
      case 'completed':
        return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300';
      default:
        return 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300';
    }
  });

  protected readonly phaseIcon = computed(() => {
    switch (this.phase()) {
      case 'paying':
        return 'mdi:cash-register';
      case 'completed':
        return 'mdi:file-document-check-outline';
      default:
        return 'mdi:receipt-text-outline';
    }
  });

  ngOnInit() {
    this.brand.set(this.display.readBrand());
    const last = this.display.readLast();
    if (last && last.type !== 'request-state' && last.type !== 'pos-ready') {
      this.onMessage(last);
    }
    this.unsubscribe = this.display.subscribe((msg) => {
      if (msg.type === 'request-state') return;
      // El POS se recargó: se le vuelve a pedir el estado para seguir en vivo.
      if (msg.type === 'pos-ready') {
        this.display.publish({ type: 'request-state' });
        return;
      }
      this.onMessage(msg);
    });
    this.display.publish({ type: 'request-state' });
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }

  protected lineTotal(line: PosDisplayLine): number {
    if (typeof line.total === 'number') return line.total;
    return line.quantity * line.precio;
  }

  private onMessage(msg: PosDisplayMessage) {
    if (msg.type === 'brand') {
      this.logoFailed.set(false);
      this.brand.set(msg);
      return;
    }
    if (msg.type === 'clear') {
      this.resetIdle();
      return;
    }
    if (msg.type === 'cart') {
      this.applyCart(msg);
      return;
    }
    if (msg.type === 'sale') {
      this.applySale(msg);
    }
  }

  private applyCart(msg: PosDisplayCartMessage) {
    this.sale.set(null);
    this.phase.set(msg.phase === 'paying' ? 'paying' : 'cart');
    this.documentType.set(msg.documentType);
    this.documentLabel.set(msg.documentLabel || msg.documentType);
    this.serie.set(msg.serie?.trim() || '');
    this.customerName.set(msg.customerName ?? null);
    this.lines.set(msg.lines ?? []);
    this.subtotal.set(msg.subtotal ?? 0);
    this.igv.set(msg.igv ?? 0);
    this.total.set(msg.total ?? 0);
  }

  private applySale(msg: PosDisplaySaleMessage) {
    this.phase.set('completed');
    this.sale.set(msg);
    this.documentType.set(msg.documentType);
    this.documentLabel.set(msg.documentLabel || msg.documentType);
    this.serie.set(msg.serie ?? '');
    this.customerName.set(msg.customerName ?? null);
    this.lines.set(msg.lines ?? []);
    this.subtotal.set(Number(msg.subtotal) || 0);
    this.igv.set(Number(msg.igv) || 0);
    this.total.set(Number(msg.total) || 0);
  }

  private resetIdle() {
    this.phase.set('idle');
    this.sale.set(null);
    this.lines.set([]);
    this.total.set(0);
    this.subtotal.set(0);
    this.igv.set(0);
    this.documentLabel.set('');
    this.documentType.set('');
    this.serie.set('');
    this.customerName.set(null);
  }
}
