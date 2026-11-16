import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { AgreementListItemDto, AgreementType } from '../../models/directory.models';
import { LocaleService } from '../../../../core/services/locale.service';

@Component({
  selector: 'app-convenios-seguros',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ListFiltersComponent,
    TableDropdownComponent,
    FormSectionComponent,
    TextAreaComponent,
    HelpPanelComponent,
    MenuItemComponent,
    StatusBadgeComponent,
    PaginationComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    ModalComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Convenios y seguros</h1>
      <div data-toolbar-actions class="flex flex-wrap items-center gap-2">
        <app-button size="sm" startIconName="mdi:handshake-outline" (btnClick)="openCreate()">Nuevo convenio</app-button>
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="convenios-seguros">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Registra las EPS, seguros, clínicas o empresas que pagan una parte de la compra de sus afiliados.</li>
        <li>La <strong>cobertura</strong> es el porcentaje que paga el convenio; el resto lo paga el cliente. Los <strong>días de crédito</strong> son el plazo para cobrarle al convenio.</li>
        <li>Con «Liquidar mes» se genera el cobro del mes actual al convenio.</li>
      </ol>
    </app-help-panel>

    <!-- Resumen (todas las páginas). -->
    <app-list-filters
      compact
      [showSearch]="false"
      [showSelect]="false"
      [showClear]="false"
      [summaryChips]="summaryChips()"
      summaryLabel="Resumen de convenios"
      summaryStorageKey="convenios-seguros"
    />

    <!-- Tabla directa (sin tarjeta): el título ya está en la barra de la página. -->
    <app-page-state
      [loading]="listQuery.isPending()"
      [error]="listError()"
      [empty]="listQuery.isSuccess() && !listQuery.data().items.length"
      emptyTitle="Aún no hay convenios"
      emptyHint="Usa «Nuevo convenio» para registrar el primero."
      skeleton="table"
      (retry)="listQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Convenios y seguros</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th data-card-role="title" class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Convenio</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Código</th>
                <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Cobertura</th>
                <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Crédito</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of listQuery.data()?.items ?? []; track row.id) {
                <tr [attr.data-row-tone]="row.activo ? null : 'muted'">
                  <td class="px-5 py-3 text-theme-sm">
                    <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.nombre }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ tipoLabel(row.tipo) }}</span>
                  </td>
                  <td class="px-5 py-3 font-mono text-theme-sm">{{ row.codigo }}</td>
                  <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ +row.coberturaPorcentaje }} %</td>
                  <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ row.diasCredito ? row.diasCredito + ' días' : 'Contado' }}</td>
                  <td class="px-5 py-3 text-theme-sm"><app-status-badge [status]="row.activo ? 'ACTIVO' : 'INACTIVO'" [tone]="row.activo ? 'success' : 'neutral'" [label]="row.activo ? 'Activo' : 'Inactivo'" /></td>
                  <td class="px-5 py-3 text-end">
                    <div class="inline-flex justify-end">
                      <app-table-dropdown>
                        <div dropdown-button>
                          <app-button size="sm" variant="outline" [iconOnly]="true" startIconName="mdi:dots-vertical" [tooltip]="'Acciones de ' + row.nombre"></app-button>
                        </div>
                        <div dropdown-content>
                          <app-menu-item icon="mdi:calendar-check" tooltip="Genera el cobro del mes actual a este convenio. Te pedirá confirmación." (itemClick)="billingTarget.set(row)">Liquidar mes</app-menu-item>
                          <app-menu-item variant="danger" icon="mdi:trash-can-outline" tooltip="Te pedirá confirmación." (itemClick)="deleteTarget.set(row)">Eliminar</app-menu-item>
                        </div>
                      </app-table-dropdown>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-page-state>

    @if (listQuery.data(); as list) {
      <app-pagination [totalItems]="list.total" [currentPage]="page()" [pageSize]="pageSize" (currentPageChange)="page.set($event)" />
    }

    <!-- ========== NUEVO CONVENIO ========== -->
    <app-modal compact [isOpen]="createOpen()" (closed)="closeCreate()" className="w-full max-w-2xl shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-xl font-semibold text-gray-800 dark:text-white/90">Nuevo convenio</h3>
        <p class="mt-1 pe-12 text-sm text-gray-500 dark:text-gray-400">EPS, seguro, clínica o empresa que cubre parte de la compra.</p>
      </div>
      <div data-modal-body class="min-h-0 space-y-5 px-4 py-4 sm:px-6">
        <app-form-section compact icon="mdi:handshake-outline" title="Convenio" [cols]="2">
          <app-input-field compact icon="mdi:barcode" label="Código" [isRequired]="true" helpText="Código interno para reconocerlo." placeholder="Ej.: EPS-PACIFICO" [maxLength]="40" [value]="formCodigo()" [error]="!!errors().codigo" [hint]="errors().codigo || ''" (valueChange)="formCodigo.set('' + $event); clearError('codigo')" />
          <app-form-select compact label="Tipo" [required]="true" helpText="Qué clase de institución es." [showPlaceholder]="false" [value]="formTipo()" [options]="tipoOptions" (valueChange)="onTipoChange($event)" />
          <app-input-field class="md:col-span-2" compact icon="mdi:domain" label="Nombre" [isRequired]="true" helpText="Nombre de la institución." placeholder="Ej.: Pacífico EPS" [maxLength]="200" [value]="formNombre()" [error]="!!errors().nombre" [hint]="errors().nombre || ''" (valueChange)="formNombre.set('' + $event); clearError('nombre')" />
        </app-form-section>
        <app-form-section compact icon="mdi:percent-outline" title="Condiciones" [cols]="2">
          <app-input-field compact icon="mdi:percent-outline" label="Cobertura (%)" helpText="Parte de la compra que paga el convenio, de 0 a 100." type="number" min="0" max="100" [value]="formCobertura()" [error]="!!errors().cobertura" [hint]="errors().cobertura || ''" (valueChange)="formCobertura.set(parseNum($event)); clearError('cobertura')" />
          <app-input-field compact icon="mdi:calendar-clock" label="Días de crédito" helpText="Plazo para cobrarle al convenio. 0 = contado." type="number" min="0" step="1" [value]="formDiasCredito()" (valueChange)="formDiasCredito.set(parseNum($event))" />
        </app-form-section>
        <app-form-section compact icon="mdi:account-outline" title="Contacto" description="Opcional." [cols]="2">
          <app-input-field compact icon="mdi:account-outline" label="Nombre del contacto" [maxLength]="200" [value]="formContacto()" (valueChange)="formContacto.set('' + $event)" />
          <app-input-field compact icon="mdi:phone-outline" label="Teléfono" [maxLength]="40" [value]="formTelefono()" (valueChange)="formTelefono.set('' + $event)" />
          <app-input-field class="md:col-span-2" compact icon="mdi:email-outline" label="Correo electrónico" type="email" [maxLength]="200" [value]="formEmail()" (valueChange)="formEmail.set('' + $event)" />
          <app-text-area class="md:col-span-2" compact label="Notas" [maxLength]="500" [rows]="2" placeholder="Opcional" [value]="formNotas()" (valueChange)="formNotas.set($event)" />
        </app-form-section>
      </div>
      <div data-modal-footer class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <p class="text-xs text-gray-500 dark:text-gray-400"><span class="text-error-500">*</span> Campos obligatorios</p>
        <div class="flex items-center gap-2">
          <app-button size="sm" startIconName="mdi:close" variant="outline" [disabled]="createMutation.isPending()" (btnClick)="closeCreate()">Cancelar</app-button>
          <app-button size="sm" startIconName="mdi:content-save-outline" [disabled]="createMutation.isPending()" [loading]="createMutation.isPending()" (btnClick)="submitCreate()">Guardar</app-button>
        </div>
      </div>
    </app-modal>

    <!-- ========== LIQUIDAR MES ========== -->
    <app-modal compact [isOpen]="!!billingTarget()" (closed)="!busy() && billingTarget.set(null)" className="w-full max-w-lg shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-xl font-semibold text-gray-800 dark:text-white/90">Liquidar mes</h3>
      </div>
      <div data-modal-body class="min-h-0 px-4 py-4 text-theme-sm text-gray-600 dark:text-gray-400 sm:px-6">
        ¿Generar el cobro de <span class="font-semibold text-gray-800 dark:text-white/90">{{ currentPeriod }}</span> a {{ billingTarget()?.nombre }}?
        <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">Suma la cobertura de las ventas del mes hechas con este convenio.</p>
      </div>
      <div data-modal-footer class="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <app-button size="sm" startIconName="mdi:close" variant="outline" [disabled]="busy()" (btnClick)="billingTarget.set(null)">Cancelar</app-button>
        <app-button size="sm" startIconName="mdi:calendar-check" [loading]="busy()" [disabled]="busy()" (btnClick)="confirmBilling()">Liquidar</app-button>
      </div>
    </app-modal>

    <!-- ========== ELIMINAR ========== -->
    <app-modal compact [isOpen]="!!deleteTarget()" (closed)="!busy() && deleteTarget.set(null)" className="w-full max-w-lg shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-xl font-semibold text-gray-800 dark:text-white/90">Eliminar convenio</h3>
      </div>
      <div data-modal-body class="min-h-0 px-4 py-4 text-theme-sm text-gray-600 dark:text-gray-400 sm:px-6">
        ¿Eliminar <span class="font-semibold text-gray-800 dark:text-white/90">{{ deleteTarget()?.nombre }}</span>?
        <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">Ya no se podrá elegir al cobrar.</p>
      </div>
      <div data-modal-footer class="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <app-button size="sm" startIconName="mdi:close" variant="outline" [disabled]="busy()" (btnClick)="deleteTarget.set(null)">Cancelar</app-button>
        <app-button size="sm" variant="danger" startIconName="mdi:trash-can-outline" [loading]="busy()" [disabled]="busy()" (btnClick)="confirmDelete()">Eliminar</app-button>
      </div>
    </app-modal>
  `,
})
export class ConveniosSegurosComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Convenios y seguros' }];
  protected readonly pageSize = 20;
  protected readonly page = signal(1);
  protected readonly createOpen = signal(false);
  protected readonly formCodigo = signal('');
  protected readonly formNombre = signal('');
  protected readonly formTipo = signal<AgreementType>('EPS');
  protected readonly formCobertura = signal(80);
  protected readonly formDiasCredito = signal(30);
  protected readonly formContacto = signal('');
  protected readonly formTelefono = signal('');
  protected readonly formEmail = signal('');
  protected readonly formNotas = signal('');
  protected readonly errors = signal<Partial<Record<'codigo' | 'nombre' | 'cobertura', string>>>({});
  protected readonly billingTarget = signal<AgreementListItemDto | null>(null);
  protected readonly deleteTarget = signal<AgreementListItemDto | null>(null);
  protected readonly busy = signal(false);
  protected readonly currentPeriod = this.locale.currentYearMonth();

  protected readonly tipoOptions = [
    { value: 'EPS', label: 'EPS' },
    { value: 'CLINICA', label: 'Clínica' },
    { value: 'HOSPITAL', label: 'Hospital' },
    { value: 'SEGURO', label: 'Seguro' },
    { value: 'EMPRESA', label: 'Empresa' },
  ];

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['agreements', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listAgreements({ page: this.page(), pageSize: this.pageSize })),
  }));

  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const data = this.listQuery.data();
    if (!data) return [];
    return [{ id: 'total', label: 'Registrados', count: data.total, icon: 'mdi:handshake-outline', tone: 'neutral' }];
  });

  protected tipoLabel(tipo: AgreementType): string {
    return this.tipoOptions.find((o) => o.value === tipo)?.label ?? tipo;
  }

  protected clearError(key: 'codigo' | 'nombre' | 'cobertura') {
    if (this.errors()[key]) this.errors.update((e) => ({ ...e, [key]: undefined }));
  }

  protected openCreate() {
    this.formCodigo.set('');
    this.formNombre.set('');
    this.formTipo.set('EPS');
    this.formCobertura.set(80);
    this.formDiasCredito.set(30);
    this.formContacto.set('');
    this.formTelefono.set('');
    this.formEmail.set('');
    this.formNotas.set('');
    this.errors.set({});
    this.createOpen.set(true);
  }

  protected closeCreate() {
    if (this.createMutation.isPending()) return;
    this.createOpen.set(false);
  }

  protected async confirmBilling() {
    const row = this.billingTarget();
    if (!row) return;
    this.busy.set(true);
    try {
      await this.billing(row.id);
    } finally {
      this.busy.set(false);
      this.billingTarget.set(null);
    }
  }

  protected async confirmDelete() {
    const row = this.deleteTarget();
    if (!row) return;
    this.busy.set(true);
    try {
      await this.remove(row.id);
    } finally {
      this.busy.set(false);
      this.deleteTarget.set(null);
    }
  }

  protected listError() {
    const err = this.listQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar convenios') : null;
  }

  protected parseNum(value: unknown): number {
    return Number(value) || 0;
  }

  protected onTipoChange(value: string) {
    this.formTipo.set(value as AgreementType);
  }

  protected submitCreate() {
    const errors: Partial<Record<'codigo' | 'nombre' | 'cobertura', string>> = {};
    if (!this.formCodigo().trim()) errors.codigo = 'Escribe el código del convenio.';
    if (!this.formNombre().trim()) errors.nombre = 'Escribe el nombre de la institución.';
    const cobertura = this.formCobertura();
    if (!Number.isFinite(cobertura) || cobertura < 0 || cobertura > 100) errors.cobertura = 'Debe estar entre 0 y 100 %.';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    this.createMutation.mutate();
  }

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createAgreement({
          codigo: this.formCodigo().trim(),
          nombre: this.formNombre().trim(),
          tipo: this.formTipo(),
          coberturaPorcentaje: this.formCobertura(),
          diasCredito: this.formDiasCredito(),
          ...(this.formContacto().trim() ? { contactoNombre: this.formContacto().trim() } : {}),
          ...(this.formTelefono().trim() ? { contactoTelefono: this.formTelefono().trim() } : {}),
          ...(this.formEmail().trim() ? { contactoEmail: this.formEmail().trim() } : {}),
          ...(this.formNotas().trim() ? { notas: this.formNotas().trim() } : {}),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Convenio creado');
      this.createOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['agreements'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear el convenio')),
  }));

  protected remove(id: string) {
    return firstValueFrom(this.api.deleteAgreement(id))
      .then(() => {
        this.notify.success('Convenio eliminado');
        void this.queryClient.invalidateQueries({ queryKey: ['agreements'] });
      })
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el convenio')));
  }

  protected billing(id: string) {
    const periodo = this.locale.currentYearMonth();
    return firstValueFrom(this.api.generateAgreementMonthlyBilling(id, periodo))
      .then((r) => this.notify.success(`Liquidación ${r.periodo}: S/ ${r.totalCobertura}`))
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo liquidar el mes')));
  }
}
