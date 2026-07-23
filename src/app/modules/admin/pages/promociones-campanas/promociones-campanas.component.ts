import { CommonModule } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component, inject, signal } from '@angular/core';
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
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { PromotionType } from '../../models/directory.models';

@Component({
  selector: 'app-promociones-campanas',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
    ModalComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Promociones y cupones</h1>
      <app-button variant="primary" (btnClick)="createOpen.set(true)">Nueva campaña</app-button>
    </app-page-toolbar>
    <app-page-state [loading]="listQuery.isPending()" [error]="listError()" (retry)="listQuery.refetch()">
      <app-component-card className="mt-4">
        @if (listQuery.data(); as list) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-left text-gray-500">
                <th class="py-2">Código</th>
                <th class="py-2">Nombre</th>
                <th class="py-2">Tipo</th>
                <th class="py-2">Valor</th>
                <th class="py-2">Vigencia</th>
                <th class="py-2">Activo</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of list.items; track row.id) {
                <tr class="border-b border-gray-100 dark:border-gray-800">
                  <td class="py-2 font-mono">{{ row.codigo }}</td>
                  <td class="py-2">{{ row.nombre }}</td>
                  <td class="py-2">{{ row.tipo }}</td>
                  <td class="py-2">{{ row.valor }}</td>
                  <td class="py-2 text-xs text-gray-500">
                    {{ row.validFrom ? (row.validFrom | appDate: 'shortDate') : '—' }} —
                    {{ row.validTo ? (row.validTo | appDate: 'shortDate') : '—' }}
                  </td>
                  <td class="py-2">{{ row.activo ? 'Sí' : 'No' }}</td>
                  <td class="py-2">
                    <app-button
                      size="sm"
                      variant="danger"
                      [iconOnly]="true"
                      startIconName="mdi:trash-can-outline"
                      tooltip="Eliminar"
                      (btnClick)="remove(row.id)"
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination
            class="mt-4"
            [totalItems]="list.total"
            [currentPage]="page()"
            [pageSize]="15"
            (currentPageChange)="page.set($event)"
          />
        }
      </app-component-card>
    </app-page-state>
    <app-modal [isOpen]="createOpen()" (close)="createOpen.set(false)" className="w-full max-w-lg">
      <h3 class="mb-4 text-lg font-semibold">Nueva promoción</h3>
      <div class="grid gap-3">
        <div>
          <app-label>Código cupón</app-label>
          <app-input-field [value]="codigo()" (valueChange)="codigo.set('' + $event)" />
        </div>
        <div>
          <app-label>Nombre campaña</app-label>
          <app-input-field [value]="nombre()" (valueChange)="nombre.set('' + $event)" />
        </div>
        <app-form-select [options]="tipoOptions" [value]="tipo()" (valueChange)="tipo.set($any($event))" />
        <div>
          <app-label>Valor (% o monto según tipo)</app-label>
          <app-input-field type="number" [value]="valor()" (valueChange)="valor.set(+$event)" />
        </div>
        <app-button variant="primary" [disabled]="createMutation.isPending()" [loading]="createMutation.isPending()" (btnClick)="createMutation.mutate()">
          Guardar
        </app-button>
      </div>
    </app-modal>
  ` })
export class PromocionesCampanasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Ventas' },
    { label: 'Promociones' },
  ];
  protected readonly tipoOptions = [
    { value: 'PORCENTAJE_VENTA', label: '% sobre total venta' },
    { value: 'CANTIDAD_MINIMA', label: 'Descuento por cantidad mínima' },
    { value: 'PORCENTAJE_ITEM', label: '% sobre ítem' },
    { value: 'MONTO_ITEM', label: 'Monto fijo ítem' },
  ];

  protected readonly page = signal(1);
  protected readonly createOpen = signal(false);
  protected readonly codigo = signal('');
  protected readonly nombre = signal('');
  protected readonly tipo = signal<PromotionType>('PORCENTAJE_VENTA');
  protected readonly valor = signal(10);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['promotions', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listPromotions(this.page(), 15)) }));

  protected listError(): string | null {
    if (this.listQuery.isError()) {
      return httpErrorMessage(this.listQuery.error(), 'No se pudieron cargar promociones');
    }
    return null;
  }

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createPromotion({
          codigo: this.codigo().trim(),
          nombre: this.nombre().trim(),
          tipo: this.tipo(),
          valor: this.valor() }),
      ),
    onSuccess: () => {
      this.notify.success('Promoción creada');
      this.createOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'Error al crear')) }));

  protected async remove(id: string) {
    try {
      await firstValueFrom(this.api.deletePromotion(id));
      this.notify.success('Promoción eliminada');
      void this.queryClient.invalidateQueries({ queryKey: ['promotions'] });
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar'));
    }
  }
}
