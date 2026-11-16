import { CommonModule } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { TenantLeadDto } from '../../models/directory.models';
import { TenantLeadConvertModalComponent } from './tenant-lead-convert-modal/tenant-lead-convert-modal.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';

@Component({
  selector: 'app-platform-leads',
  standalone: true,
  imports: [
    PageStateComponent,
    CommonModule,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    PaginationComponent,
    ButtonComponent,
    TenantLeadConvertModalComponent,
    HelpPanelComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './platform-leads.component.html',
})
export class PlatformLeadsComponent {
  private static readonly LEAD_STATUS: Record<string, { label: string; tone: StatusTone }> = {
    NEW: { label: 'Nuevo', tone: 'info' },
    CONTACTED: { label: 'Contactado', tone: 'warning' },
    QUALIFIED: { label: 'Calificado', tone: 'purple' },
    CONVERTED: { label: 'Convertido', tone: 'success' },
    REJECTED: { label: 'Descartado', tone: 'neutral' },
  };

  protected leadLabel(status: string): string {
    return PlatformLeadsComponent.LEAD_STATUS[status]?.label ?? status;
  }

  protected leadTone(status: string): StatusTone {
    return PlatformLeadsComponent.LEAD_STATUS[status]?.tone ?? 'neutral';
  }

  private readonly api = inject(DirectoryApiService);

  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly convertOpen = signal(false);
  protected readonly selectedLead = signal<TenantLeadDto | null>(null);

  protected readonly leadsQuery = injectQuery(() => ({
    queryKey: ['platform', 'tenant-leads', this.currentPage()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listTenantLeads({ page: this.currentPage(), pageSize: this.itemsPerPage }),
      ),
  }));

  protected readonly totalItems = computed(() => this.leadsQuery.data()?.total ?? 0);
  protected readonly totalPages = computed(() => this.leadsQuery.data()?.totalPages ?? 1);

  protected openConvert(lead: TenantLeadDto): void {
    this.selectedLead.set(lead);
    this.convertOpen.set(true);
  }

  protected closeConvertModal(): void {
    this.convertOpen.set(false);
    this.selectedLead.set(null);
  }

  protected refetch(): void {
    void this.leadsQuery.refetch();
  }
}
