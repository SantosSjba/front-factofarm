import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { ShippingVehicleDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-vehiculos',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    FormSelectComponent,
    HasPermissionDirective,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Guías' }, { label: 'Vehículos' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Vehículos</h1>
      <app-button *appHasPermission="'shipping.write'" size="sm" (btnClick)="openCreate()">Nuevo vehículo</app-button>
    </app-page-toolbar>
    <app-component-card title="Filtros" className="mt-4">
      <app-list-filters [searchValue]="search()" searchPlaceholder="Buscar por placa o marca" [showSelect]="false" (searchValueChange)="search.set($event); page.set(1)" />
    </app-component-card>
    @let listState = listQuery | queryPageState: total();
    <app-component-card title="Vehículos" className="mt-4" [loading]="listState.loading" [error]="listState.error" [empty]="listState.empty" emptyTitle="Sin vehículos" (retry)="listQuery.refetch()">
      <table class="w-full text-left text-sm">
        <thead class="border-b text-xs uppercase text-gray-500"><tr><th class="px-3 py-2">Placa</th><th class="px-3 py-2">Marca / Modelo</th><th class="px-3 py-2">Transportista</th><th class="px-3 py-2"></th></tr></thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr class="border-b border-gray-100">
              <td class="px-3 py-2 font-medium">{{ row.placa }}</td>
              <td class="px-3 py-2">{{ row.marca ?? '—' }} {{ row.modelo ?? '' }}</td>
              <td class="px-3 py-2">{{ row.carrier?.razonSocial ?? '—' }}</td>
              <td class="px-3 py-2 text-right">
                <div class="flex flex-wrap items-center justify-end gap-1.5">
                  <app-button
                    size="sm"
                    variant="outline"
                    [iconOnly]="true"
                    startIconName="mdi:pencil-outline"
                    tooltip="Editar"
                    (btnClick)="openEdit(row)"
                  />
                  <app-button
                    size="sm"
                    variant="danger"
                    [iconOnly]="true"
                    startIconName="mdi:trash-can-outline"
                    tooltip="Eliminar"
                    (btnClick)="deleteMutation.mutate(row.id)"
                  />
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (listQuery.data(); as data) {
        <app-pagination class="mt-4" [totalItems]="total()" [currentPage]="page()" [pageSize]="15" (currentPageChange)="page.set($event)" />
      }
    </app-component-card>
    <app-modal [isOpen]="modalOpen()" (close)="modalOpen.set(false)" className="w-full max-w-lg">
      <div class="space-y-3 p-6">
        <h3 class="text-lg font-semibold">{{ editing() ? 'Editar vehículo' : 'Nuevo vehículo' }}</h3>
        <app-form-select [options]="carrierOptions()" [value]="carrierId()" (valueChange)="carrierId.set('' + $event)" />
        @if (!editing()) { <app-input-field [value]="placa()" (valueChange)="placa.set('' + $event)" placeholder="Placa" /> }
        <app-input-field [value]="marca()" (valueChange)="marca.set('' + $event)" placeholder="Marca" />
        <app-input-field [value]="modelo()" (valueChange)="modelo.set('' + $event)" placeholder="Modelo" />
        <app-input-field [value]="capacidadKg()" (valueChange)="capacidadKg.set('' + $event)" placeholder="Capacidad kg" />
        <app-button variant="primary" (btnClick)="saveMutation.mutate()" [disabled]="saveMutation.isPending()">Guardar</app-button>
      </div>
    </app-modal>
  `,
})
export class VehiculosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<ShippingVehicleDto | null>(null);
  protected readonly carrierId = signal('');
  protected readonly placa = signal('');
  protected readonly marca = signal('');
  protected readonly modelo = signal('');
  protected readonly capacidadKg = signal('');

  protected readonly carriersQuery = injectQuery(() => ({
    queryKey: ['shipping', 'carriers', 'all'] as const,
    queryFn: () => firstValueFrom(this.api.listShippingCarriers({ pageSize: 200 })),
  }));

  protected readonly carrierOptions = computed(() => [
    { value: '', label: 'Sin transportista' },
    ...((this.carriersQuery.data() && 'items' in (this.carriersQuery.data() ?? {})
      ? (this.carriersQuery.data() as { items: { id: string; razonSocial: string }[] }).items
      : []) as { id: string; razonSocial: string }[]).map((c) => ({ value: c.id, label: c.razonSocial })),
  ]);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['shipping', 'vehicles', this.search(), this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listShippingVehicles({ search: this.search(), page: this.page(), pageSize: 15 })),
  }));

  protected readonly rows = computed(() => {
    const data = this.listQuery.data();
    return data && 'items' in data ? data.items : [];
  });
  protected readonly total = computed(() => {
    const data = this.listQuery.data();
    return data && 'total' in data ? data.total : 0;
  });

  protected openCreate() {
    this.editing.set(null);
    this.carrierId.set('');
    this.placa.set('');
    this.marca.set('');
    this.modelo.set('');
    this.capacidadKg.set('');
    this.modalOpen.set(true);
  }

  protected openEdit(row: ShippingVehicleDto) {
    this.editing.set(row);
    this.carrierId.set(row.carrierId ?? '');
    this.placa.set(row.placa);
    this.marca.set(row.marca ?? '');
    this.modelo.set(row.modelo ?? '');
    this.capacidadKg.set(row.capacidadKg ?? '');
    this.modalOpen.set(true);
  }

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: () => {
      const edit = this.editing();
      const cap = Number(this.capacidadKg());
      if (edit) {
        return firstValueFrom(
          this.api.updateShippingVehicle(edit.id, {
            carrierId: this.carrierId() || null,
            marca: this.marca().trim() || undefined,
            modelo: this.modelo().trim() || undefined,
            capacidadKg: Number.isFinite(cap) ? cap : undefined,
          }),
        );
      }
      return firstValueFrom(
        this.api.createShippingVehicle({
          carrierId: this.carrierId() || undefined,
          placa: this.placa().trim(),
          marca: this.marca().trim() || undefined,
          modelo: this.modelo().trim() || undefined,
          capacidadKg: Number.isFinite(cap) ? cap : undefined,
        }),
      );
    },
    onSuccess: () => {
      this.notify.success('Vehículo guardado');
      this.modalOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['shipping', 'vehicles'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteShippingVehicle(id)),
    onSuccess: () => {
      this.notify.success('Vehículo eliminado');
      void this.queryClient.invalidateQueries({ queryKey: ['shipping', 'vehicles'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar')),
  }));
}
