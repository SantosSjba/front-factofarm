import { JsonPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { ExcelIconComponent } from '../../../../shared/icons/excel-icon.component';
import { downloadBlob } from '../../components/cash/cash-files';
import type { AuditLogItemDto, PaginatedResponseDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Tono por tipo de acción: lo que borra o anula resalta. */
function actionTone(action: string): StatusTone {
  if (/DELETE|VOID|CANCEL|SUSPEND|REMOVE|FAILED|FORCE/.test(action)) return 'error';
  if (/CREATE|LOGIN_SUCCESS|ACTIVATE|APPROVE|PROVISION/.test(action)) return 'success';
  if (/PERMISSION|TENANT_PANEL/.test(action)) return 'purple';
  return 'neutral';
}

/** Registro de auditoría: quién hizo qué, cuándo y desde dónde. */
@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [
    JsonPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    ExcelIconComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './auditoria.component.html',
})
export class AuditoriaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly locale = inject(LocaleService);
  private readonly notify = inject(NotifyService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Usuarios y establecimientos' }, { label: 'Auditoría' }];
  protected readonly pageSize = 25;
  protected readonly tone = actionTone;

  protected readonly page = signal(1);
  protected readonly userId = signal('');
  protected readonly action = signal('');
  protected readonly entity = signal('');
  protected readonly dateFrom = signal(this.locale.monthStartYmd());
  protected readonly dateTo = signal(this.locale.todayYmd());

  protected readonly facetsQuery = injectQuery(() => ({
    queryKey: ['audit-logs', 'facets'] as const,
    queryFn: () => firstValueFrom(this.api.getAuditFacets()),
  }));
  protected readonly usersQuery = injectQuery(() => ({
    queryKey: ['audit-logs', 'users'] as const,
    queryFn: () => firstValueFrom(this.api.listUsers({ pageSize: 100 })),
  }));
  protected readonly actionOptions = computed(() => [{ value: '', label: 'Todas las acciones' }, ...(this.facetsQuery.data()?.actions ?? [])]);
  protected readonly entityOptions = computed(() => [{ value: '', label: 'Todos los módulos' }, ...(this.facetsQuery.data()?.entities ?? [])]);
  protected readonly userOptions = computed(() => [
    { value: '', label: 'Todos los usuarios' },
    ...(this.usersQuery.data()?.items ?? []).map((u) => ({ value: u.id, label: u.nombre })),
  ]);
  protected readonly activeFilterCount = computed(
    () =>
      [this.userId(), this.action(), this.entity()].filter(Boolean).length +
      (this.dateFrom() !== this.locale.monthStartYmd() || this.dateTo() !== this.locale.todayYmd() ? 1 : 0),
  );

  private params(): Record<string, string> {
    const p: Record<string, string> = {};
    if (this.userId()) p['userId'] = this.userId();
    if (this.action()) p['action'] = this.action();
    if (this.entity()) p['entity'] = this.entity();
    if (this.dateFrom()) p['from'] = this.dateFrom();
    if (this.dateTo()) p['to'] = this.dateTo();
    return p;
  }

  protected readonly logsQuery = injectQuery(() => ({
    queryKey: ['audit-logs', this.page(), this.userId(), this.action(), this.entity(), this.dateFrom(), this.dateTo()] as const,
    queryFn: () =>
      firstValueFrom(this.api.listAuditLogs({ ...this.params(), page: String(this.page()), pageSize: String(this.pageSize) })) as Promise<
        PaginatedResponseDto<AuditLogItemDto>
      >,
  }));
  protected readonly rows = computed(() => this.logsQuery.data()?.items ?? []);
  protected readonly total = computed(() => this.logsQuery.data()?.total ?? 0);

  protected setFilter(which: 'userId' | 'action' | 'entity' | 'dateFrom' | 'dateTo', v: string | number) {
    this[which].set(String(v ?? ''));
    this.page.set(1);
  }
  protected clearFilters() {
    this.userId.set('');
    this.action.set('');
    this.entity.set('');
    this.dateFrom.set(this.locale.monthStartYmd());
    this.dateTo.set(this.locale.todayYmd());
    this.page.set(1);
  }

  protected readonly detail = signal<AuditLogItemDto | null>(null);

  protected readonly exporting = signal(false);
  protected exportExcel() {
    this.exporting.set(true);
    this.api.exportAuditLogs(this.params()).subscribe({
      next: (blob) => {
        downloadBlob(blob, `auditoria-${this.locale.todayYmd()}.xlsx`);
        this.exporting.set(false);
      },
      error: (err) => {
        this.exporting.set(false);
        this.notify.error(httpErrorMessage(err, 'No se pudo exportar la auditoría'));
      },
    });
  }
}
