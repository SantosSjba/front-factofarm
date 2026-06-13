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
import type { ShippingDriverDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-conductores',
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
    <app-breadcrumb-inline [segments]="[{ label: 'Guías' }, { label: 'Conductores' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Conductores</h1>
      <app-button *appHasPermission="'shipping.write'" size="sm" (btnClick)="openCreate()">Nuevo conductor</app-button>
    </app-page-toolbar>
    <app-component-card title="Filtros" className="mt-4">
      <app-list-filters [searchValue]="search()" searchPlaceholder="Buscar por nombre o documento" [showSelect]="false" (searchValueChange)="search.set($event); page.set(1)" />
    </app-component-card>
    @let listState = listQuery | queryPageState: total();
    <app-component-card title="Conductores" className="mt-4" [loading]="listState.loading" [error]="listState.error" [empty]="listState.empty" emptyTitle="Sin conductores" (retry)="listQuery.refetch()">
      <table class="w-full text-left text-sm">
        <thead class="border-b text-xs uppercase text-gray-500"><tr><th class="px-3 py-2">Documento</th><th class="px-3 py-2">Nombre</th><th class="px-3 py-2">Transportista</th><th class="px-3 py-2">Licencia</th><th class="px-3 py-2"></th></tr></thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr class="border-b border-gray-100">
              <td class="px-3 py-2">{{ row.numeroDocumento }}</td>
              <td class="px-3 py-2">{{ row.nombres }} {{ row.apellidos }}</td>
              <td class="px-3 py-2">{{ row.carrier?.razonSocial ?? '—' }}</td>
              <td class="px-3 py-2">{{ row.licencia ?? '—' }}</td>
              <td class="px-3 py-2 text-right">
                <button type="button" class="text-brand-600 hover:underline" (click)="openEdit(row)">Editar</button>
                <button type="button" class="ml-2 text-red-600 hover:underline" (click)="deleteMutation.mutate(row.id)">Eliminar</button>
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
        <h3 class="text-lg font-semibold">{{ editing() ? 'Editar conductor' : 'Nuevo conductor' }}</h3>
        <app-form-select [options]="carrierOptions()" [value]="carrierId()" (valueChange)="carrierId.set('' + $event)" />
        @if (!editing()) { <app-input-field [value]="numeroDocumento()" (valueChange)="numeroDocumento.set('' + $event)" placeholder="Número documento" /> }
        <app-input-field [value]="nombres()" (valueChange)="nombres.set('' + $event)" placeholder="Nombres" />
        <app-input-field [value]="apellidos()" (valueChange)="apellidos.set('' + $event)" placeholder="Apellidos" />
        <app-input-field [value]="licencia()" (valueChange)="licencia.set('' + $event)" placeholder="Licencia de conducir" />
        <app-input-field [value]="telefono()" (valueChange)="telefono.set('' + $event)" placeholder="Teléfono" />
        <app-button variant="primary" (btnClick)="saveMutation.mutate()" [disabled]="saveMutation.isPending()">Guardar</app-button>
      </div>
    </app-modal>
  `,
})
export class ConductoresComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<ShippingDriverDto | null>(null);
  protected readonly carrierId = signal('');
  protected readonly numeroDocumento = signal('');
  protected readonly nombres = signal('');
  protected readonly apellidos = signal('');
  protected readonly licencia = signal('');
  protected readonly telefono = signal('');

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
    queryKey: ['shipping', 'drivers', this.search(), this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listShippingDrivers({ search: this.search(), page: this.page(), pageSize: 15 })),
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
    this.numeroDocumento.set('');
    this.nombres.set('');
    this.apellidos.set('');
    this.licencia.set('');
    this.telefono.set('');
    this.modalOpen.set(true);
  }

  protected openEdit(row: ShippingDriverDto) {
    this.editing.set(row);
    this.carrierId.set(row.carrierId ?? '');
    this.numeroDocumento.set(row.numeroDocumento);
    this.nombres.set(row.nombres);
    this.apellidos.set(row.apellidos);
    this.licencia.set(row.licencia ?? '');
    this.telefono.set(row.telefono ?? '');
    this.modalOpen.set(true);
  }

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: () => {
      const edit = this.editing();
      if (edit) {
        return firstValueFrom(
          this.api.updateShippingDriver(edit.id, {
            carrierId: this.carrierId() || null,
            nombres: this.nombres().trim(),
            apellidos: this.apellidos().trim(),
            licencia: this.licencia().trim() || undefined,
            telefono: this.telefono().trim() || undefined,
          }),
        );
      }
      return firstValueFrom(
        this.api.createShippingDriver({
          carrierId: this.carrierId() || undefined,
          numeroDocumento: this.numeroDocumento().trim(),
          nombres: this.nombres().trim(),
          apellidos: this.apellidos().trim(),
          licencia: this.licencia().trim() || undefined,
          telefono: this.telefono().trim() || undefined,
        }),
      );
    },
    onSuccess: () => {
      this.notify.success('Conductor guardado');
      this.modalOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['shipping', 'drivers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteShippingDriver(id)),
    onSuccess: () => {
      this.notify.success('Conductor eliminado');
      void this.queryClient.invalidateQueries({ queryKey: ['shipping', 'drivers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar')),
  }));
}
