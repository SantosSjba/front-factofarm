import { CommonModule } from '@angular/common';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { UserListItemDto, UserRoleDto } from '../../models/directory.models';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { AvatarTextComponent } from '../../../../shared/components/ui/avatar/avatar-text.component';
import { UsuarioFormModalComponent } from './usuario-form-modal/usuario-form-modal.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { NotifyService } from '../../../../core/services/notify.service';
import { userQueryKeys } from '../../../../core/query/user-query.keys';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { userRoleLabel } from '../../../../core/utils/user-role-label.util';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { AuthService } from '../../../../core/services/auth.service';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { canChangeAccess, canDeleteUser, canManageUser, roleTone } from '../../utils/user-policy';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    PageStateComponent,
    BreadcrumbInlineComponent,
    ListFiltersComponent,
    PaginationComponent,
    PageToolbarComponent,
    ModalComponent,
    ButtonComponent,
    UsuarioFormModalComponent,
    AvatarTextComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    MenuItemComponent,
    StatusBadgeComponent,
    TableDropdownComponent,
  ],
  templateUrl: './usuarios.component.html',
})
export class UsuariosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly queryClient = injectQueryClient();

  /** Mismas reglas que la API: así no se muestran acciones que serán rechazadas. */
  private readonly me = computed(() => {
    const u = this.auth.user();
    return u ? { id: u.id, role: u.role } : null;
  });
  protected readonly canWrite = this.auth.hasPermission('users.write');
  protected readonly myId = computed(() => this.me()?.id ?? '');
  protected canEdit(u: UserListItemDto) {
    return this.canWrite && canManageUser(this.me(), u);
  }
  protected canPermissions(u: UserListItemDto) {
    return this.canWrite && canChangeAccess(this.me(), u);
  }
  protected canDelete(u: UserListItemDto) {
    return this.canWrite && canDeleteUser(this.me(), u);
  }
  protected readonly roleTone = roleTone;

  protected readonly usersQuery = injectQuery(() => ({
    queryKey: userQueryKeys.list({
      search: this.searchTerm().trim(),
      role: this.roleFilter(),
      establishmentId: this.establishmentFilter(),
      page: this.currentPage(),
    }),
    queryFn: () =>
      firstValueFrom(
        this.api.listUsers({
          search: this.searchTerm(),
          role: this.roleFilter() as UserRoleDto | 'all',
          establishmentId: this.establishmentFilter() || undefined,
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: userQueryKeys.summary(),
    queryFn: () => firstValueFrom(this.api.usersSummary()),
  }));

  /** Chips de resumen: total, por rol, por local (si hay más de uno) y con caja abierta. */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const s = this.summaryQuery.data();
    if (!s) return [];
    const role = this.roleFilter();
    const est = this.establishmentFilter();
    const chips: SummaryChip[] = [
      {
        id: 'all',
        label: 'Total',
        count: s.total,
        icon: 'lucide:users',
        group: 'General',
        active: role === 'all' && !est,
        tooltip: 'Todas las cuentas de la empresa. Clic para quitar los filtros de rol y local.',
      },
      ...s.byRole.map((r) => ({
        id: 'role:' + r.role,
        label: userRoleLabel(r.role),
        count: r.count,
        tone: roleTone(r.role),
        group: 'Rol',
        active: role === r.role,
        tooltip: `Ver solo ${userRoleLabel(r.role).toLowerCase()} (clic de nuevo para quitar).`,
      })),
    ];
    if (s.byEstablishment.length > 1) {
      chips.push(
        ...s.byEstablishment.map((e) => ({
          id: 'est:' + e.id,
          label: e.nombre,
          count: e.count,
          icon: 'lucide:store',
          group: 'Local',
          active: est === e.id,
          tooltip: `Ver solo usuarios de ${e.nombre} (clic de nuevo para quitar).`,
        })),
      );
    }
    chips.push({
      id: 'cash',
      label: 'Con caja abierta',
      count: s.withOpenCash,
      icon: 'lucide:banknote',
      group: 'General',
      clickable: false,
      tooltip: 'Usuarios que tienen una caja abierta ahora. No se pueden eliminar hasta cerrarla.',
    });
    return chips;
  });

  protected onSummaryChip(chip: SummaryChip) {
    if (chip.id === 'all') {
      this.roleFilter.set('all');
      this.establishmentFilter.set('');
    } else if (chip.id.startsWith('role:')) {
      const role = chip.id.slice(5);
      this.roleFilter.set(this.roleFilter() === role ? 'all' : role);
    } else if (chip.id.startsWith('est:')) {
      const id = chip.id.slice(4);
      this.establishmentFilter.set(this.establishmentFilter() === id ? '' : id);
    }
    this.currentPage.set(1);
  }

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Usuarios y establecimientos' },
    { label: 'Usuarios' },
  ];

  protected readonly modalOpen = signal(false);
  protected readonly editingUser = signal<UserListItemDto | null>(null);
  protected readonly modalInitialTab = signal<'datos' | 'permisos'>('datos');
  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deletingUser = signal<UserListItemDto | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly roleFilter = signal('all');
  /** Se elige desde los chips de local. */
  protected readonly establishmentFilter = signal('');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly roleFilterOptions = [
    { value: 'all', label: 'Todos los roles' },
    { value: 'ADMIN_CADENA', label: 'Admin cadena' },
    { value: 'GERENTE_SUCURSAL', label: 'Gerente de sucursal' },
    { value: 'FARMACEUTICO_TITULAR', label: 'Farmacéutico titular' },
    { value: 'FARMACEUTICO', label: 'Farmacéutico' },
    { value: 'TECNICO_FARMACEUTICO', label: 'Técnico farmacéutico' },
    { value: 'CAJERO', label: 'Cajero' },
    { value: 'ALMACENERO', label: 'Almacenero' },
    { value: 'CONTADOR', label: 'Contador' },
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'VENDEDOR', label: 'Vendedor' },
  ];
  protected readonly users = computed(() => this.usersQuery.data()?.items ?? []);
  protected readonly totalUsers = computed(() => this.usersQuery.data()?.total ?? 0);
  protected readonly totalPages = computed(() => this.usersQuery.data()?.totalPages ?? 1);
  protected readonly pageStart = computed(() =>
    this.totalUsers() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage,
  );
  protected readonly paginatedUsers = computed(() => this.users());
  protected readonly deleteUserMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteUser(id)),
    onSuccess: () => {
      this.notify.success('Usuario eliminado correctamente');
      this.closeDeleteConfirm();
      void this.queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el usuario'));
    },
  }));

  constructor() {
    effect(() => {
      const totalPages = this.totalPages();
      const page = this.currentPage();
      if (page > totalPages) {
        this.currentPage.set(totalPages);
      }
      if (page < 1) {
        this.currentPage.set(1);
      }
    });
  }

  protected userPhoto(u: UserListItemDto): string | null {
    return u.profile?.fotoUrl ?? (u.profile?.fotoArchivoId ? `/api/v1/files/${u.profile.fotoArchivoId}` : null);
  }

  protected roleLabel(role: string): string {
    return userRoleLabel(role);
  }

  protected openModal() {
    this.modalInitialTab.set('datos');
    this.editingUser.set(null);
    this.modalOpen.set(true);
  }

  protected closeModal() {
    this.modalOpen.set(false);
    this.editingUser.set(null);
    this.modalInitialTab.set('datos');
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onRoleFilterChange(value: string) {
    this.roleFilter.set(value);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.roleFilter.set('all');
    this.establishmentFilter.set('');
    this.currentPage.set(1);
  }

  protected rowAction(user: UserListItemDto, action: string) {
    if (action === 'editar') {
      this.modalInitialTab.set('datos');
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
      this.modalInitialTab.set('permisos');
      this.editingUser.set(user);
      this.modalOpen.set(true);
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
