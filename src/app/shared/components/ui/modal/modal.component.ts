import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';

/** Diálogo modal con altura limitada y scroll en el cuerpo; admite `data-modal-header|body|footer`. */
@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styles: ``,
})
export class ModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
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

  ngOnInit() {
    this.lockBody(this.isOpen);
  }

  ngOnDestroy() {
    document.body.style.overflow = 'unset';
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.lockBody(this.isOpen);
  }

  private lockBody(open: boolean) {
    document.body.style.overflow = open ? 'hidden' : 'unset';
  }

  onBackdropClick(_event: MouseEvent) {
    if (!this.isFullscreen && this.closeOnBackdrop) {
      this.close.emit();
    }
  }

  onContentClick(event: MouseEvent) {
    event.stopPropagation();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) {
      this.close.emit();
    }
  }

  /** Panel interior: columna con altura limitada y sin desbordar. */
  protected panelClasses(): string {
    if (this.isFullscreen) {
      return `flex h-full w-full flex-col overflow-hidden bg-white dark:bg-gray-900 ${this.className}`.trim();
    }
    return [
      'relative w-full flex flex-col overflow-hidden rounded-3xl bg-white shadow-theme-lg dark:bg-gray-900',
      this.maxHeightClass,
      this.className,
    ]
      .join(' ')
      .trim();
  }
}
