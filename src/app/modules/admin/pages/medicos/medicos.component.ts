import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { CreateMedicoRequest, MedicoItemDto } from '../../models/directory.models';

@Component({
  selector: 'app-medicos',
  standalone: true,
  imports: [
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
  templateUrl: './medicos.component.html',
})
export class MedicosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Fármacos' }, { label: 'Médicos' }];
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<MedicoItemDto | null>(null);
  protected readonly cmp = signal('');
  protected readonly nombres = signal('');
  protected readonly apellidos = signal('');
  protected readonly especialidad = signal('');

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['medicos', this.search(), this.page()] as const,
    queryFn: () =>
      firstValueFrom(this.api.listMedicos({ search: this.search(), page: this.page(), pageSize: 15 })),
  }));

  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly total = computed(() => this.listQuery.data()?.total ?? 0);

  protected openCreate() {
    this.editing.set(null);
    this.cmp.set('');
    this.nombres.set('');
    this.apellidos.set('');
    this.especialidad.set('');
    this.modalOpen.set(true);
  }

  protected openEdit(row: MedicoItemDto) {
    this.editing.set(row);
    this.cmp.set(row.cmp);
    this.nombres.set(row.nombres);
    this.apellidos.set(row.apellidos);
    this.especialidad.set(row.especialidad ?? '');
    this.modalOpen.set(true);
  }

  protected saveMutation = injectMutation(() => ({
    mutationFn: () => {
      const body: CreateMedicoRequest = {
        cmp: this.cmp().trim(),
        nombres: this.nombres().trim(),
        apellidos: this.apellidos().trim(),
        especialidad: this.especialidad().trim() || undefined,
      };
      const edit = this.editing();
      return edit
        ? firstValueFrom(this.api.updateMedico(edit.id, body))
        : firstValueFrom(this.api.createMedico(body));
    },
    onSuccess: () => {
      this.notify.success('Médico guardado');
      this.modalOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['medicos'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar')),
  }));

  protected deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteMedico(id)),
    onSuccess: () => {
      this.notify.success('Médico eliminado');
      void this.queryClient.invalidateQueries({ queryKey: ['medicos'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar')),
  }));
}
