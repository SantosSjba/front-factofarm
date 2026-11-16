import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { NotifyService } from '../../../../core/services/notify.service';
import { isOptionalEmail } from '../../../../core/utils/form-validators';
import { isValidRuc } from '../../../../core/utils/peru-documents';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ConfirmDialogComponent } from '../../../../shared/components/common/confirm-dialog/confirm-dialog.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { ShippingCarrierDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';

@Component({
  selector: 'app-transportistas',
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
    <app-breadcrumb-inline [segments]="[{ label: 'Guías de remisión' }, { label: 'Transportistas' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Transportistas</h1>
      <div data-toolbar-actions class="flex flex-wrap items-center gap-2">
        <ng-container *appHasPermission="'shipping.write'">
          <app-button size="sm" startIconName="mdi:plus" (btnClick)="openCreate()">Nuevo transportista</app-button>
        </ng-container>
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="transportistas">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Son las empresas de transporte que llevan tu mercadería cuando emites una guía de remisión.</li>
        <li>Regístralas con su RUC para elegirlas al emitir la guía.</li>
      </ol>
    </app-help-panel>

    <app-list-filters
      compact
      [showSelect]="false"
      [searchValue]="search()"
      searchPlaceholder="Buscar por RUC o razón social"
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
      [emptyTitle]="search().trim() ? 'Sin resultados para esa búsqueda' : 'Aún no hay transportistas'"
      [emptyHint]="search().trim() ? 'Prueba con otro texto.' : 'Usa «Nuevo transportista» para registrar el primero.'"
      skeleton="table"
      (retry)="listQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Transportistas</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th data-card-role="title" class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Empresa</th>
            <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Teléfono</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of rows(); track row.id) {
                <tr>
                  <td class="px-5 py-3 text-theme-sm">
                    <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.razonSocial }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">RUC {{ row.ruc }}</span>
                  </td>
              <td class="px-5 py-3 text-theme-sm">{{ row.telefono || '—' }}</td>
                  <td class="px-5 py-3 text-end">
                    <div class="inline-flex items-center gap-1.5">
                      <app-button size="sm" variant="outline" [iconOnly]="true" startIconName="mdi:pencil-outline" [tooltip]="'Editar ' + row.razonSocial" (btnClick)="openEdit(row)" />
                      <app-button size="sm" variant="outline" [iconOnly]="true" startIconName="mdi:trash-can-outline" [tooltip]="'Eliminar ' + row.razonSocial" (btnClick)="deleteTarget.set(row)" />
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
        <h3 class="pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">{{ editing() ? 'Editar transportista' : 'Nuevo transportista' }}</h3>
      </div>
      <div data-modal-body class="min-h-0 px-4 py-4 sm:px-6">
        <app-form-section compact title="Datos" [cols]="2">
        @if (!editing()) {
          <app-input-field compact class="sm:col-span-2" label="RUC" [isRequired]="true" placeholder="20XXXXXXXXX" inputMode="numeric" [maxLength]="11" [value]="ruc()" (valueChange)="ruc.set('' + $event)" />
        }
        <app-input-field compact class="sm:col-span-2" label="Razón social" [isRequired]="true" [maxLength]="200" [value]="razonSocial()" (valueChange)="razonSocial.set('' + $event)" />
        <app-input-field compact class="sm:col-span-2" label="Nombre comercial" [maxLength]="200" [value]="nombreComercial()" (valueChange)="nombreComercial.set('' + $event)" />
        <app-input-field compact label="Teléfono" inputMode="tel" [maxLength]="40" [value]="telefono()" (valueChange)="telefono.set('' + $event)" />
        <app-input-field compact label="Correo" type="email" [maxLength]="120" [value]="correo()" (valueChange)="correo.set('' + $event)" />
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
      title="Eliminar transportista"
      [message]="'¿Eliminar al transportista ' + (deleteTarget()?.razonSocial ?? '') + '?'"
      confirmLabel="Eliminar"
      (cancelled)="deleteTarget.set(null)"
      (confirmed)="confirmDelete()"
    />
  `,
})
export class TransportistasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<ShippingCarrierDto | null>(null);
  protected readonly ruc = signal('');
  protected readonly razonSocial = signal('');
  protected readonly nombreComercial = signal('');
  protected readonly telefono = signal('');
  protected readonly correo = signal('');

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['shipping', 'carriers', this.search(), this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listShippingCarriers({ search: this.search(), page: this.page(), pageSize: 15 })),
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
    this.ruc.set('');
    this.razonSocial.set('');
    this.nombreComercial.set('');
    this.telefono.set('');
    this.correo.set('');
    this.modalOpen.set(true);
  }

  protected openEdit(row: ShippingCarrierDto) {
    this.editing.set(row);
    this.ruc.set(row.ruc);
    this.razonSocial.set(row.razonSocial);
    this.nombreComercial.set(row.nombreComercial ?? '');
    this.telefono.set(row.telefono ?? '');
    this.correo.set(row.correo ?? '');
    this.modalOpen.set(true);
  }

  protected readonly deleteTarget = signal<ShippingCarrierDto | null>(null);

  protected submit() {
    const ruc = this.ruc().trim();
    if (!this.editing() && (!/^\d{11}$/.test(ruc) || !isValidRuc(ruc))) {
      this.notify.warning('Ingrese un RUC válido de 11 dígitos.');
      return;
    }
    if (!this.razonSocial().trim()) {
      this.notify.warning('Ingrese la razón social.');
      return;
    }
    if (!isOptionalEmail(this.correo())) {
      this.notify.warning('El correo no es válido.');
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
      const body = {
        razonSocial: this.razonSocial().trim(),
        nombreComercial: this.nombreComercial().trim() || undefined,
        telefono: this.telefono().trim() || undefined,
        correo: this.correo().trim() || undefined,
      };
      const edit = this.editing();
      // El RUC no se puede cambiar: UpdateShippingCarrierDto lo rechaza.
      return edit
        ? firstValueFrom(this.api.updateShippingCarrier(edit.id, body))
        : firstValueFrom(this.api.createShippingCarrier({ ...body, ruc: this.ruc().trim() }));
    },
    onSuccess: () => {
      this.notify.success('Transportista guardado');
      this.modalOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['shipping', 'carriers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar')),
  }));

  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteShippingCarrier(id)),
    onSuccess: () => {
      this.notify.success('Transportista eliminado');
      void this.queryClient.invalidateQueries({ queryKey: ['shipping', 'carriers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar')),
  }));
}
