import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ColorLegendComponent, type LegendItem } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { DirectoryApiService } from '../../services/directory-api.service';
import {
  DEBT_PAYMENT_METHODS,
  debtRowTone,
  debtStatusLabel,
  debtStatusOptions,
  debtStatusTone,
  soles,
} from '../../utils/finance-labels';

export type DebtKind = 'cobrar' | 'pagar';

/** Fila común de cuentas por cobrar y por pagar. */
type DebtRow = {
  id: string;
  documento: string;
  contraparte: string;
  contraparteDoc: string | null;
  convenio: string | null;
  montoTotal: string;
  montoPagado: string;
  saldo: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  estado: string;
};

const COPY: Record<DebtKind, {
  title: string; party: string; action: string; actionDone: string; open: string; search: string;
  help: string[]; empty: string; storageKey: string; writePerms: string[];
}> = {
  cobrar: {
    title: 'Cuentas por cobrar',
    party: 'Cliente',
    action: 'Registrar cobro',
    actionDone: 'Cobro registrado',
    open: 'Por cobrar',
    search: 'Buscar por cliente, DNI/RUC o documento',
    help: [
      'Aquí están las ventas al crédito y los convenios que el cliente aún no termina de pagar.',
      'Cuando el cliente paga, usa «Registrar cobro». Puede pagar todo o una parte; el saldo se actualiza solo.',
      'Las filas en rojo ya vencieron y las ámbar vencen en 7 días o menos. Los cobros en efectivo entran a tu caja abierta.',
    ],
    empty: 'No hay cuentas por cobrar',
    storageKey: 'cuentas-cobrar',
    writePerms: ['finance.write', 'nav.cuentas_cobrar'],
  },
  pagar: {
    title: 'Cuentas por pagar',
    party: 'Proveedor',
    action: 'Registrar pago',
    actionDone: 'Pago registrado',
    open: 'Por pagar',
    search: 'Buscar por proveedor, RUC o documento',
    help: [
      'Aquí están las compras a proveedores que aún no terminas de pagar. Se crean al recibir mercadería a crédito.',
      'Cuando pagas, usa «Registrar pago». Puedes pagar todo o una parte; el saldo se actualiza solo.',
      'Las filas en rojo ya vencieron y las ámbar vencen en 7 días o menos.',
    ],
    empty: 'No hay cuentas por pagar',
    storageKey: 'cuentas-pagar',
    writePerms: ['purchases.write', 'nav.cuentas_pagar'],
  },
};

