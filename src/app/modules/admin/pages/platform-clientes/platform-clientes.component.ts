import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { NotifyService } from '../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { TenantDetailDto, TenantPlanDto, TenantStatusDto } from '../../models/directory.models';
import { TenantFormModalComponent } from './tenant-form-modal/tenant-form-modal.component';
import { TenantProvisionModalComponent } from './tenant-provision-modal/tenant-provision-modal.component';
import { TenantEditModalComponent } from './tenant-edit-modal/tenant-edit-modal.component';

@Component({
  selector: 'app-platform-clientes',
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
    TenantFormModalComponent,
    TenantProvisionModalComponent,
    TenantEditModalComponent,
  ],
  templateUrl: './platform-clientes.component.html',
})
export class PlatformClientesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly planFilter = signal('all');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;

  protected readonly modalOpen = signal(false);
  protected readonly provisionOpen = signal(false);
  protected readonly editOpen = signal(false);
  protected readonly selectedTenant = signal<TenantDetailDto | null>(null);

  protected readonly statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'TRIAL', label: 'Prueba' },
    { value: 'ACTIVE', label: 'Activo' },
    { value: 'SUSPENDED', label: 'Suspendido' },
  ];

  protected readonly planOptions = [
    { value: 'all', label: 'Todos los planes' },
    { value: 'BOTICA', label: 'Botica' },
    { value: 'FARMACIA_PRO', label: 'Farmacia Pro' },
    { value: 'CADENA', label: 'Cadena' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ];

  protected readonly planFormOptions = this.planOptions.filter((o) => o.value !== 'all');

  protected readonly tenantsQuery = injectQuery(() => ({
    queryKey: [
      'platform',
      'tenants',
      {
        search: this.searchTerm().trim(),
        status: this.statusFilter(),
        plan: this.planFilter(),
        page: this.currentPage(),
      },
    ] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listTenants({
          search: this.searchTerm(),
          status: this.statusFilter(),
          plan: this.planFilter(),
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly totalItems = computed(() => this.tenantsQuery.data()?.total ?? 0);
  protected readonly totalPages = computed(() => this.tenantsQuery.data()?.totalPages ?? 1);

  protected openCreateModal(): void {
    this.modalOpen.set(true);
  }

  protected openProvisionModal(row: TenantDetailDto): void {
    this.selectedTenant.set(row);
    this.provisionOpen.set(true);
  }

  protected openEditModal(row: TenantDetailDto): void {
    this.selectedTenant.set(row);
    this.editOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.modalOpen.set(false);
  }

  protected closeProvisionModal(): void {
    this.provisionOpen.set(false);
    this.selectedTenant.set(null);
  }

  protected closeEditModal(): void {
    this.editOpen.set(false);
    this.selectedTenant.set(null);
  }

  protected async enterClientPanel(row: TenantDetailDto): Promise<void> {
    try {
      const handoff = await firstValueFrom(this.api.enterTenantPanel(row.id));
      const url = `${window.location.origin}/auth/enter-tenant?code=${encodeURIComponent(handoff.exchangeCode)}`;
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        this.notify.warning('Permita ventanas emergentes para abrir el panel del cliente.');
      } else {
        this.notify.success(`Abriendo panel de ${handoff.tenantNombre}`);
      }
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo abrir el panel del cliente'));
    }
  }

  protected async setStatus(row: TenantDetailDto, action: 'activate' | 'suspend'): Promise<void> {
    try {
      if (action === 'activate') {
        await firstValueFrom(this.api.activateTenant(row.id));
        this.notify.success('Cliente activado');
      } else {
        await firstValueFrom(this.api.suspendTenant(row.id));
        this.notify.success('Cliente suspendido');
      }
      void this.queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el estado'));
    }
  }

  protected statusLabel(status: TenantStatusDto): string {
    const map: Record<TenantStatusDto, string> = {
      PENDING: 'Pendiente',
      TRIAL: 'Prueba',
      ACTIVE: 'Activo',
      SUSPENDED: 'Suspendido',
    };
    return map[status] ?? status;
  }

  protected planLabel(plan: TenantPlanDto): string {
    const found = this.planFormOptions.find((o) => o.value === plan);
    return found?.label ?? plan;
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  protected onPlanChange(value: string): void {
    this.planFilter.set(value);
    this.currentPage.set(1);
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.planFilter.set('all');
    this.currentPage.set(1);
  }

  protected refetch(): void {
    void this.tenantsQuery.refetch();
  }
}
