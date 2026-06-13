import { Injectable } from '@angular/core';

export const POS_DISPLAY_CHANNEL = 'factofarm-pos-display';

export type PosDisplayMessage =
  | {
      type: 'cart';
      total: number;
      lines: { nombre: string; quantity: number; precio: number }[];
    }
  | {
      type: 'sale';
      documentType: string;
      serie: string | null;
      numero: string | null;
      total: string;
    }
  | { type: 'clear' };

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
    const ch = this.ensureChannel();
    if (ch) ch.postMessage(message);
  }

  subscribe(handler: (message: PosDisplayMessage) => void): () => void {
    const ch = this.ensureChannel();
    if (!ch) return () => undefined;
    const listener = (event: MessageEvent<PosDisplayMessage>) => handler(event.data);
    ch.addEventListener('message', listener);
    return () => ch.removeEventListener('message', listener);
  }
}
