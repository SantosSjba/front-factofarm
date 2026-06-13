import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { ComplaintDto, ComplaintStatusDto } from '../../models/directory.models';
import { ComplaintDetailModalComponent } from './complaint-detail-modal/complaint-detail-modal.component';

@Component({
  selector: 'app-platform-reclamaciones',
  standalone: true,
  imports: [
    CommonModule,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    ButtonComponent,
    ComplaintDetailModalComponent,
  ],
  templateUrl: './platform-reclamaciones.component.html',
})
export class PlatformReclamacionesComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly detailOpen = signal(false);
  protected readonly selectedComplaint = signal<ComplaintDto | null>(null);

  protected readonly statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'IN_REVIEW', label: 'En revisión' },
    { value: 'RESOLVED', label: 'Resuelto' },
    { value: 'CLOSED', label: 'Cerrado' },
  ];

  protected readonly complaintsQuery = injectQuery(() => ({
    queryKey: [
      'platform',
      'complaints',
      {
        search: this.searchTerm().trim(),
        status: this.statusFilter(),
        page: this.currentPage(),
      },
    ] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listComplaints({
          search: this.searchTerm(),
          status: this.statusFilter(),
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly totalItems = computed(() => this.complaintsQuery.data()?.total ?? 0);

  protected openDetail(row: ComplaintDto): void {
    this.selectedComplaint.set(row);
    this.detailOpen.set(true);
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
    this.selectedComplaint.set(null);
  }

  protected statusLabel(status: ComplaintStatusDto): string {
    const found = this.statusOptions.find((o) => o.value === status);
    return found?.label ?? status;
  }

  protected tipoLabel(tipo: ComplaintDto['tipo']): string {
    return tipo === 'RECLAMO' ? 'Reclamo' : 'Queja';
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.currentPage.set(1);
  }

  protected refetch(): void {
    void this.complaintsQuery.refetch();
  }
}
