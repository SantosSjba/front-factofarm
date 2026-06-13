import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../../shared/components/ui/modal/modal.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../../shared/components/form/input/input-field.component';
import { FormFieldComponent } from '../../../../../shared/components/form/form-field/form-field.component';
import { FormStackComponent } from '../../../../../shared/components/form/form-stack/form-stack.component';
import { NotifyService } from '../../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { DirectoryApiService } from '../../../services/directory-api.service';
import type { TenantLeadDto } from '../../../models/directory.models';

@Component({
  selector: 'app-tenant-lead-convert-modal',
  standalone: true,
  imports: [
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    FormFieldComponent,
    FormStackComponent,
  ],
  templateUrl: './tenant-lead-convert-modal.component.html',
})
export class TenantLeadConvertModalComponent {
  readonly isOpen = input(false);
  readonly lead = input<TenantLeadDto | null>(null);
  readonly closed = output<void>();

  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly establishmentNombre = signal('');

  protected readonly leadContact = computed(() => {
    const row = this.lead();
    if (!row) {
      return '';
    }
    return `${row.nombre} · ${row.email}`;
  });

  protected readonly convertMutation = injectMutation(() => ({
    mutationFn: (leadId: string) =>
      firstValueFrom(
        this.api.convertTenantLead(leadId, {
          establishmentNombre: this.establishmentNombre().trim(),
        }),
      ),
    onSuccess: (res) => {
      const temp = res.temporaryPassword ? ` Contraseña temporal: ${res.temporaryPassword}` : '';
      this.notify.success(`Lead convertido.${temp}`);
      void this.queryClient.invalidateQueries({ queryKey: ['platform'] });
      this.onClose();
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo convertir el lead')),
  }));

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const row = this.lead();
      if (!open || !row) {
        return;
      }
      untracked(() => this.establishmentNombre.set(row.farmacia));
    });
  }

  protected onClose(): void {
    this.establishmentNombre.set('');
    this.closed.emit();
  }

  protected submit(): void {
    const row = this.lead();
    if (!row || !this.establishmentNombre().trim()) {
      this.notify.warning('Indique el nombre del establecimiento');
      return;
    }
    this.convertMutation.mutate(row.id);
  }

  protected submitLabel(): string {
    return this.convertMutation.isPending() ? 'Convirtiendo…' : 'Convertir';
  }
}
