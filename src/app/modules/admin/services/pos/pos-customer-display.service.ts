import { Injectable } from '@angular/core';

export const POS_DISPLAY_CHANNEL = 'factofarm-pos-display';
const POS_DISPLAY_LAST_KEY = 'factofarm-pos-display-last';

export type PosDisplayLine = {
  nombre: string;
  quantity: number;
  precio: number;
  total?: number;
};

/** Estado vivo del POS (carrito / cobrando). */
export type PosDisplayCartMessage = {
  type: 'cart';
  phase: 'cart' | 'paying';
  documentType: string;
  documentLabel: string;
  serie?: string;
  customerName?: string | null;
  subtotal: number;
  igv: number;
  total: number;
  lines: PosDisplayLine[];
};

/** Comprobante generado al culminar la venta. */
export type PosDisplaySaleMessage = {
  type: 'sale';
  documentType: string;
  documentLabel: string;
  serie: string | null;
  numero: string | null;
  subtotal: string;
  igv: string;
  total: string;
  customerName?: string | null;
  lines: PosDisplayLine[];
};

export type PosDisplayMessage =
  | PosDisplayCartMessage
  | PosDisplaySaleMessage
  | { type: 'clear' }
  | { type: 'request-state' };

@Injectable({ providedIn: 'root' })
export class PosCustomerDisplayService {
  private channel: BroadcastChannel | null = null;

  private ensureChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === 'undefined') return null;
    if (!this.channel) {
      this.channel = new BroadcastChannel(POS_DISPLAY_CHANNEL);
    }
    return this.channel;
  }

  publish(message: PosDisplayMessage) {
    if (message.type !== 'request-state') {
      try {
        localStorage.setItem(POS_DISPLAY_LAST_KEY, JSON.stringify(message));
      } catch {
        /* ignore quota / private mode */
      }
    }
    const ch = this.ensureChannel();
    if (ch) ch.postMessage(message);
  }

  /** Último estado publicado (para ventana cliente al abrir sin sesión). */
  readLast(): PosDisplayMessage | null {
    try {
      const raw = localStorage.getItem(POS_DISPLAY_LAST_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PosDisplayMessage;
    } catch {
      return null;
    }
  }

  subscribe(handler: (message: PosDisplayMessage) => void): () => void {
    const ch = this.ensureChannel();
    if (!ch) return () => undefined;
    const listener = (event: MessageEvent<PosDisplayMessage>) => handler(event.data);
    ch.addEventListener('message', listener);
    return () => ch.removeEventListener('message', listener);
  }
}
