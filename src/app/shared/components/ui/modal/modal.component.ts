import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
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
  @Input() ariaLabel = 'Diálogo';

  @ViewChild('dialogPanel') private dialogPanel?: ElementRef<HTMLElement>;

  private previouslyFocused?: HTMLElement | null;

  ngOnInit() {
    this.lockBody(this.isOpen);
  }

  ngOnDestroy() {
    document.body.style.overflow = 'unset';
    this.previouslyFocused?.focus();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.lockBody(this.isOpen);
    if (changes['isOpen']?.currentValue === true) {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
      setTimeout(() => this.focusDialog(), 0);
    }
    if (changes['isOpen']?.currentValue === false && this.previouslyFocused) {
      this.previouslyFocused.focus();
      this.previouslyFocused = null;
    }
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

  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: Event) {
    if (!(event instanceof KeyboardEvent)) return;
    if (!this.isOpen) return;
    const panel = this.dialogPanel?.nativeElement;
    if (!panel) return;
    const focusable = [
      ...panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusDialog() {
    const panel = this.dialogPanel?.nativeElement;
    if (!panel) return;
    const focusable = panel.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]',
    );
    (focusable ?? panel).focus();
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
