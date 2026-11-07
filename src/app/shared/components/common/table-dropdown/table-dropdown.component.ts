import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  ElementRef,
  ViewChild,
   AfterViewInit, OnDestroy,
} from '@angular/core';
import { createPopper, Instance } from '@popperjs/core';


@Component({
  selector: 'app-table-dropdown',
  imports: [CommonModule],
  templateUrl: './table-dropdown.component.html',
  styles: ``
})
export class TableDropdownComponent implements AfterViewInit, OnDestroy {

  @Input() dropdownButton: any;
  @Input() dropdownContent: any;
  @ViewChild('buttonRef') buttonRef!: ElementRef<HTMLDivElement>;
  @ViewChild('contentRef') contentRef!: ElementRef<HTMLDivElement>;
  
  isOpen = false;
  private popperInstance: Instance | null = null;
  /** Referencia estable: con `.bind()` en cada llamada el listener nunca se retiraba. */
  private readonly onDocumentClick = (event: MouseEvent) => this.close(event);

  constructor() {}

  ngAfterViewInit() {
    document.addEventListener('click', this.onDocumentClick);

    if (this.buttonRef && this.contentRef) {
      this.popperInstance = createPopper(
        this.buttonRef.nativeElement,
        this.contentRef.nativeElement,
        {
          placement: 'bottom-end',
          // Fijo: las tablas y tarjetas tienen overflow oculto y recortarían el menú.
          strategy: 'fixed',
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 4],
              },
            },
          ],
        }
      );
    }
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onDocumentClick);
    if (this.popperInstance) {
      this.popperInstance.destroy();
      this.popperInstance = null;
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    // Se mide cuando el panel ya está visible; oculto mide 0 y queda mal ubicado.
    if (this.isOpen) requestAnimationFrame(() => void this.popperInstance?.update());
  }

  close(event: MouseEvent) {
    const target = event.target as Node;
    if (this.buttonRef && this.contentRef) {
      const dropdown = this.buttonRef.nativeElement.closest('div');
      if (dropdown && !dropdown.contains(target)) {
        this.isOpen = false;
      }
    }
  }
  onTriggerKey(event: Event): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.toggle();
  }
}
