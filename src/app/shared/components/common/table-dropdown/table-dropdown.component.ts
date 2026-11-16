import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { createPopper, Instance } from '@popperjs/core';

/** Lo que se puede enfocar con flechas dentro del menú (solo de este nivel, no de submenús). */
const ITEMS = 'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"])';
/** Clics que ejecutan una acción y por eso cierran el menú (las casillas no: se marcan varias). */
const CLOSES_MENU = '[role="menuitem"], app-button, a[href]';

/**
 * Menú desplegable de acciones (filas de tabla, exportar, columnas…) sobre `popover="auto"` nativo:
 * va en la capa superior (ninguna tabla ni modal lo recorta), cierra con Esc o clic fuera y
 * devuelve el foco al botón. Si el contenido de `[dropdown-button]` trae un `<button>`, ese botón
 * es el invocador nativo (`popoverTargetElement`); si no, el envoltorio hace de botón.
 * La posición la calcula Popper (CSS anchor positioning aún no está en todos los navegadores).
 */
@Component({
  selector: 'app-table-dropdown',
  imports: [],
  templateUrl: './table-dropdown.component.html',
  styles: ``,
})
export class TableDropdownComponent implements AfterViewInit, OnDestroy {
  @ViewChild('buttonRef') buttonRef!: ElementRef<HTMLDivElement>;
  @ViewChild('contentRef') contentRef!: ElementRef<HTMLDivElement>;
  @ViewChild('menuRef') menuRef!: ElementRef<HTMLDivElement>;

  private static nextId = 0;
  protected readonly menuId = `ff-menu-${++TableDropdownComponent.nextId}`;

  isOpen = false;
  private popperInstance: Instance | null = null;
  /** Elemento que abre el menú: el <button> proyectado o, si no hay, el envoltorio. */
  private trigger!: HTMLElement;
  private usesNativeInvoker = false;
  /** Abierto con teclado: entonces el foco entra al primer ítem (con mouse se queda en el botón). */
  private enterOnOpen = false;
  /** Para el envoltorio-botón: el pointerdown fuera ya cerró el menú; el click no debe reabrirlo. */
  private wasOpenOnPointerDown = false;
  private readonly cleanups: Array<() => void> = [];

  ngAfterViewInit() {
    const wrapper = this.buttonRef.nativeElement;
    const panel = this.contentRef.nativeElement;
    const button = wrapper.querySelector<HTMLButtonElement>('button');

    // Delegación en el panel (no es un control, solo contiene los ítems).
    this.listen(panel, 'toggle', (e) => this.onToggle(e));
    this.listen(panel, 'click', (e) => this.onPanelClick(e as MouseEvent));
    this.listen(panel, 'keydown', (e) => this.onPanelKey(e as KeyboardEvent));
    this.listen(panel, 'focusout', (e) => this.onPanelFocusOut(e as FocusEvent));

    if (button) {
      this.trigger = button;
      this.usesNativeInvoker = true;
      // Invocador nativo: el navegador abre/cierra con clic, Enter y Espacio, y el botón queda en
      // el grupo de "light dismiss" (clic sobre él con el menú abierto lo cierra, no lo reabre).
      button.popoverTargetElement = panel;
      this.listen(wrapper, 'click', (e) => (this.enterOnOpen = (e as MouseEvent).detail === 0), true);
    } else {
      this.trigger = wrapper;
      wrapper.setAttribute('role', 'button');
      wrapper.tabIndex = 0;
      this.listen(wrapper, 'pointerdown', () => (this.wasOpenOnPointerDown = this.isOpen));
      this.listen(wrapper, 'click', (e) => {
        const reopen = this.wasOpenOnPointerDown;
        this.wasOpenOnPointerDown = false;
        if (reopen) return;
        this.enterOnOpen = (e as MouseEvent).detail === 0;
        this.togglePanel();
      });
      this.listen(wrapper, 'keydown', (e) => {
        const key = (e as KeyboardEvent).key;
        if ((key === 'Enter' || key === ' ') && e.target === wrapper) {
          e.preventDefault();
          this.enterOnOpen = true;
          this.togglePanel();
        }
      });
    }

    this.trigger.id ||= `${this.menuId}-trigger`;
    this.trigger.setAttribute('aria-haspopup', 'menu');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.menuRef.nativeElement.setAttribute('aria-labelledby', this.trigger.id);
    // Flecha abajo en el botón: abre (si hace falta) y entra al primer ítem.
    this.listen(this.trigger, 'keydown', (e) => {
      if ((e as KeyboardEvent).key !== 'ArrowDown') return;
      e.preventDefault();
      if (this.isOpen) this.focusItem(0);
      else {
        this.enterOnOpen = true;
        panel.showPopover();
      }
    });

    this.popperInstance = createPopper(this.trigger, panel, {
      placement: 'bottom-end',
      strategy: 'fixed',
      modifiers: [
        { name: 'offset', options: { offset: [0, 4] } },
        // top/left en vez de transform: un transform volvería al panel el contenedor de los
        // tooltips (position: fixed) que se montan dentro y los descolocaría.
        { name: 'computeStyles', options: { gpuAcceleration: false } },
      ],
    });
  }

