import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
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
    ButtonComponent,
    UsuarioFormModalComponent,
  ],
  templateUrl: './usuarios.component.html',
})
export class UsuariosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly usersQuery = injectQuery(() => ({
    queryKey: userQueryKeys.list(),
    queryFn: () => firstValueFrom(this.api.listUsers()),
  }));

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Usuarios & Establecimientos' },
    { label: 'Usuarios' },
  ];

  protected readonly modalOpen = signal(false);

  protected roleLabel(role: string): string {
    const m: Record<string, string> = {
      ADMINISTRADOR: 'Administrador',
      VENDEDOR: 'Vendedor',
    };
    return m[role] ?? role;
  }

  protected openModal() {
    this.modalOpen.set(true);
  }

  protected closeModal() {
    this.modalOpen.set(false);
  }

  protected apiTokenCell(): string {
    return '—';
  }

  protected rowAction(_user: UserListItemDto, _action: string) {
    /* reservado */
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
