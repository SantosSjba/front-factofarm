import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { PosCustomerDisplayService, type PosDisplayMessage } from '../../services/pos/pos-customer-display.service';

@Component({
  selector: 'app-pos-pantalla-cliente',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="flex min-h-screen flex-col bg-gray-900 text-white">
      <header class="border-b border-gray-700 px-6 py-4 text-center">
        <h1 class="text-2xl font-semibold tracking-wide">FactoFarm</h1>
        <p class="text-sm text-gray-400">Pantalla cliente</p>
      </header>

      @if (lastSale(); as sale) {
        <div class="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p class="text-lg text-emerald-300">¡Gracias por su compra!</p>
          <p class="text-xl">{{ sale.documentType }} {{ sale.serie ?? '' }}-{{ sale.numero ?? '' }}</p>
          <p class="text-4xl font-bold">{{ sale.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</p>
        </div>
      } @else if (lines().length) {
        <div class="flex-1 overflow-auto px-6 py-4">
          <ul class="space-y-3">
            @for (line of lines(); track line.nombre) {
              <li class="flex justify-between gap-4 border-b border-gray-800 pb-2 text-lg">
                <span class="truncate">{{ line.quantity }} × {{ line.nombre }}</span>
                <span class="shrink-0 text-gray-300">
                  {{ line.quantity * line.precio | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </span>
              </li>
            }
          </ul>
        </div>
        <footer class="border-t border-gray-700 px-6 py-6 text-center">
          <p class="text-sm text-gray-400">Total a pagar</p>
          <p class="text-4xl font-bold">{{ total() | currency: 'PEN' : 'symbol' : '1.2-2' }}</p>
        </footer>
      } @else {
        <div class="flex flex-1 items-center justify-center px-6 text-gray-500">
          Esperando venta…
        </div>
      }
    </div>
  `,
})
export class PosPantallaClienteComponent implements OnInit, OnDestroy {
  private readonly display = inject(PosCustomerDisplayService);
  private unsubscribe: (() => void) | null = null;

  protected readonly lines = signal<{ nombre: string; quantity: number; precio: number }[]>([]);
  protected readonly total = signal(0);
  protected readonly lastSale = signal<{
    documentType: string;
    serie: string | null;
    numero: string | null;
    total: string;
  } | null>(null);

  ngOnInit() {
    this.unsubscribe = this.display.subscribe((msg) => this.onMessage(msg));
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }

  private onMessage(msg: PosDisplayMessage) {
    if (msg.type === 'clear') {
      this.lines.set([]);
      this.total.set(0);
      this.lastSale.set(null);
      return;
    }
    if (msg.type === 'cart') {
      this.lastSale.set(null);
      this.lines.set(msg.lines);
      this.total.set(msg.total);
      return;
    }
    if (msg.type === 'sale') {
      this.lines.set([]);
      this.total.set(0);
      this.lastSale.set(msg);
    }
  }
}
