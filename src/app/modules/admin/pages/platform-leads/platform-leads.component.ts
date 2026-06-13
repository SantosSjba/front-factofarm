import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { TenantLeadDto } from '../../models/directory.models';
import { TenantLeadConvertModalComponent } from './tenant-lead-convert-modal/tenant-lead-convert-modal.component';

@Component({
  selector: 'app-platform-leads',
  standalone: true,
  imports: [
    CommonModule,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    TenantLeadConvertModalComponent,
  ],
  templateUrl: './platform-leads.component.html',
})
export class PlatformLeadsComponent {
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
