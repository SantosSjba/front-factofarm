import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type {
  AdverseEventItemDto,
  AdverseEventSeverity,
  CustomerItemDto,
  ProductListItemDto,
} from '../../models/directory.models';

type Tab = 'farmacovigilancia' | 'mermas' | 'rentabilidad' | 'ventas' | 'medicos';

@Component({
  selector: 'app-reporte-digemid',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
    FormSelectComponent,
    ModalComponent,
  ],
  templateUrl: './reporte-digemid.component.html',
})
export class ReporteDigemidComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Fármacos' },
    { label: 'Reporte DIGEMID' },
  ];

  protected readonly activeTab = signal<Tab>('farmacovigilancia');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly profitGroupBy = signal<'product' | 'category' | 'laboratory'>('product');
  protected readonly salesGroupBy = signal<'seller' | 'warehouse' | 'hour' | 'day'>('seller');

  protected readonly createOpen = signal(false);
  protected readonly notifyOpen = signal(false);
  protected readonly notifyTarget = signal<AdverseEventItemDto | null>(null);
  protected readonly productSearch = signal('');
  protected readonly productOptions = signal<ProductListItemDto[]>([]);
  protected readonly productId = signal('');
  protected readonly customerSearch = signal('');
  protected readonly customerOptions = signal<CustomerItemDto[]>([]);
  protected readonly customerId = signal('');
  protected readonly descripcion = signal('');
  protected readonly severidad = signal<AdverseEventSeverity>('LEVE');
  protected readonly digemidReportNumber = signal('');
  protected readonly medidasCorrectivas = signal('');
  protected readonly exporting = signal(false);

  protected readonly severityOptions = [
    { value: 'LEVE', label: 'Leve' },
    { value: 'MODERADO', label: 'Moderado' },
    { value: 'GRAVE', label: 'Grave' },
  ];

  protected readonly profitGroupOptions = [
    { value: 'product', label: 'Por producto' },
    { value: 'category', label: 'Por categoría' },
    { value: 'laboratory', label: 'Por laboratorio' },
  ];

  protected readonly salesGroupOptions = [
    { value: 'seller', label: 'Por vendedor' },
    { value: 'warehouse', label: 'Por sucursal/almacén' },
    { value: 'day', label: 'Por día' },
    { value: 'hour', label: 'Por hora' },
  ];

  protected readonly adverseQuery = injectQuery(() => ({
    queryKey: ['pharma', 'adverse-events'] as const,
    enabled: this.activeTab() === 'farmacovigilancia',
    queryFn: () => firstValueFrom(this.api.listAdverseEvents()),
  }));

  protected readonly shrinkageQuery = injectQuery(() => ({
    queryKey: ['pharma', 'shrinkage', this.dateFrom(), this.dateTo()] as const,
    enabled: this.activeTab() === 'mermas',
    queryFn: () =>
      firstValueFrom(
        this.api.getPharmaShrinkageExpiry({
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
        }),
      ),
  }));

  protected readonly profitQuery = injectQuery(() => ({
    queryKey: ['pharma', 'profit', this.dateFrom(), this.dateTo(), this.profitGroupBy()] as const,
    enabled: this.activeTab() === 'rentabilidad',
    queryFn: () =>
      firstValueFrom(
        this.api.getPharmaProfitability({
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
          groupBy: this.profitGroupBy(),
        }),
      ),
  }));

  protected readonly salesQuery = injectQuery(() => ({
    queryKey: ['pharma', 'sales-analytics', this.dateFrom(), this.dateTo(), this.salesGroupBy()] as const,
    enabled: this.activeTab() === 'ventas',
    queryFn: () =>
      firstValueFrom(
        this.api.getPharmaSalesAnalytics({
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
          groupBy: this.salesGroupBy(),
        }),
      ),
  }));

  protected readonly medicoQuery = injectQuery(() => ({
    queryKey: ['pharma', 'dispensation-medico', this.dateFrom(), this.dateTo()] as const,
    enabled: this.activeTab() === 'medicos',
    queryFn: () =>
      firstValueFrom(
        this.api.getPharmaDispensationByMedico({
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
        }),
      ),
  }));

  protected readonly adverseRows = computed(() => this.adverseQuery.data() ?? []);
  protected readonly shrinkageData = computed(() => this.shrinkageQuery.data() as {
    shrinkage?: Array<Record<string, string>>;
    expiring?: Array<Record<string, string>>;
    totales?: Record<string, string>;
  } | null);
  protected readonly profitRows = computed(() => (this.profitQuery.data() ?? []) as Array<Record<string, string | number>>);
  protected readonly salesRows = computed(() => (this.salesQuery.data() ?? []) as Array<Record<string, string | number>>);
  protected readonly medicoRows = computed(() => (this.medicoQuery.data() ?? []) as Array<Record<string, string | number | null>>);

  protected readonly shrinkageItemCount = computed(() => {
    const data = this.shrinkageData();
    return (data?.shrinkage?.length ?? 0) + (data?.expiring?.length ?? 0);
  });

  protected createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createAdverseEvent({
          productId: this.productId(),
          customerId: this.customerId() || undefined,
          descripcion: this.descripcion().trim(),
          severidad: this.severidad(),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Evento adverso registrado');
      this.createOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['pharma', 'adverse-events'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el evento')),
  }));

  protected notifyMutation = injectMutation(() => ({
    mutationFn: () => {
      const target = this.notifyTarget();
      if (!target) throw new Error('Evento no seleccionado');
      return firstValueFrom(
        this.api.notifyDigemidAdverseEvent(target.id, {
          digemidReportNumber: this.digemidReportNumber().trim(),
          medidasCorrectivas: this.medidasCorrectivas().trim() || undefined,
        }),
      );
    },
    onSuccess: () => {
      this.notify.success('Notificación DIGEMID registrada');
      this.notifyOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['pharma', 'adverse-events'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la notificación')),
  }));

  protected setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  protected openCreate() {
    this.productId.set('');
    this.customerId.set('');
    this.descripcion.set('');
    this.severidad.set('LEVE');
    this.createOpen.set(true);
  }

  protected openNotify(row: AdverseEventItemDto) {
    this.notifyTarget.set(row);
    this.digemidReportNumber.set(row.digemidReportNumber ?? '');
    this.medidasCorrectivas.set(row.medidasCorrectivas ?? '');
    this.notifyOpen.set(true);
  }

  protected async searchProducts() {
    const search = this.productSearch().trim();
    if (!search) return;
    const res = await firstValueFrom(this.api.listProducts({ search, page: 1, pageSize: 8 }));
    this.productOptions.set('items' in res ? res.items : res);
  }

  protected selectProduct(p: ProductListItemDto) {
    this.productId.set(p.id);
    this.productSearch.set(p.nombre);
    this.productOptions.set([]);
  }

  protected async searchCustomers() {
    const search = this.customerSearch().trim();
    if (!search) return;
    const res = await firstValueFrom(this.api.listCustomers({ search, page: 1, pageSize: 8 }));
    this.customerOptions.set(res.items);
  }

  protected selectCustomer(c: CustomerItemDto) {
    this.customerId.set(c.id);
    this.customerSearch.set(c.nombre);
    this.customerOptions.set([]);
  }

  protected async exportFarmacovigilancia() {
    this.exporting.set(true);
    try {
      const blob = await firstValueFrom(this.api.exportAdverseEventsDigemid());
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'farmacovigilancia-digemid.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
      this.notify.success('Exportación generada');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar'));
    } finally {
      this.exporting.set(false);
    }
  }
}
