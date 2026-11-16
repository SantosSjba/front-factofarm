import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Un `<dialog>` abierto con `showModal()` vuelve inerte todo lo que no esté dentro de él.
 * Lo que flota sobre toda la app (listas desplegables del CDK, toasts) vive en `body`, así que
 * con un modal abierto quedaría detrás y sin poder usarse.
 *
 * Este servicio guarda la pila de modales abiertos y mueve esos "anfitriones" flotantes dentro
 * del modal de arriba; al cerrarse vuelven al anterior o a `body`. Usa `moveBefore()` cuando
 * existe, que mueve el nodo sin reiniciar su estado (foco, popovers abiertos).
 */
@Injectable({ providedIn: 'root' })
export class TopLayerService {
  private readonly doc = inject(DOCUMENT);
  private readonly dialogs: HTMLDialogElement[] = [];
  private readonly hosts = new Set<HTMLElement>();

  /** Dónde debe montarse ahora lo que flota: el modal de arriba o `body`. */
  container(): HTMLElement {
    return this.dialogs.at(-1) ?? this.doc.body;
  }

  /** Registra un anfitrión flotante (contenedor del CDK, toaster…) y lo ubica de inmediato. */
  register(host: HTMLElement): void {
    this.hosts.add(host);
    this.place(host);
  }

  unregister(host: HTMLElement): void {
    this.hosts.delete(host);
  }

  /** Un modal se abrió con `showModal()`. */
  opened(dialog: HTMLDialogElement): void {
    if (this.dialogs.includes(dialog)) return;
    this.dialogs.push(dialog);
    this.placeAll();
  }

  /**
   * Un modal se cerró o va a desaparecer. Llamarlo antes de quitarlo del DOM: si no, los
   * anfitriones se van con él (igual se recuperan, pero pierden el foco).
   */
  closed(dialog: HTMLDialogElement): void {
    const index = this.dialogs.indexOf(dialog);
    if (index === -1) return;
    this.dialogs.splice(index, 1);
    this.placeAll();
  }

  private placeAll(): void {
    for (const host of this.hosts) this.place(host);
  }

  private place(host: HTMLElement): void {
    const target = this.container();
    if (host.parentNode === target) return;
    const moveBefore = (target as HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void }).moveBefore;
    try {
      // moveBefore exige que origen y destino estén ambos en el documento.
      if (moveBefore && host.isConnected) {
        moveBefore.call(target, host, null);
        return;
      }
    } catch {
      // Cae al appendChild de abajo.
    }
    target.appendChild(host);
  }
}
