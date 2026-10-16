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
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { ConfirmDialogComponent } from '../../../../shared/components/common/confirm-dialog/confirm-dialog.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { ShippingCarrierDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-transportistas',
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
    FormFieldComponent,
    ConfirmDialogComponent,
    HasPermissionDirective,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Guías' }, { label: 'Transportistas' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Transportistas</h1>
      <app-button startIconName="mdi:plus" *appHasPermission="'shipping.write'" size="sm" (btnClick)="openCreate()">Nuevo transportista</app-button>
    </app-page-toolbar>
    <app-component-card title="Filtros" className="mt-4">
      <app-list-filters [searchValue]="search()" searchPlaceholder="Buscar por RUC o razón social" [showSelect]="false" (searchValueChange)="search.set($event); page.set(1)" />
    </app-component-card>
    @let listState = listQuery | queryPageState: total();
    <app-component-card title="Empresas de transporte" className="mt-4" [loading]="listState.loading" [error]="listState.error" [empty]="listState.empty" emptyTitle="Sin transportistas" (retry)="listQuery.refetch()">
      <table class="w-full text-left text-sm">
        <thead class="border-b text-xs uppercase text-gray-500"><tr><th class="px-3 py-2">RUC</th><th class="px-3 py-2">Razón social</th><th class="px-3 py-2">Teléfono</th><th class="px-3 py-2"></th></tr></thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="px-3 py-2 font-medium">{{ row.ruc }}</td>
              <td class="px-3 py-2">{{ row.razonSocial }}</td>
              <td class="px-3 py-2">{{ row.telefono ?? '—' }}</td>
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
                    (btnClick)="deleteTarget.set(row)"
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
    <app-modal [isOpen]="modalOpen()" (closed)="modalOpen.set(false)" className="w-full max-w-lg">
      <div class="space-y-3 p-6">
        <h3 class="text-lg font-semibold">{{ editing() ? 'Editar transportista' : 'Nuevo transportista' }}</h3>
        @if (!editing()) {
          <app-form-field label="RUC" required>
            <app-input-field [value]="ruc()" (valueChange)="ruc.set('' + $event)" placeholder="20XXXXXXXXX" [maxLength]="11" inputMode="numeric" />
          </app-form-field>
        }
        <app-form-field label="Razón social" required>
          <app-input-field [value]="razonSocial()" (valueChange)="razonSocial.set('' + $event)" [maxLength]="200" />
        </app-form-field>
        <app-form-field label="Nombre comercial">
          <app-input-field [value]="nombreComercial()" (valueChange)="nombreComercial.set('' + $event)" [maxLength]="200" />
        </app-form-field>
        <app-form-field label="Teléfono">
          <app-input-field [value]="telefono()" (valueChange)="telefono.set('' + $event)" [maxLength]="40" inputMode="tel" />
        </app-form-field>
        <app-form-field label="Correo">
          <app-input-field type="email" [value]="correo()" (valueChange)="correo.set('' + $event)" [maxLength]="120" />
        </app-form-field>
        <app-button startIconName="mdi:content-save-outline" variant="primary" (btnClick)="submit()" [disabled]="saveMutation.isPending()" [loading]="saveMutation.isPending()">Guardar</app-button>
      </div>
    </app-modal>
    <app-confirm-dialog
      [open]="!!deleteTarget()"
      title="Eliminar transportista"
      [message]="'¿Desea eliminar al transportista ' + (deleteTarget()?.razonSocial ?? '') + '?'"
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
