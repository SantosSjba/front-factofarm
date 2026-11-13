import { CommonModule } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { customerTypeQueryKeys } from '../../../../core/query/customer-type-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { customerQueryKeys } from '../../../../core/query/customer-query.keys';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { CreateCustomerTypeRequest, CustomerTypeItemDto } from '../../models/directory.models';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-tipo-clientes',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    AppDatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    PageStateComponent,
    TableDropdownComponent,
    MenuItemComponent,
    ListFiltersComponent,
    PaginationComponent,
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    IconComponent,
    HasPermissionDirective,
  ],
  templateUrl: './tipo-clientes.component.html',
})
export class TipoClientesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Clientes' },
    { label: 'Tipos de Clientes' },
  ];

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'descripcion'>('descripcion');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly fieldFilterOptions = [
    { value: 'descripcion', label: 'Descripción' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly customerTypesQuery = injectQuery(() => ({
    queryKey: customerTypeQueryKeys.list({
      search: this.searchTerm().trim(),
      field: this.filterField(),
      page: this.currentPage(),
    }),
    queryFn: () =>
      firstValueFrom(
        this.api.listCustomerTypesPaged({
          search: this.searchTerm(),
          field: this.filterField(),
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly rows = computed(() => this.customerTypesQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.customerTypesQuery.data()?.total ?? 0);
  protected readonly pageStart = computed(() =>
    this.totalRows() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage,
  );
  protected readonly paginatedRows = computed(() => this.rows());

  /** Mismo resumen que la pantalla Clientes (comparte caché): clientes por tipo. */
  protected readonly customersSummaryQuery = injectQuery(() => ({
    queryKey: [...customerQueryKeys.all, 'summary'] as const,
    queryFn: () => firstValueFrom(this.api.customersSummary()),
  }));
  /** Todos los tipos (suelen ser pocos) para los conteos del resumen; el listado sigue paginado. */
  protected readonly allTypesQuery = injectQuery(() => ({
    queryKey: [...customerTypeQueryKeys.all, 'summary'] as const,
    queryFn: () => firstValueFrom(this.api.listCustomerTypesPaged({ page: 1, pageSize: 100 })),
  }));
  private readonly countByType = computed(
    () => new Map((this.customersSummaryQuery.data()?.byType ?? []).map((t) => [t.id, t.count])),
  );
  protected customersOf(id: string): number {
    return this.countByType().get(id) ?? 0;
  }

  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const types = this.allTypesQuery.data();
    const s = this.customersSummaryQuery.data();
    if (!types || !s) return [];
    // Con el resumen completo de clientes (no con la página de tipos): tipos con al menos un cliente.
    const inUse = s.byType.length;
    const assigned = s.byType.reduce((a, t) => a + t.count, 0);
    return [
      { id: 'types', label: 'Tipos registrados', count: types.total, icon: 'lucide:tags', clickable: false, tooltip: 'Tipos de cliente creados en tu empresa.' },
      { id: 'in-use', label: 'En uso', count: inUse, tone: 'success', clickable: false, tooltip: 'Tipos que tienen al menos un cliente asignado.' },
      { id: 'unused', label: 'Sin clientes', count: types.total - inUse, tone: 'neutral', clickable: false, tooltip: 'Tipos que ningún cliente usa todavía.' },
      { id: 'no-type', label: 'Clientes sin tipo', count: Math.max(0, s.total - assigned), icon: 'lucide:user-x', clickable: false, tooltip: 'Clientes que aún no tienen un tipo asignado (se asigna al editar el cliente).' },
    ];
  });

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<CustomerTypeItemDto | null>(null);
  protected readonly descripcion = signal('');

  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deleting = signal<CustomerTypeItemDto | null>(null);

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: CreateCustomerTypeRequest) => firstValueFrom(this.api.createCustomerType(body)),
    onSuccess: () => {
      this.notify.success('Tipo de cliente creado correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: customerTypeQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear el tipo de cliente'));
    },
  }));

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: CreateCustomerTypeRequest }) =>
      firstValueFrom(this.api.updateCustomerType(id, body)),
    onSuccess: () => {
      this.notify.success('Tipo de cliente actualizado correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: customerTypeQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el tipo de cliente'));
    },
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteCustomerType(id)),
    onSuccess: () => {
      this.notify.success('Tipo de cliente eliminado correctamente');
      this.closeDeleteConfirm();
      void this.queryClient.invalidateQueries({ queryKey: customerTypeQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el tipo de cliente'));
    },
  }));

  protected readonly isSaving = computed(
    () => this.createMutation.isPending() || this.updateMutation.isPending(),
  );

  constructor() {
    effect(() => {
      const totalPages = this.customerTypesQuery.data()?.totalPages ?? 1;
      const page = this.currentPage();
      if (page > totalPages) this.currentPage.set(totalPages);
      if (page < 1) this.currentPage.set(1);
    });

    effect(() => {
      if (!this.modalOpen()) return;
      const row = this.editing();
      this.descripcion.set(row?.descripcion ?? '');
    });
  }

  protected openCreateModal() {
    this.editing.set(null);
    this.descripcion.set('');
    this.modalOpen.set(true);
  }

  protected openEditModal(row: CustomerTypeItemDto) {
    this.editing.set(row);
    this.modalOpen.set(true);
  }

  protected closeFormModal(force = false) {
    if (!force && this.isSaving()) return;
    this.modalOpen.set(false);
    this.editing.set(null);
    this.descripcion.set('');
  }

  protected submitForm() {
    const descripcion = this.descripcion().trim();
    if (!descripcion) {
      this.notify.warning('Ingrese la descripción.');
      return;
    }
    const body: CreateCustomerTypeRequest = { descripcion };
    const current = this.editing();
    if (current) {
      this.updateMutation.mutate({ id: current.id, body });
      return;
    }
    this.createMutation.mutate(body);
  }

  protected openDeleteConfirm(row: CustomerTypeItemDto) {
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
    this.filterField.set((value || 'descripcion') as 'all' | 'descripcion');
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('descripcion');
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
    const r = await this.customerTypesQuery.refetch();
    if (r.isError) {
      this.notify.error(httpErrorMessage(r.error, 'No se pudo actualizar el listado.'));
    }
  }
}
