import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { DirectoryApiService } from '../../services/directory-api.service';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import type { AuditLogItemDto } from '../../models/directory.models';

@Component({
  selector: 'app-auditoria',
  imports: [ComponentCardComponent, PageStateComponent, PageToolbarComponent],
  templateUrl: './auditoria.component.html',
})
export class AuditoriaComponent {
  private readonly api = inject(DirectoryApiService);
  protected readonly locale = inject(LocaleService);
  protected readonly cursor = signal<string | null>(null);

  protected readonly logsQuery = injectQuery(() => ({
    queryKey: ['audit-logs', this.cursor()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listAuditLogs({
          pageSize: '30',
          ...(this.cursor() ? { cursor: this.cursor()! } : {}),
        }),
      ),
  }));

  protected items(): AuditLogItemDto[] {
    const data = this.logsQuery.data();
    if (!data) return [];
    return data.items ?? [];
  }

  protected nextCursor(): string | null {
    const data = this.logsQuery.data();
    if (!data || !('nextCursor' in data)) return null;
    return data.nextCursor;
  }

  protected loadMore(): void {
    const next = this.nextCursor();
    if (next) this.cursor.set(next);
  }

  protected formatDate(value: string): string {
    return this.locale.formatDate(value, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  protected logsErrorMessage(): string | null {
    return this.logsQuery.isError()
      ? httpErrorMessage(this.logsQuery.error(), 'No se pudo cargar el registro de auditoría.')
      : null;
  }
}
