import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';

@Component({
  selector: 'app-resumenes',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
  ],
  templateUrl: './resumenes.component.html',
})
export class ResumenesComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Resúmenes' }];
  protected readonly fecha = signal(this.locale.todayYmd());
  protected readonly lastResult = signal<{ id: string; message: string } | null>(null);

  protected readonly billingConfigQuery = injectQuery(() => ({
    queryKey: ['billing', 'config'] as const,
    queryFn: () => firstValueFrom(this.api.getBillingConfig()),
  }));

  protected readonly canSendDailySummary = computed(() => {
    const caps = this.billingConfigQuery.data()?.capabilities;
    return caps ? caps.supportsDailySummary : true;
  });

  protected readonly dailySummaryBlockedMessage = computed(() => {
    const caps = this.billingConfigQuery.data()?.capabilities;
    if (!caps || caps.supportsDailySummary) return null;
    return caps.notes.join(' ') || 'El resumen diario (RC) requiere Nubefact u otro OSE compatible.';
  });

  protected readonly summaryMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.api.sendDailyBillingSummary(this.fecha())),
    onSuccess: (res) => {
      this.lastResult.set({ id: res.id, message: 'Resumen diario de boletas enviado (RC)' });
      this.notify.success('Resumen diario procesado');
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo enviar el resumen')),
  }));

  protected summaryErrorMessage(): string {
    return httpErrorMessage(this.summaryMutation.error(), 'No se pudo enviar el resumen');
  }
}
