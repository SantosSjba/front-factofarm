import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom, map, type Observable } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { PaginatedResponseDto } from '../../models/directory.models';

/** Fila de un catálogo: siempre tiene id y fecha; el resto son los campos del formulario. */
export type CatalogRow = { id: string; createdAt?: string } & Record<string, unknown>;

export type CatalogListParams = { search?: string; field?: string; page: number; pageSize: number };

export interface CatalogField {
  /** Propiedad de la fila y del cuerpo que se envía al API. */
  key: string;
  label: string;
  /** Igual al `@MaxLength` del DTO del backend. */
  maxLength: number;
  helpText: string;
  placeholder?: string;
}

/**
 * Configuración de una pantalla de catálogo simple (marcas, unidades, laboratorios…):
 * listado con búsqueda, alta, edición y eliminación con el mismo diseño en todas.
 */
export interface CatalogCrudConfig {
  /** Título de la página y último tramo del breadcrumb. Ej.: «Marcas». */
  title: string;
  /** Grupo del menú al que pertenece, para el breadcrumb. Por defecto «Productos». */
  section?: string;
  /** Muestra la columna «Creado» (el API debe devolver `createdAt`). Por defecto sí. */
  showCreatedAt?: boolean;
  /** Nombre en singular y minúsculas, con su artículo. Ej.: { singular: 'marca', article: 'la' }. */
  singular: string;
  article: 'el' | 'la';
  /** Ej.: «Nueva marca», «Nuevo laboratorio». */
  newLabel: string;
  /** Pasos de «¿Para qué sirve esta pantalla?». */
  help: string[];
  /** Clave para recordar si el panel de ayuda está abierto. */
  helpStorageKey: string;
  /** Permiso para crear (y editar, si no es global). */
  writePermission: string;
  /**
   * Catálogo compartido por todas las farmacias: cualquiera con permiso agrega,
   * pero solo el operador de la plataforma corrige o elimina (lo exige también el API).
   */
  global?: boolean;
  /** Campos del formulario, en orden. El primero es el que identifica la fila. */
  fields: CatalogField[];
  /** Texto del buscador; por defecto «Buscar <singular>». */
  searchPlaceholder?: string;
  /** Opciones de «Buscar por» (deben existir en el API); con una sola, no se muestra el selector. */
  searchOptions?: { value: string; label: string }[];
  /** Raíz de las query keys del catálogo (se invalida tras guardar o eliminar). */
  queryKey: readonly unknown[];
  list: (params: CatalogListParams) => Observable<PaginatedResponseDto<CatalogRow>>;
  create: (body: Record<string, string>) => Observable<unknown>;
  update: (id: string, body: Record<string, string>) => Observable<unknown>;
  remove: (id: string) => Observable<unknown>;
}

@Component({
  selector: 'app-catalog-crud-page',
  standalone: true,
  imports: [
    AppDatePipe,
    QueryPageStatePipe,
    BadgeComponent,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    HasPermissionDirective,
    HelpHintComponent,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    TableDropdownComponent,
  ],
  templateUrl: './catalog-crud-page.component.html',
})
export class CatalogCrudPageComponent {
  readonly config = input.required<CatalogCrudConfig>();

  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly queryClient = injectQueryClient();

  protected readonly itemsPerPage = 10;
  protected readonly searchTerm = signal('');
  protected readonly filterField = signal('');
  protected readonly currentPage = signal(1);

  protected readonly breadcrumbSegments = computed<BreadcrumbSegment[]>(() => [
    { label: this.config().section ?? 'Productos' },
    { label: this.config().title },
  ]);
  protected readonly searchOptions = computed(() => this.config().searchOptions ?? []);
  protected readonly defaultField = computed(() => this.searchOptions()[0]?.value ?? '');
  protected readonly activeField = computed(() => this.filterField() || this.defaultField());
  /** Editar y eliminar: en catálogos globales solo el operador de la plataforma. */
  protected readonly showCreatedAt = computed(() => this.config().showCreatedAt !== false);
  protected readonly canManageRows = computed(() => !this.config().global || this.auth.isPlatformAdmin());

