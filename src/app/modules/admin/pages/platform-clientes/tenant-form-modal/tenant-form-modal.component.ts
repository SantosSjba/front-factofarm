import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../../shared/components/ui/modal/modal.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../../shared/components/form/input/input-field.component';
import { FormSelectComponent } from '../../../../../shared/components/form/form-select/form-select.component';
import { FormFieldComponent } from '../../../../../shared/components/form/form-field/form-field.component';
import { FormRowComponent } from '../../../../../shared/components/form/form-row/form-row.component';
import { FormStackComponent } from '../../../../../shared/components/form/form-stack/form-stack.component';
import { HelpHintComponent } from '../../../../../shared/components/ui/help-hint/help-hint.component';
import { NotifyService } from '../../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { DirectoryApiService } from '../../../services/directory-api.service';
import type { TenantPlanDto } from '../../../models/directory.models';

const PLAN_OPTIONS = [
  { value: 'BOTICA', label: 'Botica' },
  { value: 'FARMACIA_PRO', label: 'Farmacia Pro' },
  { value: 'CADENA', label: 'Cadena' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

@Component({
  selector: 'app-tenant-form-modal',
  standalone: true,
  imports: [
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    FormSelectComponent,
    FormFieldComponent,
    FormRowComponent,
    FormStackComponent,
    HelpHintComponent,
  ],
  templateUrl: './tenant-form-modal.component.html',
})
export class TenantFormModalComponent {
  readonly isOpen = input(false);
  readonly closed = output<void>();

  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly planOptions = PLAN_OPTIONS;

  protected readonly nombre = signal('');
  protected readonly ruc = signal('');
  protected readonly plan = signal<TenantPlanDto>('BOTICA');
  protected readonly contactName = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactPhone = signal('');
  protected readonly notes = signal('');

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createTenant({
          nombre: this.nombre().trim(),
          ruc: this.ruc().trim() || undefined,
          plan: this.plan(),
          contactName: this.contactName().trim() || undefined,
          contactEmail: this.contactEmail().trim() || undefined,
          contactPhone: this.contactPhone().trim() || undefined,
          notes: this.notes().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Cliente creado');
      void this.queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      this.onClose();
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear el cliente')),
  }));

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        return;
      }
      untracked(() => this.resetForm());
    });
  }

  protected onClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  protected submit(): void {
    if (!this.nombre().trim()) {
      this.notify.warning('Indique el nombre del cliente');
      return;
    }
    this.createMutation.mutate();
  }

  protected submitLabel(): string {
    return this.createMutation.isPending() ? 'Creando…' : 'Crear';
  }

  private resetForm(): void {
    this.nombre.set('');
    this.ruc.set('');
    this.plan.set('BOTICA');
    this.contactName.set('');
    this.contactEmail.set('');
    this.contactPhone.set('');
    this.notes.set('');
  }
}
