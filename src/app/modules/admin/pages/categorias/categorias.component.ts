import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { categoryQueryKeys } from '../../../../core/query/category-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { CategoryTreeNodeDto, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Fila del árbol ya aplanada, en el orden en que se dibuja. */
type TreeRow = {
  node: CategoryTreeNodeDto;
  depth: number;
  /** Ruta desde la raíz, p. ej. «MEDICAMENTOS › ANALGÉSICOS». */
  path: string;
  hasChildren: boolean;
  expanded: boolean;
  /** Coincide con la búsqueda (las demás filas se muestran solo como contexto). */
  match: boolean;
  /** Ítems propios de la categoría (productos + servicios + packs). */
  ownItems: number;
  /** Ítems propios más los de todas sus subcategorías. */
  totalItems: number;
};

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    QueryPageStatePipe,
    BadgeComponent,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    IconComponent,
    InputFieldComponent,
    ListFiltersComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    TableDropdownComponent,
  ],
  templateUrl: './categorias.component.html',
})
export class CategoriasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Productos' },
    { label: 'Categorías' },
  ];

  protected readonly treeQuery = injectQuery(() => ({
    queryKey: [...categoryQueryKeys.all, 'tree'],
    queryFn: () => firstValueFrom(this.api.listCategoryTree()),
  }));

  protected readonly searchTerm = signal('');
  /** Categorías contraídas (por defecto todo se ve abierto). */
  protected readonly collapsed = signal<ReadonlySet<string>>(new Set());

  private readonly roots = computed(() => this.treeQuery.data() ?? []);

  /** Todos los nodos por id, con su padre y sus totales acumulados. */
  private readonly index = computed(() => {
    const byId = new Map<string, { node: CategoryTreeNodeDto; parentId: string | null; path: string; totalItems: number }>();
    const visit = (node: CategoryTreeNodeDto, parentId: string | null, parentPath: string): number => {
      const path = parentPath ? `${parentPath} › ${node.nombre}` : node.nombre;
      const entry = { node, parentId, path, totalItems: 0 };
      byId.set(node.id, entry);
      let total = this.ownItems(node);
      for (const child of node.children ?? []) total += visit(child, node.id, path);
      entry.totalItems = total;
      return total;
    };
    for (const root of this.roots()) visit(root, null, '');
    return byId;
  });

  protected readonly totalCount = computed(() => this.index().size);
  protected readonly rootCount = computed(() => this.roots().length);
  protected readonly emptyCount = computed(
    () => [...this.index().values()].filter((e) => e.totalItems === 0).length,
  );

  /** Con búsqueda: ids que coinciden más sus ancestros, para no perder el contexto. */
  private readonly searchVisibleIds = computed<{ matches: Set<string>; visible: Set<string> } | null>(() => {
    const term = this.normalize(this.searchTerm());
    if (!term) return null;
    const index = this.index();
    const matches = new Set<string>();
    const visible = new Set<string>();
    for (const [id, entry] of index) {
      if (!this.normalize(entry.node.nombre).includes(term)) continue;
      matches.add(id);
      let cursor: string | null = id;
      while (cursor && !visible.has(cursor)) {
        visible.add(cursor);
        cursor = index.get(cursor)?.parentId ?? null;
      }
    }
    return { matches, visible };
  });

  protected readonly rows = computed<TreeRow[]>(() => {
    const search = this.searchVisibleIds();
    const collapsed = this.collapsed();
    const index = this.index();
    const out: TreeRow[] = [];
    const walk = (nodes: CategoryTreeNodeDto[], depth: number) => {
      for (const node of nodes) {
        if (search && !search.visible.has(node.id)) continue;
        const children = node.children ?? [];
        const expanded = search ? true : !collapsed.has(node.id);
        out.push({
          node,
          depth,
          path: index.get(node.id)?.path ?? node.nombre,
          hasChildren: children.length > 0,
          expanded,
          match: search ? search.matches.has(node.id) : true,
          ownItems: this.ownItems(node),
          totalItems: index.get(node.id)?.totalItems ?? 0,
        });
        if (expanded) walk(children, depth + 1);
      }
    };
    walk(this.roots(), 0);
    return out;
  });

  protected readonly hasCollapsible = computed(() => [...this.index().values()].some((e) => e.node.children?.length));

  // ---------- Formulario ----------
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly nombre = signal('');
  protected readonly parentId = signal('');
  protected readonly nombreError = signal('');

  /** Padres posibles con su ruta completa; al editar se excluyen la categoría y sus subcategorías. */
  protected readonly parentSelectOptions = computed(() => {
    const editingId = this.editingId();
    const blocked = editingId ? this.descendantIds(editingId) : new Set<string>();
    if (editingId) blocked.add(editingId);
    const options = [{ value: '', label: 'Ninguna (categoría principal)' }];
    for (const [id, entry] of this.index()) {
      if (!blocked.has(id)) options.push({ value: id, label: entry.path });
    }
    return options;
  });

  protected readonly formTitle = computed(() => {
    if (this.editingId()) return 'Editar categoría';
    return this.parentId() ? 'Nueva subcategoría' : 'Nueva categoría';
  });
  protected readonly formDescription = computed(() => {
    const parent = this.parentId() ? this.index().get(this.parentId())?.path : null;
    if (this.editingId()) return parent ? `Dentro de ${parent}` : 'Categoría principal';
    return parent ? `Se creará dentro de ${parent}.` : 'Agrupa productos parecidos para encontrarlos y filtrarlos más rápido.';
  });

  // ---------- Eliminar ----------
  protected readonly deleteTarget = signal<TreeRow | null>(null);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: CreateCategoryRequest) => firstValueFrom(this.api.createCategory(body)),
    onSuccess: (_row, body) => {
      this.notify.success('Categoría creada correctamente');
      if (body.parentId) this.expand(body.parentId);
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la categoría')),
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: UpdateCategoryRequest }) =>
      firstValueFrom(this.api.updateCategory(id, body)),
    onSuccess: (_row, { body }) => {
      this.notify.success('Categoría actualizada correctamente');
      if (body.parentId) this.expand(body.parentId);
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar la categoría')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteCategory(id)),
    onSuccess: () => {
      this.notify.success('Categoría eliminada correctamente');
      this.closeDeleteConfirm(true);
      void this.queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar la categoría')),
  }));

  protected readonly isSaving = computed(() => this.createMutation.isPending() || this.updateMutation.isPending());

  // ---------- Árbol ----------
  protected toggle(id: string) {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected expandAll() {
    this.collapsed.set(new Set());
  }

  protected collapseAll() {
    const parents = [...this.index().values()].filter((e) => e.node.children?.length).map((e) => e.node.id);
    this.collapsed.set(new Set(parents));
  }

  private expand(id: string) {
    this.collapsed.update((set) => {
      if (!set.has(id)) return set;
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }

  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
  }

  protected clearFilters() {
    this.searchTerm.set('');
  }

  protected async refetchTree() {
    const r = await this.treeQuery.refetch();
    if (r.isError) this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el árbol.'));
  }

  /** Por qué no se puede eliminar, o cadena vacía si se puede. */
  protected deleteBlockReason(row: TreeRow): string {
    if (row.hasChildren) return 'Tiene subcategorías: muévelas o elimínalas primero.';
    if (row.ownItems > 0) return 'Tiene productos, servicios o packs: cámbiales la categoría primero.';
    return '';
  }

  /** Texto para la columna «Contenido», p. ej. «3 productos · 1 servicio». */
  protected contentParts(node: CategoryTreeNodeDto): { label: string; color: 'primary' | 'info' | 'warning' }[] {
    const parts: { label: string; color: 'primary' | 'info' | 'warning' }[] = [];
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    if (node.productCount) parts.push({ label: plural(node.productCount, 'producto', 'productos'), color: 'primary' });
    if (node.serviceCount) parts.push({ label: plural(node.serviceCount, 'servicio', 'servicios'), color: 'info' });
    if (node.packCount) parts.push({ label: plural(node.packCount, 'pack', 'packs'), color: 'warning' });
    return parts;
  }

  // ---------- Formulario ----------
  protected openCreateModal(parent?: TreeRow) {
    this.editingId.set(null);
    this.nombre.set('');
    this.parentId.set(parent?.node.id ?? '');
    this.nombreError.set('');
    this.formOpen.set(true);
  }

  protected openEditModal(row: TreeRow) {
    this.editingId.set(row.node.id);
    this.nombre.set(row.node.nombre);
    this.parentId.set(row.node.parentId ?? '');
    this.nombreError.set('');
    this.formOpen.set(true);
  }

  protected closeFormModal(force = false) {
    if (!force && this.isSaving()) return;
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  protected submitForm() {
    const nombre = this.nombre().trim();
    if (!nombre) {
      this.nombreError.set('Escribe el nombre de la categoría.');
      return;
    }
    this.nombreError.set('');
    const id = this.editingId();
    if (id) {
      // «null» la vuelve categoría principal; sin enviarlo no cambiaría.
      this.updateMutation.mutate({ id, body: { nombre, parentId: this.parentId() || null } });
      return;
    }
    this.createMutation.mutate({ nombre, parentId: this.parentId() || undefined });
  }

  // ---------- Eliminar ----------
  protected openDeleteConfirm(row: TreeRow) {
    this.deleteTarget.set(row);
  }

  protected closeDeleteConfirm(force = false) {
    if (!force && this.deleteMutation.isPending()) return;
    this.deleteTarget.set(null);
  }

  protected confirmDelete() {
    const row = this.deleteTarget();
    if (!row || this.deleteMutation.isPending()) return;
    this.deleteMutation.mutate(row.node.id);
  }

  // ---------- Utilidades ----------
  private ownItems(node: CategoryTreeNodeDto): number {
    return (node.productCount ?? 0) + (node.serviceCount ?? 0) + (node.packCount ?? 0);
  }

  private descendantIds(id: string): Set<string> {
    const out = new Set<string>();
    const node = this.index().get(id)?.node;
    const visit = (n: CategoryTreeNodeDto) => {
      for (const child of n.children ?? []) {
        out.add(child.id);
        visit(child);
      }
    };
    if (node) visit(node);
    return out;
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}
