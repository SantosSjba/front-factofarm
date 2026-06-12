import { CommonModule } from '@angular/common';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { zoneQueryKeys } from '../../../../core/query/zone-query.keys';
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
import type { CustomerZoneDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-zonas',
  standalone: true,
  imports: [
    QueryPageStatePipe,
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
  templateUrl: './zonas.component.html',
})
export class ZonasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Productos' },
    { label: 'Zonas' },
  ];

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'nombre'>('nombre');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly fieldFilterOptions = [
    { value: 'nombre', label: 'Nombre' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly zonesQuery = injectQuery(() => ({
    queryKey: zoneQueryKeys.list(this.searchTerm(), this.filterField()),
    queryFn: () => firstValueFrom(this.api.listCustomerZones()),
  }));

  protected readonly rows = computed(() => {
    const source = this.zonesQuery.data() ?? [];
    const search = this.searchTerm().trim().toLowerCase();
    const field = this.filterField();
    if (!search) return source;
    if (field === 'nombre') return source.filter((x) => x.nombre.toLowerCase().includes(search));
    return source.filter((x) => x.nombre.toLowerCase().includes(search));
  });
  protected readonly totalRows = computed(() => this.rows().length);
  protected readonly pageStart = computed(() =>
    this.totalRows() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage,
  );
  protected readonly paginatedRows = computed(() => {
    const start = this.pageStart();
    return this.rows().slice(start, start + this.itemsPerPage);
  });

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<CustomerZoneDto | null>(null);
  protected readonly nombre = signal('');

  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deleting = signal<CustomerZoneDto | null>(null);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (nombre: string) => firstValueFrom(this.api.createCustomerZone(nombre)),
    onSuccess: () => {
      this.notify.success('Zona creada correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: zoneQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la zona')),
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      firstValueFrom(this.api.updateCustomerZone(id, nombre)),
    onSuccess: () => {
      this.notify.success('Zona actualizada correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: zoneQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar la zona')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteCustomerZone(id)),
    onSuccess: () => {
      this.notify.success('Zona eliminada correctamente');
      this.closeDeleteConfirm();
      void this.queryClient.invalidateQueries({ queryKey: zoneQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar la zona')),
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

  protected openEditModal(row: CustomerZoneDto) {
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
    const current = this.editing();
    if (current) {
      this.updateMutation.mutate({ id: current.id, nombre });
      return;
    }
    this.createMutation.mutate(nombre);
  }

  protected openDeleteConfirm(row: CustomerZoneDto) {
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
    const r = await this.zonesQuery.refetch();
    if (r.isError) {
      this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el listado.'));
    }
  }
}
