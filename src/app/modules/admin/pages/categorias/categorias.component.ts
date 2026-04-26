import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { categoryQueryKeys } from '../../../../core/query/category-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { CategoryItemDto, CreateCategoryRequest } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    LabelComponent,
    IconComponent,
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

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'nombre'>('nombre');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly fieldFilterOptions = [
    { value: 'nombre', label: 'Nombre' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly categoriesQuery = injectQuery(() => ({
    queryKey: categoryQueryKeys.list({
      search: this.searchTerm().trim(),
      field: this.filterField(),
    }),
    queryFn: () =>
      firstValueFrom(
        this.api.listCategories({
          search: this.searchTerm(),
          field: this.filterField(),
        }),
      ),
  }));

  protected readonly rows = computed(() => this.categoriesQuery.data() ?? []);
  protected readonly totalRows = computed(() => this.rows().length);
  protected readonly pageStart = computed(() =>
    this.totalRows() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage,
  );
  protected readonly paginatedRows = computed(() => {
    const start = this.pageStart();
    return this.rows().slice(start, start + this.itemsPerPage);
  });

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<CategoryItemDto | null>(null);
  protected readonly nombre = signal('');

  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deleting = signal<CategoryItemDto | null>(null);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: CreateCategoryRequest) => firstValueFrom(this.api.createCategory(body)),
    onSuccess: () => {
      this.notify.success('Categoría creada correctamente');
      this.closeFormModal();
      void this.queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear la categoría'));
    },
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: CreateCategoryRequest }) =>
      firstValueFrom(this.api.updateCategory(id, body)),
    onSuccess: () => {
      this.notify.success('Categoría actualizada correctamente');
      this.closeFormModal();
      void this.queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo actualizar la categoría'));
    },
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteCategory(id)),
    onSuccess: () => {
      this.notify.success('Categoría eliminada correctamente');
      this.closeDeleteConfirm();
      void this.queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar la categoría'));
    },
  }));

  protected readonly isSaving = computed(
    () => this.createMutation.isPending() || this.updateMutation.isPending(),
  );

  constructor() {
    effect(() => {
      const total = this.totalRows();
      const totalPages = Math.max(1, Math.ceil(total / this.itemsPerPage));
      const page = this.currentPage();
      if (page > totalPages) this.currentPage.set(totalPages);
      if (page < 1) this.currentPage.set(1);
    });

    effect(() => {
      if (!this.modalOpen()) return;
      const row = this.editing();
      this.nombre.set(row?.nombre ?? '');
    });
  }

  protected openCreateModal() {
    this.editing.set(null);
    this.nombre.set('');
    this.modalOpen.set(true);
  }

  protected openEditModal(row: CategoryItemDto) {
    this.editing.set(row);
    this.modalOpen.set(true);
  }

  protected closeFormModal() {
    if (this.isSaving()) return;
    this.modalOpen.set(false);
    this.editing.set(null);
    this.nombre.set('');
  }

  protected submitForm() {
    const nombre = this.nombre().trim();
    if (!nombre) {
      this.notify.warning('Ingrese el nombre.');
      return;
    }
    const body: CreateCategoryRequest = { nombre };
    const current = this.editing();
    if (current) {
      this.updateMutation.mutate({ id: current.id, body });
      return;
    }
    this.createMutation.mutate(body);
  }

  protected openDeleteConfirm(row: CategoryItemDto) {
    this.deleting.set(row);
    this.deleteConfirmOpen.set(true);
  }

  protected closeDeleteConfirm() {
    if (this.deleteMutation.isPending()) return;
    this.deleteConfirmOpen.set(false);
    this.deleting.set(null);
  }

  protected confirmDelete() {
    const current = this.deleting();
    if (!current || this.deleteMutation.isPending()) return;
    this.deleteMutation.mutate(current.id);
  }

  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onFilterFieldChange(value: string) {
    this.filterField.set((value || 'nombre') as 'all' | 'nombre');
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('nombre');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected submitLabel() {
    if (this.isSaving()) return 'Guardando…';
    return this.editing() ? 'Actualizar' : 'Guardar';
  }

  protected async refetchRows() {
    const r = await this.categoriesQuery.refetch();
    if (r.isError) {
      this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el listado.'));
    }
  }
}
