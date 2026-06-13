import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
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
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { FormStackComponent } from '../../../../shared/components/form/form-stack/form-stack.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { PosCatalogItemDto } from '../../models/directory.models';

type QuoteLine = { productId: string; nombre: string; quantity: number; precio: number };

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    FormFieldComponent,
    FormStackComponent,
    FormSelectComponent,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './cotizaciones.component.html',
})
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

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['quotations', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listQuotations(this.page(), 15)),
  }));

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Almacén' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
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
          precio: Number.parseFloat(item.precio),
        },
      ]);
    }
    this.search.set('');
    this.catalog.set([]);
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
            unitPrice: l.precio,
          })),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Cotización creada');
      this.createOpen.set(false);
      this.lines.set([]);
      this.comentario.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la cotización')),
  }));

  protected readonly sendMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.sendQuotation(id)),
    onSuccess: () => {
      this.notify.success('Cotización marcada como enviada');
      void this.queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo enviar')),
  }));
}
