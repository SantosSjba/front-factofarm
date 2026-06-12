import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { SaleDetailDto, SaleDocumentType, SaleStatus, SunatDocumentStatus } from '../../models/directory.models';

type ReturnLineDraft = { saleItemId: string; producto: string; maxQty: number; quantity: number; lotCode: string };

@Component({
  selector: 'app-notas-venta',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    FormSelectComponent,
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    LabelComponent,
  ],
  templateUrl: './notas-venta.component.html',
})
export class NotasVentaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Notas de venta' }];
  protected readonly page = signal(1);
  protected readonly pageSize = signal(15);
  protected readonly detailId = signal<string | null>(null);
  protected readonly returnSaleId = signal<string | null>(null);
  protected readonly returnMotivo = signal('');
  protected readonly returnLines = signal<ReturnLineDraft[]>([]);
  protected readonly estado = signal<string>('');
  protected readonly documentType = signal<string>('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  protected readonly estadoOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'ANULADA', label: 'Anulada' },
    { value: 'PARCIALMENTE_DEVUELTA', label: 'Parcialmente devuelta' },
  ];

  protected readonly docOptions = [
    { value: '', label: 'Todos los comprobantes' },
    { value: 'BOLETA', label: 'Boleta' },
    { value: 'FACTURA', label: 'Factura' },
    { value: 'NOTA_VENTA', label: 'Nota de venta' },
    { value: 'TICKET', label: 'Ticket' },
  ];

  protected readonly listQuery = injectQuery(() => ({
    queryKey: [
      'sales',
      'list',
      this.page(),
      this.pageSize(),
      this.estado(),
      this.documentType(),
      this.dateFrom(),
      this.dateTo(),
    ] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listSales({
          page: this.page(),
          pageSize: this.pageSize(),
          estado: (this.estado() || undefined) as SaleStatus | undefined,
          documentType: (this.documentType() || undefined) as SaleDocumentType | undefined,
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
        }),
      ),
  }));

  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['sales', 'detail', this.detailId()] as const,
    enabled: !!this.detailId(),
    queryFn: () => firstValueFrom(this.api.getSale(this.detailId()!)),
  }));

  protected readonly returnSaleQuery = injectQuery(() => ({
    queryKey: ['sales', 'return', this.returnSaleId()] as const,
    enabled: !!this.returnSaleId(),
    queryFn: () => firstValueFrom(this.api.getSale(this.returnSaleId()!)),
  }));

  protected readonly billingStatusQuery = injectQuery(() => ({
    queryKey: ['billing', 'sale-status', this.detailId()] as const,
    enabled: !!this.detailId(),
    queryFn: () => firstValueFrom(this.api.getSaleBillingStatus(this.detailId()!)),
    refetchInterval: 3000,
  }));

  protected readonly returnTotal = computed(() =>
    this.returnLines().reduce((acc, line) => {
      const sale = this.returnSaleQuery.data();
      const item = sale?.items.find((i) => i.id === line.saleItemId);
      if (!item) return acc;
      const unitTotal = Number(item.totalLinea) / Number(item.cantidad);
      return acc + unitTotal * line.quantity;
    }, 0),
  );

  constructor() {
    effect(() => {
      const sale = this.returnSaleQuery.data();
      if (!sale || this.returnLines().length > 0) return;
      this.returnLines.set(
        sale.items.map((item) => ({
          saleItemId: item.id,
          producto: item.producto,
          maxQty: Number(item.cantidad),
          quantity: Number(item.cantidad),
          lotCode: item.lotes[0]?.codigoLote ?? '',
        })),
      );
    });
  }

  protected readonly returnMutation = injectMutation(() => ({
    mutationFn: () => {
      const items = this.returnLines()
        .filter((line) => line.quantity > 0)
        .map((line) => ({
          saleItemId: line.saleItemId,
          quantity: line.quantity,
          lotCode: line.lotCode.trim() || undefined,
        }));
      if (items.length === 0) throw new Error('Indique al menos un ítem a devolver');
      return firstValueFrom(
        this.api.createSaleReturn(this.returnSaleId()!, {
          motivo: this.returnMotivo().trim(),
          items,
        }),
      );
    },
    onSuccess: (res) => {
      this.notify.success(
        res.electronicDocumentId
          ? `${res.message}. NC electrónica en proceso.`
          : res.message,
      );
      this.closeReturn();
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
      void this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la devolución')),
  }));

  protected onFilterChange() {
    this.page.set(1);
  }

  protected openDetail(id: string) {
    this.detailId.set(id);
  }

  protected closeDetail() {
    this.detailId.set(null);
  }

  protected canReturn(sale: SaleDetailDto): boolean {
    return (
      (sale.documentType === 'BOLETA' || sale.documentType === 'FACTURA') &&
      (sale.estado === 'COMPLETADA' || sale.estado === 'PARCIALMENTE_DEVUELTA')
    );
  }

  protected openReturn(saleId: string) {
    this.returnSaleId.set(saleId);
    this.returnMotivo.set('');
    this.returnLines.set([]);
  }

  protected closeReturn() {
    this.returnSaleId.set(null);
    this.returnMotivo.set('');
    this.returnLines.set([]);
  }

  protected updateReturnQty(saleItemId: string, value: string) {
    const qty = Math.max(0, Number(value) || 0);
    this.returnLines.update((lines) =>
      lines.map((line) =>
        line.saleItemId === saleItemId
          ? { ...line, quantity: Math.min(qty, line.maxQty) }
          : line,
      ),
    );
  }

  protected updateReturnLot(saleItemId: string, value: string) {
    this.returnLines.update((lines) =>
      lines.map((line) => (line.saleItemId === saleItemId ? { ...line, lotCode: value } : line)),
    );
  }

  protected submitReturn() {
    if (!this.returnMotivo().trim()) {
      this.notify.warning('Indique el motivo de la devolución');
      return;
    }
    this.returnMutation.mutate();
  }

  protected sunatStatusClass(status: SunatDocumentStatus): string {
    if (status === 'ACEPTADO') return 'bg-emerald-100 text-emerald-800';
    if (status === 'RECHAZADO') return 'bg-red-100 text-red-800';
    if (status === 'PENDIENTE' || status === 'ENVIANDO') return 'bg-amber-100 text-amber-800';
    if (status === 'CONTINGENCIA') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  }
}
