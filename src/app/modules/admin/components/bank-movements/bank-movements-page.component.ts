import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
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
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { BankMovementListItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { soles } from '../../utils/finance-labels';

export type BankMode = 'transacciones' | 'conciliacion';

const COPY: Record<BankMode, { title: string; storageKey: string; help: string[] }> = {
  transacciones: {
    title: 'Transacciones bancarias',
    storageKey: 'transacciones',
    help: [
      'Registra aquí tus cuentas (banco o caja fuerte) y cada depósito, retiro o transferencia. El saldo de cada cuenta se actualiza solo.',
      'Usa la referencia del banco (número de operación) para encontrarlos después y conciliarlos.',
      'Los totales de arriba suman todo lo filtrado, no solo esta página.',
    ],
  },
  conciliacion: {
    title: 'Conciliación bancaria',
    storageKey: 'conciliacion-bancaria',
    help: [
      'Compara tus movimientos con el estado de cuenta del banco. Marca los que ya aparecen en el banco y pulsa «Conciliar».',
      'Por defecto ves solo los pendientes de conciliar. Cambia el filtro de estado para ver los ya conciliados.',
      'Si falta algún movimiento, regístralo con «Nuevo movimiento».',
    ],
  },
};

/** Cuentas, movimientos bancarios y conciliación (una sola pantalla con dos modos). */
@Component({
  selector: 'app-bank-movements-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    CheckboxComponent,
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
    TextAreaComponent,
  ],
  templateUrl: './bank-movements-page.component.html',
})
export class BankMovementsPageComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  readonly mode = input.required<BankMode>();
  protected readonly copy = computed(() => COPY[this.mode()]);
  protected readonly breadcrumb = computed(() => [{ label: 'Finanzas' }, { label: this.copy().title }]);
  protected readonly canWrite = ['finance.write', 'nav.balance', 'nav.transacciones'].some((p) => this.auth.hasPermission(p));
  protected readonly canReconcile = ['finance.write', 'nav.balance', 'nav.conciliacion_bancaria'].some((p) => this.auth.hasPermission(p));
  protected readonly pageSize = 20;
  protected readonly soles = soles;

  // ---------- Cuentas ----------
  protected readonly accountsQuery = injectQuery(() => ({
    queryKey: ['bank-accounts'] as const,
    queryFn: () => firstValueFrom(this.api.listBankAccounts()),
  }));
  protected readonly accounts = computed(() => this.accountsQuery.data() ?? []);
  protected readonly accountOptions = computed(() => [
    { value: '', label: 'Todas las cuentas' },
    ...this.accounts().map((a) => ({ value: a.id, label: a.nombre })),
  ]);
  protected readonly accountPickOptions = computed(() => this.accounts().map((a) => ({ value: a.id, label: `${a.nombre}${a.banco ? ' · ' + a.banco : ''}` })));

  // ---------- Filtros ----------
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly accountId = signal('');
  protected readonly tipo = signal('');
  protected readonly estado = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly tipoOptions = [
    { value: '', label: 'Ingresos y egresos' },
    { value: 'INGRESO', label: 'Solo ingresos' },
    { value: 'EGRESO', label: 'Solo egresos' },
  ];
  protected readonly estadoOptions = [
    { value: '', label: 'Todos' },
    { value: 'false', label: 'Pendientes de conciliar' },
    { value: 'true', label: 'Conciliados' },
  ];
  private readonly defaultEstado = computed(() => (this.mode() === 'conciliacion' ? 'false' : ''));
  protected readonly activeFilterCount = computed(
    () => [this.accountId(), this.tipo(), this.estado() !== this.defaultEstado() ? '1' : '', this.dateFrom(), this.dateTo()].filter(Boolean).length,
  );

  constructor() {
    // En conciliación se empieza viendo solo lo pendiente.
    effect(() => {
      const def = this.defaultEstado();
      untracked(() => this.estado.set(def));
    });
  }

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['bank-movements', this.page(), this.search(), this.accountId(), this.tipo(), this.estado(), this.dateFrom(), this.dateTo()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listBankMovements({
          page: this.page(),
          pageSize: this.pageSize,
          search: this.search(),
          bankAccountId: this.accountId() || undefined,
          tipo: (this.tipo() || undefined) as 'INGRESO' | 'EGRESO' | undefined,
          conciliado: this.estado() === '' ? undefined : this.estado() === 'true',
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
        }),
      ),
  }));
  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly total = computed(() => this.listQuery.data()?.total ?? 0);
  protected readonly totals = computed(() => this.listQuery.data()?.totales ?? null);

  protected setSearch(v: string) {
    this.search.set(v);
    this.resetPage();
  }
  protected setFilter(which: 'accountId' | 'tipo' | 'estado' | 'dateFrom' | 'dateTo', v: string | number) {
    this[which].set(String(v ?? ''));
    this.resetPage();
  }
  protected clearFilters() {
    this.search.set('');
    this.accountId.set('');
    this.tipo.set('');
    this.estado.set(this.defaultEstado());
    this.dateFrom.set('');
    this.dateTo.set('');
    this.resetPage();
  }
  private resetPage() {
    this.page.set(1);
    this.selected.set([]);
  }

  // ---------- Selección y conciliación ----------
  protected readonly selected = signal<string[]>([]);
  protected readonly pendingRows = computed(() => this.rows().filter((r) => !r.conciliado));
  protected readonly allSelected = computed(() => this.pendingRows().length > 0 && this.pendingRows().every((r) => this.selected().includes(r.id)));
  protected readonly selectedTotal = computed(() =>
    this.rows()
      .filter((r) => this.selected().includes(r.id))
      .reduce((acc, r) => acc + (r.tipo === 'EGRESO' ? -1 : 1) * Number(r.monto), 0),
  );
  protected toggle(id: string) {
    this.selected.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }
  protected toggleAll(checked: boolean) {
    this.selected.set(checked ? this.pendingRows().map((r) => r.id) : []);
  }
  protected readonly reconcileMutation = injectMutation(() => ({
    mutationFn: (ids: string[]) => firstValueFrom(this.api.reconcileBankMovements(ids)),
    onSuccess: (r) => {
      this.notify.success(`${r.reconciled} movimiento(s) conciliado(s)`);
      this.selected.set([]);
      void this.queryClient.invalidateQueries({ queryKey: ['bank-movements'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo conciliar')),
  }));

  // ---------- Nueva cuenta ----------
  protected readonly accountOpen = signal(false);
  protected readonly accNombre = signal('');
  protected readonly accTipo = signal<'BANCO' | 'CAJA'>('BANCO');
  protected readonly accBanco = signal('');
  protected readonly accNumero = signal('');
  protected readonly accError = signal('');
  protected readonly accTipoOptions = [
    { value: 'BANCO', label: 'Cuenta de banco' },
    { value: 'CAJA', label: 'Caja fuerte / efectivo guardado' },
  ];
  protected openAccount() {
    this.accNombre.set('');
    this.accTipo.set('BANCO');
    this.accBanco.set('');
    this.accNumero.set('');
    this.accError.set('');
    this.accountOpen.set(true);
  }
  protected submitAccount() {
    if (!this.accNombre().trim()) {
      this.accError.set('Escribe un nombre para reconocer la cuenta.');
      return;
    }
    this.accountMutation.mutate();
  }
  protected readonly accountMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createBankAccount({
          nombre: this.accNombre().trim(),
          tipo: this.accTipo(),
          banco: this.accBanco().trim() || undefined,
          numeroCuenta: this.accNumero().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Cuenta creada');
      this.accountOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la cuenta')),
  }));

  // ---------- Nuevo movimiento ----------
  protected readonly movOpen = signal(false);
  protected readonly movAccount = signal('');
  protected readonly movTipo = signal<'INGRESO' | 'EGRESO'>('INGRESO');
  protected readonly movMonto = signal<number | null>(null);
  protected readonly movRef = signal('');
  protected readonly movDesc = signal('');
  protected readonly movErrors = signal<{ account?: string; monto?: string }>({});
  protected readonly movTipoOptions = [
    { value: 'INGRESO', label: 'Ingreso: depósito o abono' },
    { value: 'EGRESO', label: 'Egreso: retiro, pago o cargo' },
  ];
  protected openMovement() {
    if (!this.accounts().length) {
      this.notify.info('Primero crea una cuenta.');
      this.openAccount();
      return;
    }
    this.movAccount.set(this.accountId() || (this.accounts().length === 1 ? this.accounts()[0].id : ''));
    this.movTipo.set('INGRESO');
    this.movMonto.set(null);
    this.movRef.set('');
    this.movDesc.set('');
    this.movErrors.set({});
    this.movOpen.set(true);
  }
  protected submitMovement() {
    const errors: { account?: string; monto?: string } = {};
    if (!this.movAccount()) errors.account = 'Elige la cuenta.';
    if (!(Number(this.movMonto()) > 0)) errors.monto = 'El monto debe ser mayor a 0.';
    this.movErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.movementMutation.mutate();
  }
  protected readonly movementMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createBankMovement({
          bankAccountId: this.movAccount(),
          tipo: this.movTipo(),
          monto: Number(this.movMonto()),
          referencia: this.movRef().trim() || undefined,
          descripcion: this.movDesc().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Movimiento registrado');
      this.movOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['bank-movements'] });
      void this.queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el movimiento')),
  }));

  protected signed(row: BankMovementListItemDto): number {
    return (row.tipo === 'EGRESO' ? -1 : 1) * Number(row.monto);
  }
}
