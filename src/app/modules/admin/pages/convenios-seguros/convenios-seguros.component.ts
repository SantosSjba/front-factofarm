import { CommonModule } from '@angular/common';
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
import type { AgreementType } from '../../models/directory.models';

@Component({
  selector: 'app-convenios-seguros',
  standalone: true,
  imports: [
    CommonModule,
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
      <h1 data-toolbar-title class="text-title-sm font-semibold">Convenios y seguros</h1>
      <app-button variant="primary" (btnClick)="createOpen.set(true)">Nuevo convenio</app-button>
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
                <th class="py-2">Cobertura</th>
                <th class="py-2">Crédito</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of list.items; track row.id) {
                <tr class="border-b border-gray-100 dark:border-gray-800">
                  <td class="py-2 font-mono">{{ row.codigo }}</td>
                  <td class="py-2">{{ row.nombre }}</td>
                  <td class="py-2">{{ row.tipo }}</td>
                  <td class="py-2">{{ row.coberturaPorcentaje }}%</td>
                  <td class="py-2">{{ row.diasCredito }} días</td>
                  <td class="py-2 space-x-2">
                    <app-button variant="outline" (btnClick)="billing(row.id)">Liquidar mes</app-button>
                    <app-button variant="outline" (btnClick)="remove(row.id)">Eliminar</app-button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination class="mt-4" [totalItems]="list.total" [currentPage]="page()" [pageSize]="20" (currentPageChange)="page.set($event)" />
        }
      </app-component-card>
    </app-page-state>

    <app-modal [isOpen]="createOpen()" (close)="createOpen.set(false)" className="w-full max-w-lg">
      <div class="space-y-4 p-6">
        <h3 class="text-lg font-semibold">Nuevo convenio</h3>
        <div>
          <app-label>Código</app-label>
          <app-input-field [value]="formCodigo()" (valueChange)="formCodigo.set('' + $event)" />
        </div>
        <div>
          <app-label>Nombre</app-label>
          <app-input-field [value]="formNombre()" (valueChange)="formNombre.set('' + $event)" />
        </div>
        <div>
          <app-label>Tipo</app-label>
          <app-form-select [value]="formTipo()" (valueChange)="onTipoChange($event)" [options]="tipoOptions" />
        </div>
        <div>
          <app-label>Cobertura %</app-label>
          <app-input-field type="number" [value]="formCobertura()" (valueChange)="formCobertura.set(parseNum($event))" />
        </div>
        <app-button variant="primary" [disabled]="createMutation.isPending()" (btnClick)="createMutation.mutate()">Guardar</app-button>
      </div>
    </app-modal>
  `,
})
export class ConveniosSegurosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Convenios' }];
  protected readonly page = signal(1);
  protected readonly createOpen = signal(false);
  protected readonly formCodigo = signal('');
  protected readonly formNombre = signal('');
  protected readonly formTipo = signal<AgreementType>('EPS');
  protected readonly formCobertura = signal(80);

  protected readonly tipoOptions = [
    { value: 'EPS', label: 'EPS' },
    { value: 'CLINICA', label: 'Clínica' },
    { value: 'HOSPITAL', label: 'Hospital' },
    { value: 'SEGURO', label: 'Seguro' },
    { value: 'EMPRESA', label: 'Empresa' },
  ];

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['agreements', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listAgreements({ page: this.page(), pageSize: 20 })),
  }));

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

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createAgreement({
          codigo: this.formCodigo().trim(),
          nombre: this.formNombre().trim(),
          tipo: this.formTipo(),
          coberturaPorcentaje: this.formCobertura(),
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
    firstValueFrom(this.api.deleteAgreement(id))
      .then(() => {
        this.notify.success('Convenio eliminado');
        void this.queryClient.invalidateQueries({ queryKey: ['agreements'] });
      })
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar')));
  }

  protected billing(id: string) {
    const periodo = new Date().toISOString().slice(0, 7);
    firstValueFrom(this.api.generateAgreementMonthlyBilling(id, periodo))
      .then((r) => this.notify.success(`Liquidación ${r.periodo}: S/ ${r.totalCobertura}`))
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo liquidar')));
  }
}
