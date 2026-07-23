import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
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
import type { AccountReceivableListItemDto } from '../../models/directory.models';

@Component({
  selector: 'app-cuentas-cobrar',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './cuentas-cobrar.component.html' })
export class CuentasCobrarComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Cuentas por cobrar' }];
  protected readonly page = signal(1);
  protected readonly payModalOpen = signal(false);
  protected readonly selectedAr = signal<AccountReceivableListItemDto | null>(null);
  protected readonly payAmount = signal(0);
  protected readonly payMetodo = signal('TRANSFERENCIA');
  protected readonly payReferencia = signal('');

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['accounts-receivable', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listAccountsReceivable({ page: this.page(), pageSize: 20 })) }));

  protected openPay(ar: AccountReceivableListItemDto) {
    this.selectedAr.set(ar);
    this.payAmount.set(Number.parseFloat(ar.saldo));
    this.payModalOpen.set(true);
  }

  protected parseNum(value: unknown): number {
    return Number(value) || 0;
  }

  protected readonly payMutation = injectMutation(() => ({
    mutationFn: () => {
      const ar = this.selectedAr();
      if (!ar) throw new Error('Sin cuenta seleccionada');
      return firstValueFrom(
        this.api.registerAccountReceivablePayment(ar.id, {
          amount: this.payAmount(),
          metodo: this.payMetodo().trim() || undefined,
          referencia: this.payReferencia().trim() || undefined }),
      );
    },
    onSuccess: () => {
      this.notify.success('Cobro registrado');
      this.payModalOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el cobro')) }));
}
