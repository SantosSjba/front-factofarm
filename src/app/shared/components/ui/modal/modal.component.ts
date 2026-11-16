import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  booleanAttribute,
  inject,
} from '@angular/core';
import { TopLayerService } from '../../../services/top-layer.service';

/**
 * Diálogo modal sobre `<dialog>` nativo abierto con `showModal()`: el navegador lo pone en la capa
 * superior, vuelve inerte el resto de la página, atrapa el foco, cierra con Esc / gesto atrás y
 * devuelve el foco a quien lo abrió. Admite `data-modal-header|body|footer`.
 *
 * Sigue siendo controlado por la página: Esc o clic fuera emiten `closed` y la página decide
 * (si deja `isOpen` en true, el modal sigue abierto).
 *
 * En teléfono se muestra como hoja inferior y los botones del footer van apilados a todo el ancho
 * (acción principal arriba); en tablet y escritorio, centrado. Ver `.ff-modal-panel` en `styles.css`.
 */
@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styles: ``,
})
export class ModalComponent implements OnDestroy, OnChanges {
  private readonly topLayer = inject(TopLayerService);
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  /** Clases del panel (ancho, sombra, etc.). */
  @Input() className = '';
  /** Clases del área scrollable (p. ej. padding). Vacío por defecto para no romper modales legacy con `className` en el panel. */
  @Input() bodyClass = '';
  /** Altura máxima del panel completo (Tailwind). */
  @Input() maxHeightClass = 'max-h-[min(90dvh,880px)]';
  /** Cerrar al hacer clic fuera del panel. */
  @Input() closeOnBackdrop = true;
  @Input() showCloseButton = true;
  @Input() isFullscreen = false;
  @Input() ariaLabel = 'Diálogo';
  /** Título visible con la cabecera estándar. Omitir si el modal proyecta su propio `[data-modal-header]`. */
  @Input() title = '';
  /** Subtítulo opcional bajo el título. */
  @Input() description = '';
  /**
   * Versión compacta: cabecera (título 18px, menos padding), botón cerrar y footer más bajos.
   * También ajusta los `[data-modal-header]` / `[data-modal-footer]` proyectados (ver `styles.css`).
   */
  @Input({ transform: booleanAttribute }) compact = false;

  private static nextId = 0;
  /** Id del título, para nombrar el diálogo con `aria-labelledby`. */
  protected readonly titleId = `ff-modal-title-${++ModalComponent.nextId}`;

  private dialogEl?: HTMLDialogElement;
  /** Por si el modal desaparece del DOM sin `close()` (la página lo quita con su propio @if). */
  private previouslyFocused?: HTMLElement | null;

  /** El `<dialog>` aparece con `@if (isOpen)`: se abre como modal en cuanto existe. */
  @ViewChild('dialog')
  private set dialogRef(ref: ElementRef<HTMLDialogElement> | undefined) {
    const dialog = ref?.nativeElement;
    if (dialog === this.dialogEl) return;
    this.dialogEl = dialog;
    if (dialog) this.open(dialog);
  }

  ngOnChanges(changes: SimpleChanges) {
    // Cerrar antes de que el @if quite el <dialog>: así el navegador devuelve el foco y los
    // flotantes (listas, toasts) salen del modal antes de que desaparezca.
    if (changes['isOpen'] && !this.isOpen) this.close();
  }

  ngOnDestroy() {
    this.close();
    const active = document.activeElement;
    if (!active || active === document.body) this.previouslyFocused?.focus();
  }

  private open(dialog: HTMLDialogElement) {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    this.topLayer.opened(dialog);
    this.nameFromProjectedHeading(dialog);
    this.focusInitial(dialog);
  }

  private close() {
    const dialog = this.dialogEl;
    if (!dialog) return;
    this.topLayer.closed(dialog);
    if (dialog.open) dialog.close();
  }

  /** Esc o gesto "atrás": la página decide si se cierra. */
  protected onCancel(event: Event) {
    event.preventDefault();
    this.closed.emit();
  }

  /**
   * El navegador cerró el diálogo por su cuenta (p. ej. un segundo Esc sin interacción no se puede
   * cancelar). Si la página lo quiere abierto, se vuelve a abrir para no quedar invisible.
   */
  protected onNativeClose() {
    if (!this.isOpen) return;
    this.closed.emit();
    queueMicrotask(() => {
      const dialog = this.dialogEl;
      if (this.isOpen && dialog?.isConnected && !dialog.open) dialog.showModal();
    });
  }

  onBackdropClick() {
    if (!this.isFullscreen && this.closeOnBackdrop) {
      this.closed.emit();
    }
  }

  /**
   * Foco inicial: el elemento marcado con `autofocus` / `data-autofocus` (o el primer control
   * dentro de él, útil en `<app-button data-autofocus>`); si no hay, el primer control del panel.
   * `showModal()` ya enfocó algo, pero el botón de cierre va primero en el DOM y `data-autofocus`
   * no es nativo: por eso se ajusta aquí, igual que antes de la migración.
   */
  private focusInitial(dialog: HTMLDialogElement) {
    const panel = dialog.querySelector<HTMLElement>('[data-modal-panel]') ?? dialog;
    const controls = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]';
    const marked = panel.querySelector<HTMLElement>('[autofocus], [data-autofocus]');
    const target = marked
      ? marked.matches(controls) ? marked : marked.querySelector<HTMLElement>(controls)
      : panel.querySelector<HTMLElement>(controls);
    (target ?? panel).focus();
  }

  /**
   * Sin `title` ni `ariaLabel` propio, el diálogo se llamaría "Diálogo". Si la página proyecta su
   * cabecera (`[data-modal-header]`), se nombra con su encabezado visible vía `aria-labelledby`.
   */
  private nameFromProjectedHeading(dialog: HTMLDialogElement) {
    if (this.title || this.ariaLabel !== 'Diálogo') return;
    const heading = dialog.querySelector<HTMLElement>('[data-modal-header] :is(h1, h2, h3, h4)');
    if (!heading) return;
    heading.id ||= `${this.titleId}-projected`;
    dialog.setAttribute('aria-labelledby', heading.id);
  }

  /** Panel interior: columna con altura limitada y sin desbordar. */
  protected panelClasses(): string {
    if (this.isFullscreen) {
      return `flex h-full w-full flex-col overflow-hidden bg-white dark:bg-gray-900 ${this.className}`.trim();
    }
    return [
      // Teléfono: hoja inferior (esquinas de arriba redondeadas, sin borde abajo). sm+: tarjeta centrada.
      'ff-modal-panel relative w-full flex flex-col overflow-hidden rounded-t-3xl border border-b-0 border-gray-200 bg-white shadow-xl sm:rounded-3xl sm:border-b dark:border-gray-800 dark:bg-gray-dark',
      this.maxHeightClass,
      this.className,
    ]
      .join(' ')
      .trim();
  }
}