/** Listado, totales y registro de pagos de cuentas por cobrar o por pagar. */
@Component({
  selector: 'app-debt-accounts-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ColorLegendComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    KpiTileComponent,
    ListFiltersComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './debt-accounts-page.component.html',
})
export class DebtAccountsPageComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  readonly kind = input.required<DebtKind>();
  protected readonly copy = computed(() => COPY[this.kind()]);
  protected readonly breadcrumb = computed(() => [{ label: 'Finanzas' }, { label: this.copy().title }]);
  protected readonly canPay = computed(() => this.copy().writePerms.some((p) => this.auth.hasPermission(p)));

  protected readonly pageSize = 20;
  protected readonly statusLabel = debtStatusLabel;
  protected readonly statusTone = debtStatusTone;
  protected readonly rowTone = debtRowTone;
  protected readonly legend: LegendItem[] = [
    { label: 'Vencida', tone: 'error-light' },
    { label: 'Vence en 7 días', tone: 'warning' },
  ];

  // ---------- Filtros ----------
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly estado = signal('ABIERTA');
  protected readonly estadoOptions = computed(() => debtStatusOptions(this.copy().open));
  protected readonly activeFilterCount = computed(() => (this.estado() !== 'ABIERTA' ? 1 : 0));

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['debts', this.kind(), this.page(), this.search(), this.estado()] as const,
    queryFn: async () => {
      const filters = { page: this.page(), pageSize: this.pageSize, estado: this.estado() || undefined, search: this.search() };
      if (this.kind() === 'cobrar') {
        const res = await firstValueFrom(this.api.listAccountsReceivable(filters));
        return {
          total: res.total,
          totales: res.totales,
          items: res.items.map<DebtRow>((r) => ({
            id: r.id,
            documento: r.documentoRef ?? (r.sale ? `${r.sale.serie ?? ''}-${r.sale.numero ?? ''}` : '—'),
            contraparte: r.customer.nombre,
            contraparteDoc: r.customer.numeroDocumento,
            convenio: r.agreement?.nombre ?? null,
            montoTotal: r.montoTotal,
            montoPagado: r.montoPagado,
            saldo: r.saldo,
            fechaEmision: r.fechaEmision,
            fechaVencimiento: r.fechaVencimiento,
            estado: r.estado,
          })),
        };
      }
      const res = await firstValueFrom(this.api.listAccountsPayable(filters));
      return {
        total: res.total,
        totales: res.totales,
        items: res.items.map<DebtRow>((r) => ({
          id: r.id,
          documento: r.numeroDocumento ?? '—',
          contraparte: r.supplier.razonSocial,
          contraparteDoc: r.supplier.numeroDocumento ?? null,
          convenio: null,
          montoTotal: r.montoTotal,
          montoPagado: r.montoPagado,
          saldo: r.saldo,
          fechaEmision: r.fechaEmision,
          fechaVencimiento: r.fechaVencimiento,
          estado: r.estado,
        })),
      };
    },
  }));
  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly total = computed(() => this.listQuery.data()?.total ?? 0);
  protected readonly kpis = computed(() => {
    const t = this.listQuery.data()?.totales;
    if (!t) return null;
    return {
      abierto: soles(t.porCobrar ?? t.porPagar),
      abiertos: `${t.documentosAbiertos} documento(s)`,
      vencido: soles(t.vencido),
      vencidos: t.documentosVencidos,
    };
  });

  protected setSearch(v: string) {
    this.search.set(v);
    this.page.set(1);
  }
  protected setEstado(v: string) {
    this.estado.set(v);
    this.page.set(1);
  }
  protected clearFilters() {
    this.search.set('');
    this.estado.set('ABIERTA');
    this.page.set(1);
  }
  protected isOpen(row: DebtRow) {
    return row.estado !== 'PAGADA' && row.estado !== 'ANULADA';
  }

  // ---------- Registrar pago ----------
  protected readonly payRow = signal<DebtRow | null>(null);
  protected readonly payAmount = signal<number | null>(null);
  protected readonly payMetodo = signal('TRANSFERENCIA');
  protected readonly payReferencia = signal('');
  protected readonly payErrors = signal<{ monto?: string; ref?: string }>({});
  protected readonly methodOptions = DEBT_PAYMENT_METHODS;

  protected openPay(row: DebtRow) {
    this.payAmount.set(Number(row.saldo));
    this.payMetodo.set('TRANSFERENCIA');
    this.payReferencia.set('');
    this.payErrors.set({});
    this.payRow.set(row);
  }

  protected submitPay() {
    const row = this.payRow();
    if (!row) return;
    const errors: { monto?: string; ref?: string } = {};
    const amount = Number(this.payAmount());
    const saldo = Number(row.saldo);
    if (!(amount > 0)) errors.monto = 'El monto debe ser mayor a 0.';
    else if (amount > saldo + 0.0001) errors.monto = `No puede superar el saldo (${soles(saldo)}).`;
    if (this.payMetodo() !== 'EFECTIVO' && !this.payReferencia().trim()) errors.ref = 'Escribe el número de operación.';
    this.payErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.payMutation.mutate({ id: row.id, amount });
  }

  protected readonly payMutation = injectMutation(() => ({
    mutationFn: (args: { id: string; amount: number }) => {
      const body = { amount: args.amount, metodo: this.payMetodo(), referencia: this.payReferencia().trim() || undefined };
      return this.kind() === 'cobrar'
        ? firstValueFrom(this.api.registerAccountReceivablePayment(args.id, body))
        : firstValueFrom(this.api.registerAccountPayablePayment(args.id, body));
    },
    onSuccess: () => {
      this.notify.success(this.copy().actionDone);
      this.payRow.set(null);
      for (const key of ['debts', 'accounts-receivable', 'cash', 'recent-payments', 'cash-flow']) {
        void this.queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, `No se pudo registrar el ${this.kind() === 'cobrar' ? 'cobro' : 'pago'}`)),
  }));
}
