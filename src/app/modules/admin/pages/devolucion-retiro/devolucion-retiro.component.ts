import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { ProductListItemDto } from '../../models/directory.models';

const DEVOLUCION_RETIRO_CODES = [
  'DEVOLUCION_ENTREGADA',
  'DEVOLUCION_PROVEEDOR',
  'RETIRO',
  'MERMAS',
  'DESMEDROS',
  'DESTRUCCION',
  'ENTREGA_TRABAJADORES',
  'CONVENIO_COLECTIVO',
  'SUSTITUCION_SINIESTRADO',
];

@Component({
  selector: 'app-devolucion-retiro',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
  ],
  templateUrl: './devolucion-retiro.component.html',
})
export class DevolucionRetiroComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Devolución / retiro' },
  ];

  protected readonly warehouseId = signal('');
  protected readonly productSearch = signal('');
  protected readonly productOptions = signal<ProductListItemDto[]>([]);
  protected readonly productId = signal('');
  protected readonly productLabel = signal('');
  protected readonly quantity = signal(1);
  protected readonly lotCode = signal('');
  protected readonly reasonId = signal('');
  protected readonly comment = signal('');

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly outputReasonsQuery = injectQuery(() => ({
    queryKey: ['inventory', 'output-reasons'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementOutputReasons()),
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Seleccionar almacén' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly reasonOptions = computed(() => {
    const reasons = (this.outputReasonsQuery.data() ?? []).filter((r) =>
      DEVOLUCION_RETIRO_CODES.includes(r.codigo),
    );
    return [
      { value: '', label: 'Motivo de salida' },
      ...reasons.map((r) => ({ value: r.id, label: r.nombre })),
    ];
  });

  protected async searchProducts() {
    const search = this.productSearch().trim();
    if (!search) return;
    const result = await firstValueFrom(
      this.api.listProducts({ search, field: 'nombre', page: 1, pageSize: 10 }),
    );
    this.productOptions.set(result.items);
  }

  protected selectProduct(product: ProductListItemDto) {
    this.productId.set(product.id);
    this.productLabel.set(product.nombre);
    this.productOptions.set([]);
    this.productSearch.set('');
  }

  protected readonly dispatchMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createInventoryOutboundMovement({
          productId: this.productId(),
          warehouseId: this.warehouseId(),
          quantity: this.quantity(),
          lotCode: this.lotCode().trim() || undefined,
          transferReasonId: this.reasonId(),
          comment: this.comment().trim() || undefined,
        }),
      ),
    onSuccess: (res) => {
      this.notify.success(res.message);
      this.quantity.set(1);
      this.lotCode.set('');
      this.comment.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la salida')),
  }));

  protected submit() {
    if (!this.warehouseId() || !this.productId() || !this.reasonId()) {
      this.notify.warning('Complete almacén, producto y motivo');
      return;
    }
    this.dispatchMutation.mutate();
  }
}
