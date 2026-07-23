import { CommonModule } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { laboratoryQueryKeys } from '../../../../core/query/laboratory-query.keys';
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
import type { CreateLaboratoryRequest, LaboratoryItemDto } from '../../models/directory.models';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-laboratorios',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    AppDatePipe,
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
    HasPermissionDirective,
  ],
  templateUrl: './laboratorios.component.html',
})
export class LaboratoriosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Productos' },
    { label: 'Laboratorios' },
  ];

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'nombre'>('nombre');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly fieldFilterOptions = [
    { value: 'nombre', label: 'Nombre' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly listQuery = injectQuery(() => ({
    queryKey: laboratoryQueryKeys.list({
      search: this.searchTerm().trim(),
      field: this.filterField(),
      page: this.currentPage(),
    }),
    queryFn: () =>
      firstValueFrom(
        this.api.listLaboratoriesPaged({
          search: this.searchTerm(),
          field: this.filterField(),
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);
  protected readonly pageStart = computed(() =>
    this.totalRows() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage,
  );
  protected readonly paginatedRows = computed(() => this.rows());

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<LaboratoryItemDto | null>(null);
  protected readonly nombre = signal('');

  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deleting = signal<LaboratoryItemDto | null>(null);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: CreateLaboratoryRequest) => firstValueFrom(this.api.createLaboratory(body)),
    onSuccess: () => {
      this.notify.success('Laboratorio creado correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: laboratoryQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear el laboratorio'));
    },
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: CreateLaboratoryRequest }) =>
      firstValueFrom(this.api.updateLaboratory(id, body)),
    onSuccess: () => {
      this.notify.success('Laboratorio actualizado correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: laboratoryQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el laboratorio'));
    },
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteLaboratory(id)),
    onSuccess: () => {
      this.notify.success('Laboratorio eliminado correctamente');
      this.closeDeleteConfirm();
      void this.queryClient.invalidateQueries({ queryKey: laboratoryQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el laboratorio'));
    },
  }));

  protected readonly isSaving = computed(
    () => this.createMutation.isPending() || this.updateMutation.isPending(),
  );

  constructor() {
    effect(() => {
      const totalPages = this.listQuery.data()?.totalPages ?? 1;
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

  protected openEditModal(row: LaboratoryItemDto) {
    this.editing.set(row);
    this.modalOpen.set(true);
  }

  protected closeFormModal(force = false) {
    if (!force && this.isSaving()) return;
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
    const body: CreateLaboratoryRequest = { nombre };
    const current = this.editing();
    if (current) {
      this.updateMutation.mutate({ id: current.id, body });
      return;
    }
    this.createMutation.mutate(body);
  }

  protected openDeleteConfirm(row: LaboratoryItemDto) {
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
    const r = await this.listQuery.refetch();
    if (r.isError) {
      this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el listado.'));
    }
  }
}
