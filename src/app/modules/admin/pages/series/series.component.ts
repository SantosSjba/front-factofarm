import { CommonModule } from '@angular/common';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { seriesQueryKeys } from '../../../../core/query/series-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { ProductSerialStatus, SeriesListFiltersRequest, SeriesListItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';

@Component({
  selector: 'app-series',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    TableDropdownComponent,
    ButtonComponent,
    IconComponent,
    ModalComponent,
  ],
  templateUrl: './series.component.html',
})
export class SeriesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();
  private readonly locale = inject(LocaleService);

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Productos' },
    { label: 'Series' },
  ];
  protected readonly itemsPerPage = 10;
  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<NonNullable<SeriesListFiltersRequest['field']>>('serie');
  protected readonly currentPage = signal(1);
  protected readonly fieldFilterOptions = [
    { value: 'serie', label: 'Serie' },
    { value: 'producto', label: 'Producto' },
    { value: 'estado', label: 'Estado' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly listQuery = injectQuery(() => {
    const filters: SeriesListFiltersRequest = {
      search: this.searchTerm().trim() || undefined,
      field: this.filterField(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: seriesQueryKeys.list(filters),
      queryFn: () => firstValueFrom(this.api.listSeries(filters)),
    };
  });

  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);

  protected readonly confirmOpen = signal(false);
  protected readonly confirmTarget = signal<SeriesListItemDto | null>(null);
  protected readonly confirmAction = signal<'toggle' | 'delete'>('toggle');

  protected readonly statusMutation = injectMutation(() => ({
    mutationFn: ({ id, estado, vendido }: { id: string; estado: ProductSerialStatus; vendido: boolean }) =>
      firstValueFrom(this.api.updateSeriesStatus(id, estado, vendido)),
    onSuccess: () => {
      this.notify.success('Serie actualizada correctamente');
      this.closeConfirmModal();
      void this.queryClient.invalidateQueries({ queryKey: seriesQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar la serie')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteSeries(id)),
    onSuccess: () => {
      this.notify.success('Serie eliminada correctamente');
      this.closeConfirmModal();
      void this.queryClient.invalidateQueries({ queryKey: seriesQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar la serie')),
  }));

  protected refetchRows() {
    void this.listQuery.refetch();
  }

  protected onSearchChange(v: string) {
    this.searchTerm.set(v);
    this.currentPage.set(1);
  }

  protected onFieldChange(v: string) {
    this.filterField.set((v || 'serie') as NonNullable<SeriesListFiltersRequest['field']>);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('serie');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected formatDate(v: string): string {
    return this.locale.formatDate(v, { dateStyle: 'short' });
  }

  protected estadoLabel(estado: ProductSerialStatus): string {
    if (estado === 'DISPONIBLE') return 'Disponible';
    if (estado === 'RESERVADO') return 'Reservado';
    if (estado === 'VENDIDO') return 'Vendido';
    return 'Anulado';
  }

  protected openToggleStatus(row: SeriesListItemDto) {
    this.confirmAction.set('toggle');
    this.confirmTarget.set(row);
    this.confirmOpen.set(true);
  }

  protected openDelete(row: SeriesListItemDto) {
    this.confirmAction.set('delete');
    this.confirmTarget.set(row);
    this.confirmOpen.set(true);
  }

  protected closeConfirmModal() {
    if (this.statusMutation.isPending() || this.deleteMutation.isPending()) return;
    this.confirmOpen.set(false);
    this.confirmTarget.set(null);
  }

  protected confirmActionText() {
    const row = this.confirmTarget();
    if (!row) return '';
    if (this.confirmAction() === 'delete') return `¿Desea eliminar la serie "${row.serie}"?`;
    return row.vendido
      ? `¿Desea marcar la serie "${row.serie}" como disponible?`
      : `¿Desea marcar la serie "${row.serie}" como vendida?`;
  }

  protected confirmActionButtonLabel() {
    if (this.confirmAction() === 'delete') {
      return this.deleteMutation.isPending() ? 'Eliminando...' : 'Eliminar';
    }
    return this.statusMutation.isPending() ? 'Guardando...' : 'Confirmar';
  }

  protected runConfirmAction() {
    const row = this.confirmTarget();
    if (!row) return;
    if (this.confirmAction() === 'delete') {
      this.deleteMutation.mutate(row.id);
      return;
    }
    const vendido = !row.vendido;
    this.statusMutation.mutate({
      id: row.id,
      vendido,
      estado: vendido ? 'VENDIDO' : 'DISPONIBLE',
    });
  }

  protected async exportRows() {
    try {
      const blob = await firstValueFrom(
        this.api.exportSeries({
          search: this.searchTerm().trim() || undefined,
          field: this.filterField(),
        }),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'series.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar el listado de series'));
    }
  }
}
