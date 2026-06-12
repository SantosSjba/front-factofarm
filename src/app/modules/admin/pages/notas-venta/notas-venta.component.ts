import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { SaleDocumentType, SaleStatus } from '../../models/directory.models';

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
  ],
  templateUrl: './notas-venta.component.html',
})
export class NotasVentaComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Notas de venta' }];
  protected readonly page = signal(1);
  protected readonly pageSize = signal(15);
  protected readonly detailId = signal<string | null>(null);
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

  protected onFilterChange() {
    this.page.set(1);
  }

  protected openDetail(id: string) {
    this.detailId.set(id);
  }

  protected closeDetail() {
    this.detailId.set(null);
  }
}
