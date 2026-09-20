import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Nodo raíz con hijos (API `GET /permissions/menu-tree`). */
export type PermissionMenuNode = {
  id: string;
  code: string;
  label: string | null;
  children: { id: string; code: string; label: string | null }[];
};

/**
 * Bosque de permisos colapsable (checkbox padre + hijos), alineado al menú lateral.
 * Acepta `trees` (preferido) o un solo `tree` por compatibilidad.
 */
@Component({
  selector: 'app-permission-menu-tree',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './permission-menu-tree.component.html',
})
export class PermissionMenuTreeComponent {
  /** @deprecated Preferir `trees`. */
  @Input() tree: PermissionMenuNode | null = null;
  @Input() trees: PermissionMenuNode[] | null = null;
  /** Lista de códigos seleccionados (p. ej. `nav.usuarios`). */
  @Input() selectedCodes: string[] = [];
  /** Mostrar filtro por etiqueta. */
  @Input() showFilter = true;

  @Output() parentToggle = new EventEmitter<{ tree: PermissionMenuNode; checked: boolean }>();
  @Output() childToggle = new EventEmitter<{ code: string; checked: boolean }>();

  protected readonly filterQuery = signal('');
  /** Ids de raíz colapsados (por defecto todo expandido). */
  private readonly collapsed = signal<Set<string>>(new Set());

  protected get forest(): PermissionMenuNode[] {
    if (this.trees?.length) {
      return this.trees;
    }
    return this.tree ? [this.tree] : [];
  }

  protected filteredForest(): PermissionMenuNode[] {
    const q = this.filterQuery().trim().toLowerCase();
    if (!q) {
      return this.forest;
    }
    return this.forest
      .map((node) => {
        const parentHit = (node.label ?? node.code).toLowerCase().includes(q);
        const kids = node.children.filter((c) =>
          (c.label ?? c.code).toLowerCase().includes(q),
        );
        if (parentHit) {
          return node;
        }
        if (kids.length) {
          return { ...node, children: kids };
        }
        return null;
      })
      .filter((n): n is PermissionMenuNode => n != null);
  }

  protected isExpanded(id: string): boolean {
    return !this.collapsed().has(id);
  }

  protected toggleExpand(id: string, ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    this.collapsed.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected isChildChecked(code: string): boolean {
    return this.selectedCodes.includes(code);
  }

  protected allChildrenChecked(node: PermissionMenuNode): boolean {
    const c = node.children;
    if (!c?.length) {
      return this.selectedCodes.includes(node.code);
    }
    return c.every((ch) => this.selectedCodes.includes(ch.code));
  }

  protected isPartial(node: PermissionMenuNode): boolean {
    const c = node.children;
    if (!c?.length) {
      return false;
    }
    const n = c.filter((ch) => this.selectedCodes.includes(ch.code)).length;
    return n > 0 && n < c.length;
  }

  protected onParent(node: PermissionMenuNode, ev: Event) {
    this.parentToggle.emit({
      tree: node,
      checked: (ev.target as HTMLInputElement).checked,
    });
  }

  protected onChild(code: string, ev: Event) {
    this.childToggle.emit({
      code,
      checked: (ev.target as HTMLInputElement).checked,
    });
  }

  protected onFilter(ev: Event) {
    this.filterQuery.set((ev.target as HTMLInputElement).value);
  }
}