  ngOnDestroy() {
    for (const cleanup of this.cleanups) cleanup();
    this.popperInstance?.destroy();
    this.popperInstance = null;
  }

  /** Abre/cierra desde código (compatibilidad con quien llamaba `toggle()`). */
  toggle() {
    this.togglePanel();
  }

  private onToggle(event: Event) {
    const open = (event as ToggleEvent).newState === 'open';
    this.isOpen = open;
    this.trigger?.setAttribute('aria-expanded', String(open));
    if (!open) {
      this.enterOnOpen = false;
      return;
    }
    // Rol según el contenido: "menu" solo si son acciones; con casillas (columnas) es un grupo.
    const menu = this.menuRef.nativeElement;
    menu.setAttribute('role', menu.querySelector('[role="menuitem"]') ? 'menu' : 'group');
    // Se mide cuando el panel ya está visible; oculto mide 0 y queda mal ubicado.
    void this.popperInstance?.update();
    if (this.enterOnOpen) this.focusItem(0);
    this.enterOnOpen = false;
  }

  /** Una acción ejecutada cierra el menú; marcar casillas o usar un submenú no. */
  private onPanelClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>(CLOSES_MENU);
    if (!action || !this.contentRef.nativeElement.contains(action)) return;
    if (this.ownerPanel(action) !== this.contentRef.nativeElement) return;
    const invoker = (action.matches('button') ? action : action.querySelector('button')) as HTMLButtonElement | null;
    if (invoker?.popoverTargetElement) return; // abre un submenú
    if (invoker?.disabled) return;
    this.hidePanel(event.detail === 0);
  }

  /** Flechas, Inicio y Fin entre los ítems de este nivel (focusgroup aún no es universal). */
  private onPanelKey(event: KeyboardEvent) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const items = this.items();
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current < 0 || items.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const next =
      event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1
      : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
    items[next].focus({ preventScroll: true });
  }

  /** Tab fuera del menú lo cierra: no queda abierto con el foco en otro lado. */
  private onPanelFocusOut(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.isOpen) return;
    if (this.contentRef.nativeElement.contains(next) || this.trigger.contains(next)) return;
    this.contentRef.nativeElement.hidePopover();
  }

  private togglePanel() {
    const panel = this.contentRef?.nativeElement;
    if (!panel) return;
    if (this.isOpen) this.hidePanel(true);
    else panel.showPopover();
  }

  /** Devuelve el foco al botón antes de ocultar (sin anillo si fue con mouse). */
  private hidePanel(fromKeyboard: boolean) {
    const panel = this.contentRef.nativeElement;
    if (panel.contains(document.activeElement)) {
      this.trigger.focus({ focusVisible: fromKeyboard } as FocusOptions);
    }
    if (this.isOpen) panel.hidePopover();
  }

  private items(): HTMLElement[] {
    const panel = this.contentRef.nativeElement;
    return [...panel.querySelectorAll<HTMLElement>(ITEMS)].filter(
      (el) => this.ownerPanel(el) === panel && el.offsetParent !== null,
    );
  }

  private focusItem(index: number) {
    this.items()[index]?.focus({ preventScroll: true });
  }

  /** Popover al que pertenece un elemento (para ignorar los de un submenú anidado). */
  private ownerPanel(el: HTMLElement): HTMLElement | null {
    return el.closest<HTMLElement>('[popover]');
  }

  private listen(target: EventTarget, type: string, handler: (e: Event) => void, capture = false) {
    target.addEventListener(type, handler, capture);
    this.cleanups.push(() => target.removeEventListener(type, handler, capture));
  }
}
