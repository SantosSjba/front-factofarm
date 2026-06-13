import { Injectable } from '@angular/core';

type ScanHandler = (barcode: string) => void;

@Injectable({ providedIn: 'root' })
export class PosBarcodeWedgeService {
  private enabled = false;
  private buffer = '';
  private handler: ScanHandler | null = null;
  private readonly listener = (event: KeyboardEvent) => this.onKeydown(event);

  setEnabled(enabled: boolean) {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.buffer = '';
    if (enabled) {
      document.addEventListener('keydown', this.listener, true);
    } else {
      document.removeEventListener('keydown', this.listener, true);
    }
  }

  onScan(handler: ScanHandler) {
    this.handler = handler;
  }

  private onKeydown(event: KeyboardEvent) {
    if (!this.enabled || !this.handler) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (event.key === 'Enter') {
      const code = this.buffer.trim();
      this.buffer = '';
      if (code.length >= 3) {
        event.preventDefault();
        event.stopPropagation();
        this.handler(code);
      }
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.buffer += event.key;
      if (this.buffer.length > 64) this.buffer = this.buffer.slice(-64);
    }
  }
}
