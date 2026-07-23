import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe'; import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-anulaciones',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
    LabelComponent,
    ModalComponent,
  ],
  templateUrl: './anulaciones.component.html' })
export class AnulacionesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Anulaciones' }];
  protected readonly voidTargetId = signal<string | null>(null);
  protected readonly voidReason = signal('');

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['sales', 'voidable'] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listSales({ page: 1, pageSize: 50, estado: 'COMPLETADA' }),
      ) }));

  protected readonly voidMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.api.voidSale(this.voidTargetId()!, this.voidReason().trim())),
    onSuccess: () => {
      this.notify.success('Venta anulada');
      this.voidTargetId.set(null);
      this.voidReason.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo anular la venta')) }));
}
