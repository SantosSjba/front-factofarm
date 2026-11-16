import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ConfirmDialogComponent } from '../../../../shared/components/common/confirm-dialog/confirm-dialog.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { DepartureAddressDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';

@Component({
  selector: 'app-direcciones-partida',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ListFiltersComponent,
    PaginationComponent,
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    ConfirmDialogComponent,
    HasPermissionDirective,
    PageStateComponent,
    HelpPanelComponent,
    FormSectionComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Guías de remisión' }, { label: 'Direcciones de partida' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Direcciones de partida</h1>
      <div data-toolbar-actions class="flex flex-wrap items-center gap-2">
        <ng-container *appHasPermission="'shipping.write'">
          <app-button size="sm" startIconName="mdi:plus" (btnClick)="openCreate()">Nueva dirección</app-button>
        </ng-container>
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="direcciones-partida">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Son los lugares desde donde sale la mercadería en una guía de remisión, por ejemplo tu almacén.</li>
        <li>El código es el del establecimiento anexo que tienes registrado en SUNAT.</li>
      </ol>
    </app-help-panel>

    <app-list-filters
      compact
      [showSelect]="false"
      [searchValue]="search()"
      searchPlaceholder="Buscar por código o nombre"
      clearLabel="Limpiar"
      (searchValueChange)="search.set($event); page.set(1)"
      (clear)="search.set(''); page.set(1)"
    />

    @let listState = listQuery | queryPageState: total();

    <!-- Tabla directa (sin tarjeta): el título ya está en la barra de la página. -->
    <app-page-state
      [loading]="listState.loading"
      [error]="listState.error"
      [empty]="listState.empty"
      [emptyTitle]="search().trim() ? 'Sin resultados para esa búsqueda' : 'Aún no hay direcciones de partida'"
      [emptyHint]="search().trim() ? 'Prueba con otro texto.' : 'Usa «Nueva dirección» para registrar el primero.'"
      skeleton="table"
      (retry)="listQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Direcciones de partida</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th data-card-role="title" class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Punto de partida</th>
            <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Dirección</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of rows(); track row.id) {
                <tr>
                  <td class="px-5 py-3 text-theme-sm">
                    <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.nombre }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">Código {{ row.codigo }}</span>
                  </td>
              <td class="px-5 py-3 text-theme-sm">{{ row.direccion }}</td>
                  <td class="px-5 py-3 text-end">
                    <div class="inline-flex items-center gap-1.5">
                      <app-button size="sm" variant="outline" [iconOnly]="true" startIconName="mdi:pencil-outline" [tooltip]="'Editar ' + row.nombre" (btnClick)="openEdit(row)" />
                      <app-button size="sm" variant="outline" [iconOnly]="true" startIconName="mdi:trash-can-outline" [tooltip]="'Eliminar ' + row.nombre" (btnClick)="deleteTarget.set(row)" />
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-page-state>

    <app-pagination [totalItems]="total()" [currentPage]="page()" [pageSize]="15" (currentPageChange)="page.set($event)" />

    <app-modal compact [isOpen]="modalOpen()" (closed)="!saveMutation.isPending() && modalOpen.set(false)" className="w-full max-w-lg shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">{{ editing() ? 'Editar dirección' : 'Nueva dirección' }}</h3>
      </div>
      <div data-modal-body class="min-h-0 px-4 py-4 sm:px-6">
        <app-form-section compact title="Datos" [cols]="2">
        @if (!editing()) {
          <app-input-field compact label="Código" [isRequired]="true" helpText="Código de establecimiento anexo SUNAT del punto de partida." placeholder="0000" [maxLength]="40" [value]="codigo()" (valueChange)="codigo.set('' + $event)" />
        }
        <app-input-field compact label="Nombre" [isRequired]="true" placeholder="Ej.: Almacén central" [maxLength]="200" [value]="nombre()" (valueChange)="nombre.set('' + $event)" />
        <app-input-field compact class="sm:col-span-2" label="Dirección completa" [isRequired]="true" [maxLength]="500" [value]="direccion()" (valueChange)="direccion.set('' + $event)" />
        </app-form-section>
      </div>
      <div data-modal-footer class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <p class="text-xs text-gray-500 dark:text-gray-400"><span class="text-error-500">*</span> Campos obligatorios</p>
        <div class="flex items-center gap-2">
          <app-button size="sm" variant="outline" startIconName="mdi:close" [disabled]="saveMutation.isPending()" (btnClick)="modalOpen.set(false)">Cancelar</app-button>
          <app-button size="sm" startIconName="mdi:content-save-outline" [disabled]="saveMutation.isPending()" [loading]="saveMutation.isPending()" (btnClick)="submit()">Guardar</app-button>
        </div>
      </div>
    </app-modal>

    <app-confirm-dialog
      [open]="!!deleteTarget()"
      title="Eliminar dirección"
      [message]="'¿Eliminar la dirección ' + (deleteTarget()?.nombre ?? '') + '?'"
      confirmLabel="Eliminar"
      (cancelled)="deleteTarget.set(null)"
      (confirmed)="confirmDelete()"
    />
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

  protected readonly deleteTarget = signal<DepartureAddressDto | null>(null);

  protected submit() {
    const missing = [
      !this.editing() && !this.codigo().trim() && 'código',
      !this.nombre().trim() && 'nombre',
      !this.direccion().trim() && 'dirección',
    ].filter(Boolean);
    if (missing.length) {
      this.notify.warning(`Complete los campos obligatorios: ${missing.join(', ')}.`);
      return;
    }
    this.saveMutation.mutate();
  }

  protected confirmDelete() {
    const row = this.deleteTarget();
    this.deleteTarget.set(null);
    if (row) this.deleteMutation.mutate(row.id);
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