  protected readonly listQuery = injectQuery(() => {
    const cfg = this.config();
    const params: CatalogListParams = {
      search: this.searchTerm().trim() || undefined,
      field: this.activeField() || undefined,
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: [...cfg.queryKey, 'list', params.search ?? '', params.field ?? 'all', params.page],
      queryFn: () => firstValueFrom(cfg.list(params)),
    };
  });

  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);
  protected readonly pageStart = computed(() => (this.currentPage() - 1) * this.itemsPerPage);

  // ---------- Formulario ----------
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<CatalogRow | null>(null);
  protected readonly values = signal<Record<string, string>>({});
  protected readonly errors = signal<Record<string, string>>({});

  // ---------- Eliminar ----------
  protected readonly deleteTarget = signal<CatalogRow | null>(null);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: Record<string, string>) => firstValueFrom(this.config().create(body)),
    onSuccess: () => this.afterSave('creado'),
    onError: (err) => this.notify.error(httpErrorMessage(err, `No se pudo crear ${this.config().article} ${this.config().singular}`)),
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: Record<string, string> }) =>
      firstValueFrom(this.config().update(id, body)),
    onSuccess: () => this.afterSave('actualizado'),
    onError: (err) => this.notify.error(httpErrorMessage(err, `No se pudo actualizar ${this.config().article} ${this.config().singular}`)),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.config().remove(id)),
    onSuccess: () => {
      this.notify.success(`${this.capitalized()} ${this.agree('eliminado')} correctamente`);
      this.closeDeleteConfirm(true);
      void this.queryClient.invalidateQueries({ queryKey: [...this.config().queryKey] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, `No se pudo eliminar ${this.config().article} ${this.config().singular}`)),
  }));

  protected readonly isSaving = computed(() => this.createMutation.isPending() || this.updateMutation.isPending());

  constructor() {
    // Si al eliminar se vacía la última página, vuelve a la anterior.
    effect(() => {
      const totalPages = Math.max(1, this.listQuery.data()?.totalPages ?? 1);
      if (this.currentPage() > totalPages) this.currentPage.set(totalPages);
    });
  }

  // ---------- Listado ----------
  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onFieldChange(value: string) {
    this.filterField.set(value);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('');
    this.currentPage.set(1);
  }

  protected async refetchRows() {
    const r = await this.listQuery.refetch();
    if (r.isError) this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el listado.'));
  }

  protected cell(row: CatalogRow, key: string): string {
    const value = row[key];
    return value == null || value === '' ? '—' : String(value);
  }

  // ---------- Formulario ----------
  protected openCreateModal() {
    this.editing.set(null);
    this.values.set(Object.fromEntries(this.config().fields.map((f) => [f.key, ''])));
    this.errors.set({});
    this.formOpen.set(true);
  }

  protected openEditModal(row: CatalogRow) {
    this.editing.set(row);
    this.values.set(Object.fromEntries(this.config().fields.map((f) => [f.key, String(row[f.key] ?? '')])));
    this.errors.set({});
    this.formOpen.set(true);
  }

  protected setValue(key: string, value: string) {
    this.values.update((v) => ({ ...v, [key]: value }));
    if (this.errors()[key]) this.errors.update(({ [key]: _, ...rest }) => rest);
  }

  protected closeFormModal(force = false) {
    if (!force && this.isSaving()) return;
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected submitForm() {
    const body: Record<string, string> = {};
    const errors: Record<string, string> = {};
    for (const field of this.config().fields) {
      const value = (this.values()[field.key] ?? '').trim();
      if (!value) errors[field.key] = `Completa «${field.label}».`;
      body[field.key] = value;
    }
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    const current = this.editing();
    if (current) {
      this.updateMutation.mutate({ id: current.id, body });
      return;
    }
    this.createMutation.mutate(body);
  }

  private afterSave(verb: 'creado' | 'actualizado') {
    this.notify.success(`${this.capitalized()} ${this.agree(verb)} correctamente`);
    this.closeFormModal(true);
    void this.queryClient.invalidateQueries({ queryKey: [...this.config().queryKey] });
  }

  // ---------- Eliminar ----------
  protected openDeleteConfirm(row: CatalogRow) {
    this.deleteTarget.set(row);
  }

  protected closeDeleteConfirm(force = false) {
    if (!force && this.deleteMutation.isPending()) return;
    this.deleteTarget.set(null);
  }

  protected confirmDelete() {
    const row = this.deleteTarget();
    if (!row || this.deleteMutation.isPending()) return;
    this.deleteMutation.mutate(row.id);
  }

  protected rowLabel(row: CatalogRow | null): string {
    const first = this.config().fields[0]?.key;
    return row && first ? String(row[first] ?? '') : '';
  }

  // ---------- Textos ----------
  /** «Marca», «Laboratorio»… */
  protected capitalized(): string {
    const s = this.config().singular;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** Concuerda el participio con el género: «creada» / «creado». */
  protected agree(word: string): string {
    return this.config().article === 'la' ? word.replace(/o$/, 'a') : word;
  }
}

/** Adapta el listado paginado de un API tipado al formato genérico del catálogo. */
export function catalogList<F, T extends { id: string; createdAt?: string }>(
  fn: (filters: F) => Observable<PaginatedResponseDto<T>>,
): CatalogCrudConfig['list'] {
  return (params) => fn(params as unknown as F) as unknown as Observable<PaginatedResponseDto<CatalogRow>>;
}

/**
 * Para APIs que devuelven la lista completa sin paginar: busca y pagina en el navegador
 * sobre los campos indicados, con el mismo formato que un listado paginado.
 */
export function catalogListFromArray<T extends { id: string }>(
  fetchAll: () => Observable<T[]>,
  searchKeys: (keyof T & string)[],
): CatalogCrudConfig['list'] {
  const normalize = (v: unknown) =>
    String(v ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  return ({ search, page, pageSize }) =>
    fetchAll().pipe(
      map((all) => {
        const term = normalize(search?.trim());
        const items = term ? all.filter((row) => searchKeys.some((k) => normalize(row[k]).includes(term))) : all;
        const total = items.length;
        return {
          items: items.slice((page - 1) * pageSize, page * pageSize) as unknown as CatalogRow[],
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
      }),
    );
}
