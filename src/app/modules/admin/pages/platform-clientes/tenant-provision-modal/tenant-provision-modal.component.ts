import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../../shared/components/ui/modal/modal.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../../shared/components/form/input/input-field.component';
import { FormFieldComponent } from '../../../../../shared/components/form/form-field/form-field.component';
import { FormRowComponent } from '../../../../../shared/components/form/form-row/form-row.component';
import { FormStackComponent } from '../../../../../shared/components/form/form-stack/form-stack.component';
import { NotifyService } from '../../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { DirectoryApiService } from '../../../services/directory-api.service';
import type { TenantDetailDto } from '../../../models/directory.models';

@Component({
  selector: 'app-tenant-provision-modal',
  standalone: true,
  imports: [
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    FormFieldComponent,
    FormRowComponent,
    FormStackComponent,
  ],
  templateUrl: './tenant-provision-modal.component.html',
})
export class TenantProvisionModalComponent {
  readonly isOpen = input(false);
  readonly tenant = input<TenantDetailDto | null>(null);
  readonly closed = output<void>();

  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly establishmentNombre = signal('');
  protected readonly establishmentCodigo = signal('');
  protected readonly adminNombre = signal('');
  protected readonly adminEmail = signal('');
  protected readonly adminPassword = signal('');

  protected readonly tenantNombre = computed(() => this.tenant()?.nombre ?? '');

  protected readonly provisionMutation = injectMutation(() => ({
    mutationFn: (tenantId: string) =>
      firstValueFrom(
        this.api.provisionTenant(tenantId, {
          establishmentNombre: this.establishmentNombre().trim(),
          establishmentCodigo: this.establishmentCodigo().trim() || undefined,
          adminNombre: this.adminNombre().trim(),
          adminEmail: this.adminEmail().trim(),
          adminPassword: this.adminPassword(),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Cliente aprovisionado');
      void this.queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      this.onClose();
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo aprovisionar')),
  }));

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const row = this.tenant();
      if (!open || !row) {
        return;
      }
      untracked(() => {
        this.establishmentNombre.set(row.nombre);
        this.establishmentCodigo.set('0001');
        this.adminNombre.set(row.contactName ?? '');
        this.adminEmail.set(row.contactEmail ?? '');
        this.adminPassword.set('');
      });
    });
  }

  protected onClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  protected submit(): void {
    const row = this.tenant();
    if (!row) {
      return;
    }
    if (
      !this.establishmentNombre().trim() ||
      !this.adminNombre().trim() ||
      !this.adminEmail().trim() ||
      !this.adminPassword().trim()
    ) {
      this.notify.warning('Complete establecimiento, admin y contraseña');
      return;
    }
    this.provisionMutation.mutate(row.id);
  }

  protected submitLabel(): string {
    return this.provisionMutation.isPending() ? 'Aprovisionando…' : 'Aprovisionar';
  }

  private resetForm(): void {
    this.establishmentNombre.set('');
    this.establishmentCodigo.set('');
    this.adminNombre.set('');
    this.adminEmail.set('');
    this.adminPassword.set('');
  }
}
