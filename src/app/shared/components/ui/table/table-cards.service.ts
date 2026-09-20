import { Injectable, OnDestroy } from '@angular/core';
import { enhanceTablesIn } from './table-cards';

@Injectable({ providedIn: 'root' })
export class TableCardsService implements OnDestroy {
  private observer: MutationObserver | null = null;
  private frame: number | null = null;
  private started = false;

  start(): void {
    if (this.started || typeof document === 'undefined') return;
    this.started = true;
    this.scan();
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.frame != null) cancelAnimationFrame(this.frame);
    this.started = false;
  }

  private schedule(): void {
    if (this.frame != null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.scan();
    });
  }

  private scan(): void {
    enhanceTablesIn(document);
  }
}
