import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Nodo raíz con hijos (API `GET /permissions/menu-tree`). */
export type PermissionMenuNode = {
  id: string;
  code: string;
  label: string | null;
  children: { id: string; code: string; label: string | null }[];
};

/** Árbol compacto de checkboxes alineado al menú lateral. */
@Component({
  selector: 'app-permission-menu-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permission-menu-tree.component.html',
})
export class PermissionMenuTreeComponent {
  @Input() tree: PermissionMenuNode | null = null;
  /** Lista de códigos seleccionados (p. ej. `nav.usuarios`). */
  @Input() selectedCodes: string[] = [];

  @Output() parentToggle = new EventEmitter<boolean>();
  @Output() childToggle = new EventEmitter<{ code: string; checked: boolean }>();

  protected isChildChecked(code: string): boolean {
    return this.selectedCodes.includes(code);
  }

  protected allChildrenChecked(): boolean {
    const c = this.tree?.children;
    if (!c?.length) {
      return false;
    }
    return c.every((ch) => this.selectedCodes.includes(ch.code));
  }

  protected onParent(ev: Event) {
    this.parentToggle.emit((ev.target as HTMLInputElement).checked);
  }

  protected onChild(code: string, ev: Event) {
    this.childToggle.emit({
      code,
      checked: (ev.target as HTMLInputElement).checked,
    });
  }
}
