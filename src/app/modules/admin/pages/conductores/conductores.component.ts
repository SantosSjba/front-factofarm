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
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ConfirmDialogComponent } from '../../../../shared/components/common/confirm-dialog/confirm-dialog.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { ShippingDriverDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

import { QuickCreateComponent } from '../../components/quick-create/quick-create.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
@Component({
  selector: 'app-conductores',
  standalone: true,
  imports: [
    QuickCreateComponent,
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
    FormSelectComponent,
    HasPermissionDirective,
    PageStateComponent,
    HelpPanelComponent,
    FormSectionComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Guías de remisión' }, { label: 'Conductores' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Conductores</h1>
      <div data-toolbar-actions class="flex flex-wrap items-center gap-2">
        <ng-container *appHasPermission="'shipping.write'">
          <app-button size="sm" startIconName="mdi:plus" (btnClick)="openCreate()">Nuevo conductor</app-button>
        </ng-container>
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="conductores">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Son las personas que manejan el vehículo en una guía de remisión de transporte privado.</li>
        <li>SUNAT pide su documento y su licencia de conducir.</li>
      </ol>
    </app-help-panel>

    <app-list-filters
      compact
      [showSelect]="false"
      [searchValue]="search()"
      searchPlaceholder="Buscar por nombre o documento"
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
      [emptyTitle]="search().trim() ? 'Sin resultados para esa búsqueda' : 'Aún no hay conductores'"
      [emptyHint]="search().trim() ? 'Prueba con otro texto.' : 'Usa «Nuevo conductor» para registrar el primero.'"
      skeleton="table"
      (retry)="listQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Conductores</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th data-card-role="title" class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Conductor</th>
            <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Transportista</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of rows(); track row.id) {
                <tr>
                  <td class="px-5 py-3 text-theme-sm">
                    <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.nombres }} {{ row.apellidos }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">Doc. {{ row.numeroDocumento }}{{ row.licencia ? ' · Licencia ' + row.licencia : '' }}</span>
                  </td>
              <td class="px-5 py-3 text-theme-sm">{{ row.carrier?.razonSocial ?? '—' }}</td>
                  <td class="px-5 py-3 text-end">
                    <div class="inline-flex items-center gap-1.5">
                      <app-button size="sm" variant="outline" [iconOnly]="true" startIconName="mdi:pencil-outline" [tooltip]="'Editar ' + row.nombres" (btnClick)="openEdit(row)" />
                      <app-button size="sm" variant="outline" [iconOnly]="true" startIconName="mdi:trash-can-outline" [tooltip]="'Eliminar ' + row.nombres" (btnClick)="deleteTarget.set(row)" />
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
        <h3 class="pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">{{ editing() ? 'Editar conductor' : 'Nuevo conductor' }}</h3>
      </div>
      <div data-modal-body class="min-h-0 px-4 py-4 sm:px-6">
        <app-form-section compact title="Datos" [cols]="2">
        <div class="flex items-end gap-2 sm:col-span-2">
          <app-form-select compact class="min-w-0 flex-1" label="Transportista" helpText="Empresa de transporte a la que pertenece. Opcional." [options]="carrierOptions()" [value]="carrierId()" (valueChange)="carrierId.set('' + $event)" />
          <app-quick-create compact entity="carrier" [iconOnly]="true" (created)="carrierId.set('' + $event.id)" />
        </div>
        @if (!editing()) {
          <app-input-field compact class="sm:col-span-2" label="Número de documento" [isRequired]="true" placeholder="DNI del conductor" inputMode="numeric" [maxLength]="20" [value]="numeroDocumento()" (valueChange)="numeroDocumento.set('' + $event)" />
        }
        <app-input-field compact label="Nombres" [isRequired]="true" [maxLength]="120" [value]="nombres()" (valueChange)="nombres.set('' + $event)" />
        <app-input-field compact label="Apellidos" [isRequired]="true" [maxLength]="120" [value]="apellidos()" (valueChange)="apellidos.set('' + $event)" />
        <app-input-field compact label="Licencia de conducir" [maxLength]="40" [value]="licencia()" (valueChange)="licencia.set('' + $event)" />
        <app-input-field compact label="Teléfono" inputMode="tel" [maxLength]="40" [value]="telefono()" (valueChange)="telefono.set('' + $event)" />
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
      title="Eliminar conductor"
      [message]="'¿Eliminar al conductor ' + (deleteTarget()?.nombres ?? '') + ' ' + (deleteTarget()?.apellidos ?? '') + '?'"
      confirmLabel="Eliminar"
      (cancelled)="deleteTarget.set(null)"
      (confirmed)="confirmDelete()"
    />
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
    queryFn: () => firstValueFrom(this.api.listShippingCarriers({ pageSize: 100 })),
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

  protected readonly deleteTarget = signal<ShippingDriverDto | null>(null);

  protected submit() {
    if (!this.editing() && !this.numeroDocumento().trim()) {
      this.notify.warning('Ingrese el número de documento del conductor.');
      return;
    }
    if (!this.nombres().trim() || !this.apellidos().trim()) {
      this.notify.warning('Ingrese nombres y apellidos del conductor.');
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
