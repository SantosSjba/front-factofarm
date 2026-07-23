import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';  import { CommonModule } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
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
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { ProductListItemDto, SaleLotAllocationMode } from '../../models/directory.models';

@Component({
  selector: 'app-salida-venta-lotes',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    AppDatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
    HasPermissionDirective,
  ],
  templateUrl: './salida-venta-lotes.component.html',
})
export class SalidaVentaLotesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Salida venta (lotes)' },
  ];

  protected readonly warehouseId = signal('');
  protected readonly productSearch = signal('');
  protected readonly productOptions = signal<ProductListItemDto[]>([]);
  protected readonly productId = signal('');
  protected readonly productLabel = signal('');
  protected readonly quantity = signal(1);
  protected readonly mode = signal<SaleLotAllocationMode>('AUTO');
  protected readonly manualLotCode = signal('');
  protected readonly manualLotQty = signal(1);
  protected readonly manualLines = signal<{ lotCode: string; quantity: number }[]>([]);
  protected readonly reference = signal('');
  protected readonly comment = signal('');

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly previewQuery = injectQuery(() => ({
    queryKey: [
      'inventory',
      'sale-allocation-preview',
      {
        productId: this.productId(),
        warehouseId: this.warehouseId(),
        quantity: this.quantity(),
        mode: this.mode(),
        manualLines: this.manualLines(),
      },
    ] as const,
    enabled: !!this.productId() && !!this.warehouseId() && this.quantity() > 0,
    queryFn: () =>
      firstValueFrom(
        this.api.previewSaleLotAllocation({
          productId: this.productId(),
          warehouseId: this.warehouseId(),
          quantity: this.quantity(),
          mode: this.mode(),
          manualLots: this.mode() === 'MANUAL' ? this.manualLines() : undefined,
        }),
      ),
  }));

  protected readonly dispatchMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.dispatchSaleStock({
          productId: this.productId(),
          warehouseId: this.warehouseId(),
          quantity: this.quantity(),
          mode: this.mode(),
          manualLots: this.mode() === 'MANUAL' ? this.manualLines() : undefined,
          reference: this.reference().trim() || undefined,
          comment: this.comment().trim() || undefined,
        }),
      ),
    onSuccess: (res) => {
      this.notify.success(res.message);
      this.manualLines.set([]);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo despachar la venta')),
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Seleccionar almacén' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly preview = computed(() => this.previewQuery.data());
  protected readonly allocationRows = computed(() => this.preview()?.asignacion ?? []);

  protected async searchProducts() {
    const search = this.productSearch().trim();
    if (!search) {
      this.productOptions.set([]);
      return;
    }
    const result = await firstValueFrom(
      this.api.listProducts({ search, field: 'nombre', page: 1, pageSize: 8 }),
    );
    this.productOptions.set('items' in result ? result.items : result);
  }

  protected selectProduct(product: ProductListItemDto) {
    this.productId.set(product.id);
    this.productLabel.set(`${product.nombre} (${product.codigoInterno ?? 'sin código'})`);
    this.productOptions.set([]);
    this.productSearch.set('');
  }

  protected setMode(value: string) {
    this.mode.set(value as SaleLotAllocationMode);
    if (value === 'AUTO') {
      this.manualLines.set([]);
    }
  }

  protected addManualLine() {
    const lotCode = this.manualLotCode().trim();
    const qty = this.manualLotQty();
    if (!lotCode) {
      this.notify.warning('Indique el código de lote.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      this.notify.warning('Cantidad inválida.');
      return;
    }
    this.manualLines.update((lines) => [...lines, { lotCode, quantity: qty }]);
    this.manualLotCode.set('');
    this.manualLotQty.set(1);
  }

  protected removeManualLine(index: number) {
    this.manualLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  protected dispatch() {
    if (!this.productId() || !this.warehouseId()) {
      this.notify.warning('Seleccione producto y almacén.');
      return;
    }
    if (this.mode() === 'MANUAL' && this.manualLines().length === 0) {
      this.notify.warning('Agregue al menos un lote en modo manual.');
      return;
    }
    this.dispatchMutation.mutate();
  }

  protected onCommentInput(event: Event) {
    const target = event.target as HTMLTextAreaElement | null;
    this.comment.set(target?.value ?? '');
  }
}
