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
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { DepartureAddressDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-direcciones-partida',
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
    HasPermissionDirective,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Guías' }, { label: 'Direcciones de partida' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Direcciones de partida</h1>
      <app-button *appHasPermission="'shipping.write'" size="sm" (btnClick)="openCreate()">Nueva dirección</app-button>
    </app-page-toolbar>
    <app-component-card title="Filtros" className="mt-4">
      <app-list-filters [searchValue]="search()" searchPlaceholder="Buscar por código o nombre" [showSelect]="false" (searchValueChange)="search.set($event); page.set(1)" />
    </app-component-card>
    @let listState = listQuery | queryPageState: total();
    <app-component-card title="Puntos de partida" className="mt-4" [loading]="listState.loading" [error]="listState.error" [empty]="listState.empty" emptyTitle="Sin direcciones" (retry)="listQuery.refetch()">
      <table class="w-full text-left text-sm">
        <thead class="border-b text-xs uppercase text-gray-500"><tr><th class="px-3 py-2">Código</th><th class="px-3 py-2">Nombre</th><th class="px-3 py-2">Dirección</th><th class="px-3 py-2"></th></tr></thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr class="border-b border-gray-100">
              <td class="px-3 py-2 font-medium">{{ row.codigo }}</td>
              <td class="px-3 py-2">{{ row.nombre }}</td>
              <td class="px-3 py-2">{{ row.direccion }}</td>
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
        <h3 class="text-lg font-semibold">{{ editing() ? 'Editar dirección' : 'Nueva dirección' }}</h3>
        @if (!editing()) { <app-input-field [value]="codigo()" (valueChange)="codigo.set('' + $event)" placeholder="Código" /> }
        <app-input-field [value]="nombre()" (valueChange)="nombre.set('' + $event)" placeholder="Nombre (ej. Almacén central)" />
        <app-input-field [value]="direccion()" (valueChange)="direccion.set('' + $event)" placeholder="Dirección completa" />
        <app-button variant="primary" (btnClick)="saveMutation.mutate()" [disabled]="saveMutation.isPending()">Guardar</app-button>
      </div>
    </app-modal>
  `,
})
export class DireccionesPartidaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<DepartureAddressDto | null>(null);
  protected readonly codigo = signal('');
  protected readonly nombre = signal('');
  protected readonly direccion = signal('');

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['shipping', 'departure-addresses', this.search(), this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listDepartureAddresses({ search: this.search(), page: this.page(), pageSize: 15 })),
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
    this.codigo.set('');
    this.nombre.set('');
    this.direccion.set('');
    this.modalOpen.set(true);
  }

  protected openEdit(row: DepartureAddressDto) {
    this.editing.set(row);
    this.codigo.set(row.codigo);
    this.nombre.set(row.nombre);
    this.direccion.set(row.direccion);
    this.modalOpen.set(true);
  }

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: () => {
      const edit = this.editing();
      if (edit) {
        return firstValueFrom(
          this.api.updateDepartureAddress(edit.id, {
            nombre: this.nombre().trim(),
            direccion: this.direccion().trim(),
          }),
        );
      }
      return firstValueFrom(
        this.api.createDepartureAddress({
          codigo: this.codigo().trim(),
          nombre: this.nombre().trim(),
          direccion: this.direccion().trim(),
        }),
      );
    },
    onSuccess: () => {
      this.notify.success('Dirección guardada');
      this.modalOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['shipping', 'departure-addresses'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteDepartureAddress(id)),
    onSuccess: () => {
      this.notify.success('Dirección eliminada');
      void this.queryClient.invalidateQueries({ queryKey: ['shipping', 'departure-addresses'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar')),
  }));
}
