import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BodyScrollLockService {
  private readonly document = inject(DOCUMENT);
  private readonly owners = new Set<object>();
  private previousOverflow = '';

  setLocked(owner: object, locked: boolean): void {
    if (locked) {
      if (this.owners.has(owner)) return;
      if (this.owners.size === 0) this.previousOverflow = this.document.body.style.overflow;
      this.owners.add(owner);
      this.document.body.style.overflow = 'hidden';
    } else if (this.owners.delete(owner) && this.owners.size === 0) {
      this.document.body.style.overflow = this.previousOverflow;
    }
  }
}
