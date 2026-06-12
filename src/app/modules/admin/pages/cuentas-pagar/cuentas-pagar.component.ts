import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { AccountPayableListItemDto } from '../../models/directory.models';

@Component({
  selector: 'app-cuentas-pagar',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './cuentas-pagar.component.html',
})
export class CuentasPagarComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Cuentas por pagar' }];
  protected readonly page = signal(1);
  protected readonly payModalOpen = signal(false);
  protected readonly selectedAp = signal<AccountPayableListItemDto | null>(null);
  protected readonly payAmount = signal(0);
  protected readonly payMetodo = signal('TRANSFERENCIA');
  protected readonly payReferencia = signal('');

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['accounts-payable', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listAccountsPayable({ page: this.page(), pageSize: 20 })),
  }));

  protected openPay(ap: AccountPayableListItemDto) {
    this.selectedAp.set(ap);
    this.payAmount.set(Number.parseFloat(ap.saldo));
    this.payModalOpen.set(true);
  }

  protected readonly payMutation = injectMutation(() => ({
    mutationFn: () => {
      const ap = this.selectedAp();
      if (!ap) throw new Error('Sin cuenta seleccionada');
      return firstValueFrom(
        this.api.registerAccountPayablePayment(ap.id, {
          amount: this.payAmount(),
          metodo: this.payMetodo().trim() || undefined,
          referencia: this.payReferencia().trim() || undefined,
        }),
      );
    },
    onSuccess: () => {
      this.notify.success('Pago registrado');
      this.payModalOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el pago')),
  }));
}
