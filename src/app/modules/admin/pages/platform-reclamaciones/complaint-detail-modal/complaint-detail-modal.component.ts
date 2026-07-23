import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../../shared/components/ui/modal/modal.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form/form-field/form-field.component';
import { FormSelectComponent } from '../../../../../shared/components/form/form-select/form-select.component';
import { FormStackComponent } from '../../../../../shared/components/form/form-stack/form-stack.component';
import { TextAreaComponent } from '../../../../../shared/components/form/input/text-area.component';
import { HelpHintComponent } from '../../../../../shared/components/ui/help-hint/help-hint.component';
import { NotifyService } from '../../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { DirectoryApiService } from '../../../services/directory-api.service';
import type { ComplaintDto, ComplaintStatusDto } from '../../../models/directory.models';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'RESOLVED', label: 'Resuelto' },
  { value: 'CLOSED', label: 'Cerrado' },
];

@Component({
  selector: 'app-complaint-detail-modal',
  standalone: true,
  imports: [
    ModalComponent,
    ButtonComponent,
    FormFieldComponent,
    FormSelectComponent,
    FormStackComponent,
    TextAreaComponent,
    HelpHintComponent,
  ],
  templateUrl: './complaint-detail-modal.component.html',
})
export class ComplaintDetailModalComponent {
  readonly isOpen = input(false);
  readonly complaint = input<ComplaintDto | null>(null);
  readonly closed = output<void>();

  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly status = signal<ComplaintStatusDto>('PENDING');
  protected readonly internalNotes = signal('');
  protected readonly responseNotes = signal('');

  protected readonly title = computed(() => this.complaint()?.numeroRegistro ?? '');

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: (id: string) =>
      firstValueFrom(
        this.api.updateComplaint(id, {
          status: this.status(),
          internalNotes: this.internalNotes().trim() || undefined,
          responseNotes: this.responseNotes().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Reclamo actualizado');
      void this.queryClient.invalidateQueries({ queryKey: ['platform', 'complaints'] });
      this.onClose();
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el reclamo')),
  }));

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const row = this.complaint();
      if (!open || !row) {
        return;
      }
      untracked(() => {
        this.status.set(row.status);
        this.internalNotes.set(row.internalNotes ?? '');
        this.responseNotes.set(row.responseNotes ?? '');
      });
    });
  }

  protected onClose(): void {
    this.closed.emit();
  }

  protected submit(): void {
    const row = this.complaint();
    if (!row) {
      return;
    }
    this.updateMutation.mutate(row.id);
  }

  protected submitLabel(): string {
    return this.updateMutation.isPending() ? 'Guardando…' : 'Guardar';
  }
}
