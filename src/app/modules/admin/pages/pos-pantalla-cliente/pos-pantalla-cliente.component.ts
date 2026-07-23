import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import {
  PosCustomerDisplayService,
  type PosDisplayCartMessage,
  type PosDisplayLine,
  type PosDisplayMessage,
  type PosDisplaySaleMessage,
} from '../../services/pos/pos-customer-display.service';

@Component({
  selector: 'app-pos-pantalla-cliente',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, IconComponent],
  template: `
    <div class="flex min-h-screen flex-col bg-gray-900 text-white">
      <header class="border-b border-gray-700 px-5 py-4 text-center">
        <div class="mb-1 flex items-center justify-center gap-2">
          <app-icon name="mdi:pharmacy" iconClass="size-7 text-brand-400" />
          <h1 class="text-2xl font-semibold tracking-wide">FactoFarm</h1>
        </div>
        <p class="inline-flex items-center gap-1 text-sm text-gray-400">
          <app-icon name="mdi:monitor" iconClass="size-3.5" />
          Pantalla cliente
        </p>
        @if (documentLabel()) {
          <p
            class="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            [class]="badgeClass()"
          >
            <app-icon [name]="phaseIcon()" iconClass="size-3.5" />
            {{ documentLabel() }}
            @if (comprobanteRef()) {
              <span class="font-mono normal-case tracking-normal">· {{ comprobanteRef() }}</span>
            }
          </p>
        }
      </header>

      @if (phase() === 'completed' && sale(); as s) {
        <div class="flex flex-1 flex-col px-5 py-5">
          <div class="mb-4 text-center">
            <app-icon name="mdi:check-decagram" iconClass="mx-auto size-14 text-emerald-400" />
            <p class="mt-2 text-lg text-emerald-300">¡Gracias por su compra!</p>
            <p class="mt-1 text-2xl font-bold">
              {{ s.documentLabel }} {{ s.serie ?? '' }}-{{ s.numero ?? '' }}
            </p>
            @if (s.customerName) {
              <p class="mt-1 text-sm text-gray-400">{{ s.customerName }}</p>
            }
          </div>
          @if (lines().length) {
            <ul class="mb-4 flex-1 space-y-2 overflow-auto text-base">
              @for (line of lines(); track $index) {
                <li class="flex justify-between gap-3 border-b border-gray-800 pb-2">
                  <span class="min-w-0 truncate">{{ line.quantity }} × {{ line.nombre }}</span>
                  <span class="shrink-0 text-gray-300">
                    {{ lineTotal(line) | currency: 'PEN' : 'symbol' : '1.2-2' }}
                  </span>
                </li>
              }
            </ul>
          }
          <div class="mt-auto space-y-1 border-t border-gray-700 pt-4 text-center">
            <p class="text-sm text-gray-400">Total pagado</p>
            <p class="text-4xl font-bold">{{ s.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</p>
            <p class="pt-2 text-xs text-gray-500">Comprobante generado · espere la siguiente venta</p>
          </div>
        </div>
      } @else if (phase() === 'cart' || phase() === 'paying') {
        <div class="flex flex-1 flex-col px-5 py-4">
          @if (phase() === 'paying') {
            <div
              class="mb-3 flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-200"
            >
              <app-icon name="mdi:cash-fast" iconClass="size-4 animate-pulse" />
              Procesando cobro…
            </div>
          }
          @if (customerName()) {
            <p class="mb-3 text-sm text-gray-400">
              <app-icon name="mdi:account-outline" iconClass="mr-1 inline size-4" />
              {{ customerName() }}
            </p>
          }
          <ul class="flex-1 space-y-3 overflow-auto">
            @for (line of lines(); track $index) {
              <li class="flex justify-between gap-4 border-b border-gray-800 pb-2 text-lg">
                <span class="inline-flex min-w-0 items-center gap-2 truncate">
                  <app-icon name="mdi:pill" iconClass="size-4 shrink-0 text-gray-500" />
                  {{ line.quantity }} × {{ line.nombre }}
                </span>
                <span class="shrink-0 text-gray-300">
                  {{ lineTotal(line) | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </span>
              </li>
            } @empty {
              <li class="py-10 text-center text-gray-500">Agregando productos…</li>
            }
          </ul>
          <footer class="mt-4 space-y-1 border-t border-gray-700 pt-4">
            <div class="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span>
              <span>{{ subtotal() | currency: 'PEN' : 'symbol' : '1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-400">
              <span>IGV</span>
              <span>{{ igv() | currency: 'PEN' : 'symbol' : '1.2-2' }}</span>
            </div>
            <div class="flex justify-between pt-1 text-center">
              <span class="text-sm text-gray-300">Total a pagar</span>
              <span class="text-3xl font-bold">{{ total() | currency: 'PEN' : 'symbol' : '1.2-2' }}</span>
            </div>
          </footer>
        </div>
      } @else {
        <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-gray-500">
          <app-icon name="mdi:cart-outline" iconClass="size-14 text-gray-600" />
          <p>Esperando venta…</p>
          <p class="text-xs text-gray-600">El carrito se mostrará en tiempo real</p>
        </div>
      }
    </div>
  `,
})
export class PosPantallaClienteComponent implements OnInit, OnDestroy {
  private readonly display = inject(PosCustomerDisplayService);
  private unsubscribe: (() => void) | null = null;

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
        return 'bg-amber-500/20 text-amber-200';
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-200';
      default:
        return 'bg-brand-500/20 text-brand-200';
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
    const last = this.display.readLast();
    if (last && last.type !== 'request-state') {
      this.onMessage(last);
    }
    this.unsubscribe = this.display.subscribe((msg) => {
      if (msg.type === 'request-state') return;
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
