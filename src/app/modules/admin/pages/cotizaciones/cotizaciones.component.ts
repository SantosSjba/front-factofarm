import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { SectionHeadingComponent } from '../../../../shared/components/common/section-heading/section-heading.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { QuantityStepperComponent } from '../../../../shared/components/form/quantity-stepper/quantity-stepper.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { PosCatalogItemDto, QuotationStatus } from '../../models/directory.models';
import { OptionListComponent } from '../../../../shared/components/ui/option-list/option-list.component';
import { OptionItemComponent } from '../../../../shared/components/ui/option-list/option-list.component';

type QuoteLine = { productId: string; nombre: string; quantity: number; precio: number };

import { QuickCreateComponent } from '../../components/quick-create/quick-create.component';
@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [
    QuickCreateComponent,
    OptionItemComponent,
    OptionListComponent,
    QueryPageStatePipe,
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ListFiltersComponent,
    PageStateComponent,
    SectionHeadingComponent,
    HelpPanelComponent,
    StatusBadgeComponent,
    TextAreaComponent,
    QuantityStepperComponent,
    PaginationComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './cotizaciones.component.html' })
export class CotizacionesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Cotizaciones' }];
  protected readonly page = signal(1);
  protected readonly createOpen = signal(false);
  protected readonly warehouseId = signal('');
  protected readonly search = signal('');
  protected readonly catalog = signal<PosCatalogItemDto[]>([]);
  protected readonly lines = signal<QuoteLine[]>([]);
  protected readonly comentario = signal('');

  protected readonly pageSize = 15;
  /** Filtro por estado desde los chips del resumen. */
  protected readonly estado = signal<QuotationStatus | null>(null);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['quotations', this.page(), this.estado() ?? 'todos'] as const,
    queryFn: () => firstValueFrom(this.api.listQuotations(this.page(), this.pageSize, this.estado() ?? undefined)) }));

  /** Resumen por estado de todas las cotizaciones; cada chip filtra. */
  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: ['quotations', 'summary'] as const,
    queryFn: () => firstValueFrom(this.api.quotationsSummary()) }));

  private static readonly STATUS: Record<QuotationStatus, { label: string; tone: StatusTone; icon: string; tooltip: string; always?: boolean }> = {
    BORRADOR: { label: 'Borrador', tone: 'neutral', icon: 'mdi:file-document-edit-outline', tooltip: 'Aún no se envía al cliente.', always: true },
    ENVIADA: { label: 'Enviada', tone: 'info', icon: 'mdi:send-outline', tooltip: 'Ya se le hizo llegar al cliente.', always: true },
    ACEPTADA: { label: 'Aceptada', tone: 'success', icon: 'mdi:check-circle-outline', tooltip: 'El cliente la aceptó.' },
    RECHAZADA: { label: 'Rechazada', tone: 'error', icon: 'mdi:close-circle-outline', tooltip: 'El cliente no la aceptó.' },
    CONVERTIDA: { label: 'Convertida en venta', tone: 'success', icon: 'mdi:cart-check', tooltip: 'Se convirtió en una venta.' },
    VENCIDA: { label: 'Vencida', tone: 'warning', icon: 'mdi:clock-alert-outline', tooltip: 'Pasó su fecha de validez.' },
  };

  protected statusLabel(estado: QuotationStatus): string {
    return CotizacionesComponent.STATUS[estado]?.label ?? estado;
  }
  protected statusTone(estado: QuotationStatus): StatusTone {
    return CotizacionesComponent.STATUS[estado]?.tone ?? 'neutral';
  }

  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const s = this.summaryQuery.data();
    if (!s) return [];
    const current = this.estado();
    const chips: SummaryChip[] = [
      { id: 'all', label: 'Total', count: s.total, icon: 'mdi:file-document-multiple-outline', tone: 'neutral', clickable: true, active: current === null, tooltip: 'Ver todas las cotizaciones.' },
    ];
    for (const [id, meta] of Object.entries(CotizacionesComponent.STATUS) as [QuotationStatus, (typeof CotizacionesComponent.STATUS)[QuotationStatus]][]) {
      const count = s.byEstado[id] ?? 0;
      if (!count && !meta.always) continue;
      chips.push({ id, label: meta.label, count, icon: meta.icon, tone: meta.tone, tooltip: meta.tooltip, clickable: true, active: current === id });
    }
    return chips;
  });

  protected onSummaryChip(chip: SummaryChip) {
    const next = chip.id === 'all' ? null : (chip.id as QuotationStatus);
    this.estado.set(this.estado() === next ? null : next);
    this.page.set(1);
  }

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()) }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Seleccionar almacén' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}` })),
  ]);

  protected readonly quoteTotal = computed(() =>
    this.lines().reduce((acc, l) => acc + l.precio * l.quantity, 0),
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.createOpen() || !this.warehouseId()) return;
      const term = this.search().trim();
      const timer = setTimeout(() => void this.searchProducts(), term ? 350 : 0);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected async searchProducts() {
    if (!this.warehouseId()) return;
    try {
      const term = this.search().trim();
      const rows = await firstValueFrom(this.api.getPosCatalog(this.warehouseId(), term || undefined));
      this.catalog.set(rows);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'Error al buscar'));
    }
  }

  protected addLine(item: PosCatalogItemDto) {
    const existing = this.lines().find((l) => l.productId === item.id);
    if (existing) {
      this.lines.update((rows) =>
        rows.map((l) => (l.productId === item.id ? { ...l, quantity: l.quantity + 1 } : l)),
      );
    } else {
      this.lines.update((rows) => [
        ...rows,
        {
          productId: item.id,
          nombre: item.nombre,
          quantity: 1,
          precio: Number.parseFloat(item.precio) },
      ]);
    }
    this.search.set('');
    this.catalog.set([]);
  }

  protected setQuantity(productId: string, quantity: number) {
    this.lines.update((rows) => rows.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(1, quantity) } : l)));
  }

  protected removeLine(productId: string) {
    this.lines.update((rows) => rows.filter((l) => l.productId !== productId));
  }

  protected closeCreate() {
    if (this.createMutation.isPending()) return;
    this.createOpen.set(false);
  }

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createQuotation({
          warehouseId: this.warehouseId(),
          comentario: this.comentario().trim() || undefined,
          items: this.lines().map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.precio })) }),
      ),
    onSuccess: () => {
      this.notify.success('Cotización creada');
      this.createOpen.set(false);
      this.lines.set([]);
      this.comentario.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la cotización')) }));

  protected readonly sendMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.sendQuotation(id)),
    onSuccess: () => {
      this.notify.success('Cotización marcada como enviada');
      void this.queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo enviar')) }));
}
