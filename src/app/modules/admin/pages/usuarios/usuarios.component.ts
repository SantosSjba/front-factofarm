import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { UserListItemDto } from '../../models/directory.models';
import { UsuarioFormModalComponent } from './usuario-form-modal/usuario-form-modal.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { NotifyService } from '../../../../core/services/notify.service';
import { userQueryKeys } from '../../../../core/query/user-query.keys';
import { httpErrorMessage } from '../../../../core/http/http-error-message';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ComponentCardComponent,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ModalComponent,
    ButtonComponent,
    UsuarioFormModalComponent,
  ],
  templateUrl: './usuarios.component.html',
})
export class UsuariosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly usersQuery = injectQuery(() => ({
    queryKey: userQueryKeys.list(),
    queryFn: () => firstValueFrom(this.api.listUsers()),
  }));

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Usuarios & Establecimientos' },
    { label: 'Usuarios' },
  ];

  protected readonly modalOpen = signal(false);
  protected readonly editingUser = signal<UserListItemDto | null>(null);
  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deletingUser = signal<UserListItemDto | null>(null);
  protected readonly deleteUserMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteUser(id)),
    onSuccess: () => {
      this.notify.success('Usuario eliminado correctamente');
      this.closeDeleteConfirm();
      void this.queryClient.invalidateQueries({ queryKey: userQueryKeys.list() });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el usuario'));
    },
  }));

  protected roleLabel(role: string): string {
    const m: Record<string, string> = {
      ADMINISTRADOR: 'Administrador',
      VENDEDOR: 'Vendedor',
    };
    return m[role] ?? role;
  }

  protected openModal() {
    this.editingUser.set(null);
    this.modalOpen.set(true);
  }

  protected closeModal() {
    this.modalOpen.set(false);
    this.editingUser.set(null);
  }

  protected apiTokenCell(): string {
    return '—';
  }

  protected rowAction(user: UserListItemDto, action: string) {
    if (action === 'editar') {
      this.editingUser.set(user);
      this.modalOpen.set(true);
      return;
    }
    if (action === 'eliminar') {
      if (this.deleteUserMutation.isPending()) {
        return;
      }
      this.openDeleteConfirm(user);
      return;
    }
    if (action === 'permisos') {
      this.notify.warning('Edición de permisos pendiente de implementación.');
    }
  }

  protected openDeleteConfirm(user: UserListItemDto) {
    this.deletingUser.set(user);
    this.deleteConfirmOpen.set(true);
  }

  protected closeDeleteConfirm() {
    if (this.deleteUserMutation.isPending()) {
      return;
    }
    this.deleteConfirmOpen.set(false);
    this.deletingUser.set(null);
  }

  protected confirmDelete() {
    const user = this.deletingUser();
    if (!user || this.deleteUserMutation.isPending()) {
      return;
    }
    this.deleteUserMutation.mutate(user.id);
  }

  protected async refetchUsers() {
    const r = await this.usersQuery.refetch();
    if (r.isError) {
      this.notify.error(
        httpErrorMessage(r.error, 'No se pudo actualizar el listado.'),
      );
    }
  }
}
