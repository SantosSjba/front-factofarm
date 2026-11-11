import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ColorLegendComponent, type LegendItem, type LegendTone } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { SaleVoidModalComponent, type SaleVoidTarget } from '../../components/sale-void-modal/sale-void-modal.component';
import type {
  DataStorageMode,
  PaymentMethod,
  SaleDocumentType,
  SaleListItemDto,
  SaleStatus,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { POS_PAYMENT_OPTIONS } from '../../utils/pos-payment.util';
import {
  documentNumber,
  documentTypeLabel,
  paymentMethodLabel,
  SALE_STATUS_OPTIONS,
  saleStatusLabel,
  saleStatusTone,
  sunatStatusLabel,
  sunatStatusTone,
} from '../../utils/sale-labels';

type ReturnLineDraft = { saleItemId: string; producto: string; maxQty: number; quantity: number; lotCode: string; lotes: string[]; unitTotal: number };

@Component({
  selector: 'app-notas-venta',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ColorLegendComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    SaleVoidModalComponent,
    StatusBadgeComponent,
    TableDropdownComponent,
    TextAreaComponent,
  ],
  templateUrl: './notas-venta.component.html',
})
export class NotasVentaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly queryClient = injectQueryClient();
  private readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Historial de ventas' }];
  protected readonly pageSize = 15;
  protected readonly typeLabel = documentTypeLabel;
  protected readonly number = documentNumber;
  protected readonly statusLabel = saleStatusLabel;
  protected readonly statusTone = saleStatusTone;
  protected readonly sunatLabel = sunatStatusLabel;
  protected readonly sunatTone = sunatStatusTone;
  protected readonly payLabel = paymentMethodLabel;
  protected readonly legend: LegendItem[] = [
    { label: 'Anulada', tone: 'error-light' },
    { label: 'Anulación pendiente', tone: 'warning' },
  ];

  // ---------- Filtros ----------
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly estado = signal('');
  protected readonly documentType = signal('');
  protected readonly dateFrom = signal(this.locale.monthStartYmd());
  protected readonly dateTo = signal(this.locale.todayYmd());
  protected readonly paymentMetodo = signal('');
  protected readonly paymentReferencia = signal('');
  protected readonly storage = signal<DataStorageMode>('hot');

  protected readonly estadoOptions = [{ value: '', label: 'Todos los estados' }, ...SALE_STATUS_OPTIONS];
  protected readonly docOptions = [
    { value: '', label: 'Todos los comprobantes' },
    ...(['BOLETA', 'FACTURA', 'NOTA_VENTA', 'TICKET'] as const).map((value) => ({ value, label: documentTypeLabel(value) })),
  ];
  protected readonly paymentMethodOptions = [{ value: '', label: 'Todos los medios' }, ...POS_PAYMENT_OPTIONS];
  protected readonly storageOptions = [
    { value: 'hot', label: 'Ventas recientes' },
    { value: 'archived', label: 'Archivadas (solo consulta)' },
  ];

  protected readonly activeFilterCount = computed(
    () =>
      [this.estado(), this.documentType(), this.paymentMetodo(), this.paymentReferencia().trim(), this.storage() !== 'hot' ? '1' : ''].filter(Boolean).length +
      (this.dateFrom() !== this.locale.monthStartYmd() || this.dateTo() !== this.locale.todayYmd() ? 1 : 0),
  );

  protected readonly listQuery = injectQuery(() => ({
    queryKey: [
      'sales', 'list', this.page(), this.search(), this.estado(), this.documentType(), this.dateFrom(), this.dateTo(),
      this.paymentMetodo(), this.paymentReferencia(), this.storage(),
    ] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listSales({
          page: this.page(),
          pageSize: this.pageSize,
          search: this.storage() === 'archived' ? undefined : this.search(),
          estado: (this.estado() || undefined) as SaleStatus | undefined,
          documentType: (this.documentType() || undefined) as SaleDocumentType | undefined,
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
          paymentMetodo: (this.paymentMetodo() || undefined) as PaymentMethod | undefined,
          paymentReferencia: this.paymentReferencia().trim() || undefined,
          storage: this.storage(),
        }),
      ),
  }));
  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly total = computed(() => this.listQuery.data()?.total ?? 0);
  /** Suma de la página visible (sin anuladas). */
  protected readonly pageTotal = computed(() =>
    this.rows().filter((r) => r.estado !== 'ANULADA').reduce((acc, r) => acc + Number(r.total), 0),
  );

  protected setSearch(v: string) {
    this.search.set(v);
    this.page.set(1);
  }
  protected setFilter(which: 'estado' | 'documentType' | 'paymentMetodo' | 'paymentReferencia' | 'dateFrom' | 'dateTo', v: string | number) {
    this[which].set(String(v ?? ''));
    this.page.set(1);
  }
  protected setStorage(v: string) {
    this.storage.set(v as DataStorageMode);
    this.page.set(1);
  }
  protected clearFilters() {
    this.search.set('');
    this.estado.set('');
    this.documentType.set('');
    this.paymentMetodo.set('');
    this.paymentReferencia.set('');
    this.storage.set('hot');
    this.dateFrom.set(this.locale.monthStartYmd());
    this.dateTo.set(this.locale.todayYmd());
    this.page.set(1);
  }

  protected isArchived(row: { storage?: string; archivedAt?: string | null; fromColdStorage?: boolean }): boolean {
    return row.storage === 'archived' || !!row.archivedAt || !!row.fromColdStorage;
  }
  protected isElectronic(type: string): boolean {
    return type === 'BOLETA' || type === 'FACTURA';
  }
  protected rowTone(row: SaleListItemDto): LegendTone | null {
    if (row.estado === 'ANULADA') return 'error-light';
    if (row.pendingVoidRequestId) return 'warning';
    return null;
  }

  // ---------- Permisos ----------
  /** La API exige `sales.write` o el ítem Anulaciones para registrar devoluciones. */
  private readonly canCreateReturns = this.auth.hasPermission('sales.write') || this.auth.hasPermission('nav.anulaciones');
  protected readonly canRequestVoid =
    this.auth.hasPermission('sales.write') || this.auth.hasPermission('nav.punto_venta') || this.auth.hasPermission('nav.anulaciones');

  protected canReturn(sale: { canReturn?: boolean; storage?: string; archivedAt?: string | null; fromColdStorage?: boolean }): boolean {
    return !this.isArchived(sale) && this.canCreateReturns && sale.canReturn === true;
  }
  protected canDebit(sale: { canDebit?: boolean; storage?: string; archivedAt?: string | null; fromColdStorage?: boolean }): boolean {
    return !this.isArchived(sale) && sale.canDebit === true;
  }
  protected canVoid(row: SaleListItemDto): boolean {
    return this.canRequestVoid && !this.isArchived(row) && row.canVoid === true && !row.pendingVoidRequestId;
  }

  // ---------- Detalle ----------
  protected readonly detailRow = signal<SaleListItemDto | null>(null);
  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['sales', 'detail', this.detailRow()?.id] as const,
    enabled: !!this.detailRow(),
    queryFn: () => firstValueFrom(this.api.getSale(this.detailRow()!.id)),
  }));
  protected readonly billingStatusQuery = injectQuery(() => ({
    queryKey: ['billing', 'sale-status', this.detailRow()?.id] as const,
    enabled: !!this.detailRow() && !!this.detailRow()!.electronicDocumentId,
    queryFn: () => firstValueFrom(this.api.getSaleBillingStatus(this.detailRow()!.id)),
    refetchInterval: (q: { state: { data?: { sunatStatus: string } | null } }) =>
      q.state.data && ['PENDIENTE', 'ENVIANDO'].includes(q.state.data.sunatStatus) ? 3000 : false,
  }));

  constructor() {
    const q = this.route.snapshot.queryParamMap;
    const from = q.get('dateFrom') ?? q.get('from');
    const to = q.get('dateTo') ?? q.get('to');
    const estado = q.get('estado');
    if (from) this.dateFrom.set(from);
    if (to) this.dateTo.set(to);
    if (estado != null) this.estado.set(estado);

    effect(() => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { dateFrom: this.dateFrom() || null, dateTo: this.dateTo() || null, estado: this.estado() || null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    effect(() => {
      const sale = this.returnSaleQuery.data();
      if (!sale || this.returnLines().length > 0) return;
      this.returnLines.set(
        sale.items
          .map((item) => {
            const maxQty = Number(item.cantidadRestante ?? item.cantidad);
            return {
              saleItemId: item.id,
              producto: item.producto,
              maxQty,
              quantity: 0,
              // Con varios lotes vendidos se deja vacío: el API reparte la devolución entre los lotes originales.
              lotCode: item.lotes.length === 1 ? item.lotes[0].codigoLote : '',
              lotes: item.lotes.map((l) => l.codigoLote),
              unitTotal: Number(item.totalLinea) / Number(item.cantidad),
            };
          })
          .filter((line) => line.maxQty > 0),
      );
    });
  }

  protected downloadPdf(saleId: string) {
    this.api.downloadSalePdf(saleId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo obtener el PDF')),
    });
  }

  // ---------- Emitir / migrar ----------
  protected readonly emitMutation = injectMutation(() => ({
    mutationFn: (saleId: string) => firstValueFrom(this.api.emitElectronicDocumentFromSale(saleId)),
    onSuccess: (doc) => {
      this.notify.success(`Enviado a SUNAT · estado: ${sunatStatusLabel(doc.sunatStatus)}`);
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo enviar a SUNAT')),
  }));

  protected readonly convertRow = signal<SaleListItemDto | null>(null);
  protected readonly convertTarget = signal<'BOLETA' | 'FACTURA'>('BOLETA');
  protected readonly convertDocOptions = [
    { value: 'BOLETA', label: 'Boleta electrónica' },
    { value: 'FACTURA', label: 'Factura electrónica (el cliente debe tener RUC)' },
  ];
  protected openConvert(row: SaleListItemDto) {
    this.convertTarget.set('BOLETA');
    this.convertRow.set(row);
  }
  protected readonly convertMutation = injectMutation(() => ({
    mutationFn: (args: { id: string; target: 'BOLETA' | 'FACTURA' }) => firstValueFrom(this.api.convertSaleToCpe(args.id, args.target)),
    onSuccess: (sale) => {
      this.notify.success(`Ahora es ${documentTypeLabel(sale.documentType)} ${documentNumber(sale)}. Se enviará a SUNAT.`);
      this.convertRow.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo cambiar a boleta o factura')),
  }));

  // ---------- Devolución ----------
  protected readonly returnSaleId = signal<string | null>(null);
  protected readonly returnMotivo = signal('');
  protected readonly returnLines = signal<ReturnLineDraft[]>([]);
  protected readonly returnErrors = signal<{ motivo?: string; lines?: string }>({});
  protected readonly returnSaleQuery = injectQuery(() => ({
    queryKey: ['sales', 'return', this.returnSaleId()] as const,
    enabled: !!this.returnSaleId(),
    queryFn: () => firstValueFrom(this.api.getSale(this.returnSaleId()!)),
  }));
  protected readonly returnTotal = computed(() => this.returnLines().reduce((acc, l) => acc + l.unitTotal * l.quantity, 0));

  protected openReturn(saleId: string) {
    this.returnMotivo.set('');
    this.returnLines.set([]);
    this.returnErrors.set({});
    this.returnSaleId.set(saleId);
  }
  protected closeReturn() {
    this.returnSaleId.set(null);
  }
  protected setReturnQty(saleItemId: string, value: string | number) {
    const qty = Math.max(0, Number(value) || 0);
    this.returnLines.update((lines) => lines.map((l) => (l.saleItemId === saleItemId ? { ...l, quantity: Math.min(qty, l.maxQty) } : l)));
    this.returnErrors.update((e) => ({ ...e, lines: undefined }));
  }
  protected setReturnAll(all: boolean) {
    this.returnLines.update((lines) => lines.map((l) => ({ ...l, quantity: all ? l.maxQty : 0 })));
  }
  protected setReturnLot(saleItemId: string, value: string) {
    this.returnLines.update((lines) => lines.map((l) => (l.saleItemId === saleItemId ? { ...l, lotCode: value } : l)));
  }

  protected readonly returnMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createSaleReturn(this.returnSaleId()!, {
          motivo: this.returnMotivo().trim(),
          items: this.returnLines()
            .filter((l) => l.quantity > 0)
            .map((l) => ({ saleItemId: l.saleItemId, quantity: l.quantity, lotCode: l.lotCode.trim() || undefined })),
        }),
      ),
    onSuccess: (res) => {
      this.notify.success(res.electronicDocumentId ? `${res.message}. La nota de crédito se envía a SUNAT.` : res.message);
      this.closeReturn();
      for (const key of ['sales', 'billing', 'inventory', 'cash']) void this.queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la devolución')),
  }));

  protected submitReturn() {
    const errors: { motivo?: string; lines?: string } = {};
    if (!this.returnMotivo().trim()) errors.motivo = 'Escribe el motivo de la devolución.';
    if (!this.returnLines().some((l) => l.quantity > 0)) errors.lines = 'Indica cuánto se devuelve de al menos un producto.';
    this.returnErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.returnMutation.mutate();
  }

  // ---------- Nota de débito ----------
  protected readonly debitRow = signal<SaleListItemDto | null>(null);
  protected readonly debitMotivo = signal('');
  protected readonly debitDescripcion = signal('');
  protected readonly debitTotal = signal<number | null>(null);
  protected readonly debitErrors = signal<{ motivo?: string; descripcion?: string; total?: string }>({});

  protected openDebit(row: SaleListItemDto) {
    this.debitMotivo.set('');
    this.debitDescripcion.set('');
    this.debitTotal.set(null);
    this.debitErrors.set({});
    this.debitRow.set(row);
  }
  protected readonly debitMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createSaleDebitNote(this.debitRow()!.id, {
          motivo: this.debitMotivo().trim(),
          descripcion: this.debitDescripcion().trim(),
          total: Number(this.debitTotal()),
        }),
      ),
    onSuccess: (res) => {
      this.notify.success(`${res.message}. La nota de débito se envía a SUNAT.`);
      this.debitRow.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir la nota de débito')),
  }));
  protected submitDebit() {
    const errors: { motivo?: string; descripcion?: string; total?: string } = {};
    if (!this.debitMotivo().trim()) errors.motivo = 'Escribe el motivo del cargo.';
    if (!this.debitDescripcion().trim()) errors.descripcion = 'Escribe cómo aparecerá en el comprobante.';
    if (!(Number(this.debitTotal()) > 0)) errors.total = 'El monto debe ser mayor a 0.';
    this.debitErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.debitMutation.mutate();
  }

  // ---------- Anular ----------
  protected readonly voidTarget = signal<SaleVoidTarget | null>(null);
  protected openVoid(row: SaleListItemDto) {
    this.detailRow.set(null);
    this.voidTarget.set(row);
  }
}
