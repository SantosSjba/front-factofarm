import { Injectable } from '@angular/core';

export const POS_DISPLAY_CHANNEL = 'factofarm-pos-display';
const POS_DISPLAY_LAST_KEY = 'factofarm-pos-display-last';
/** La marca va aparte del carrito: «clear» no la borra y la ventana la tiene al abrir. */
const POS_DISPLAY_BRAND_KEY = 'factofarm-pos-display-brand';

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

/**
 * Marca del establecimiento activo. La pantalla cliente es pública (sin sesión) y el logo del API
 * exige token: el POS lo manda ya convertido en `data:` URL. Sin logo propio → logo de FactoFarm.
 */
export type PosDisplayBrandMessage = {
  type: 'brand';
  name: string;
  logo: string | null;
};

export type PosDisplayMessage =
  | PosDisplayCartMessage
  | PosDisplaySaleMessage
  | PosDisplayBrandMessage
  | { type: 'clear' }
  | { type: 'request-state' }
  /** El POS se (re)cargó: si hay una pantalla cliente abierta, responde con `request-state`. */
  | { type: 'pos-ready' };

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
    if (message.type !== 'request-state' && message.type !== 'pos-ready') {
      try {
        const key = message.type === 'brand' ? POS_DISPLAY_BRAND_KEY : POS_DISPLAY_LAST_KEY;
        localStorage.setItem(key, JSON.stringify(message));
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

  /** Última marca publicada por el POS. */
  readBrand(): PosDisplayBrandMessage | null {
    try {
      const raw = localStorage.getItem(POS_DISPLAY_BRAND_KEY);
      return raw ? (JSON.parse(raw) as PosDisplayBrandMessage) : null;
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
