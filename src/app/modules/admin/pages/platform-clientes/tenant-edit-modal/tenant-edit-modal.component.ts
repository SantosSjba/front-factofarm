import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../../shared/components/ui/modal/modal.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../../shared/components/form/input/input-field.component';
import { FormSelectComponent } from '../../../../../shared/components/form/form-select/form-select.component';
import { FormFieldComponent } from '../../../../../shared/components/form/form-field/form-field.component';
import { FormRowComponent } from '../../../../../shared/components/form/form-row/form-row.component';
import { FormStackComponent } from '../../../../../shared/components/form/form-stack/form-stack.component';
import { CheckboxComponent } from '../../../../../shared/components/form/input/checkbox.component';
import { PermissionMenuTreeComponent } from '../../../../../shared/components/ui/permission-menu-tree/permission-menu-tree.component';
import { HelpHintComponent } from '../../../../../shared/components/ui/help-hint/help-hint.component';
import { NotifyService } from '../../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { DirectoryApiService } from '../../../services/directory-api.service';
import type { PermissionMenuNodeDto, TenantDetailDto, TenantPlanDto } from '../../../models/directory.models';

const PLAN_OPTIONS = [
  { value: 'BOTICA', label: 'Botica' },
  { value: 'FARMACIA_PRO', label: 'Farmacia Pro' },
  { value: 'CADENA', label: 'Cadena' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

const PLATFORM_NAV = new Set([
  'nav.platform_dashboard',
  'nav.platform_clientes',
  'nav.platform_leads',
  'nav.platform_reclamaciones',
]);

@Component({
  selector: 'app-tenant-edit-modal',
  standalone: true,
  imports: [
    ModalComponent,
    ButtonComponent,
    InputFieldComponent,
    FormSelectComponent,
    FormFieldComponent,
    FormRowComponent,
    FormStackComponent,
    CheckboxComponent,
    PermissionMenuTreeComponent,
    HelpHintComponent,
  ],
  templateUrl: './tenant-edit-modal.component.html',
})
export class TenantEditModalComponent {
  readonly isOpen = input(false);
  readonly tenant = input<TenantDetailDto | null>(null);
  readonly closed = output<void>();

  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly planOptions = PLAN_OPTIONS;
  protected readonly menuTrees = signal<PermissionMenuNodeDto[]>([]);

  protected readonly nombre = signal('');
  protected readonly ruc = signal('');
  protected readonly plan = signal<TenantPlanDto>('BOTICA');
  protected readonly maxUsers = signal(3);
  protected readonly maxEstablishments = signal(1);
  protected readonly contactName = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactPhone = signal('');
  protected readonly notes = signal('');
  protected readonly applyPlanDefaults = signal(false);
  protected readonly selectedNavCodes = signal<Set<string>>(new Set());

  protected readonly tenantNombre = computed(() => this.tenant()?.nombre ?? '');
  protected readonly navCodesList = computed(() => [...this.selectedNavCodes()]);

  protected readonly tenantMenuTrees = computed(() =>
    this.menuTrees().filter((tree) => tree.code !== 'nav.platform'),
  );

  protected readonly updateMutation = injectMutation(() => ({
    mutationFn: (tenantId: string) =>
      firstValueFrom(
        this.api.updateTenant(tenantId, {
          nombre: this.nombre().trim(),
          ruc: this.ruc().trim() || undefined,
          plan: this.plan(),
          maxUsers: this.maxUsers(),
          maxEstablishments: this.maxEstablishments(),
          contactName: this.contactName().trim() || undefined,
          contactEmail: this.contactEmail().trim() || undefined,
          contactPhone: this.contactPhone().trim() || undefined,
          notes: this.notes().trim() || undefined,
          enabledModules: this.navCodesList(),
          applyPlanDefaults: this.applyPlanDefaults(),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Cliente actualizado');
      void this.queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      this.onClose();
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el cliente')),
  }));

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const row = this.tenant();
      if (!open || !row) {
        return;
      }
      untracked(() => {
        this.nombre.set(row.nombre);
        this.ruc.set(row.ruc ?? '');
        this.plan.set(row.plan);
        this.maxUsers.set(row.maxUsers);
        this.maxEstablishments.set(row.maxEstablishments);
        this.contactName.set(row.contactName ?? '');
        this.contactEmail.set(row.contactEmail ?? '');
        this.contactPhone.set(row.contactPhone ?? '');
        this.notes.set(row.notes ?? '');
        this.applyPlanDefaults.set(false);
        this.selectedNavCodes.set(new Set(row.enabledModules ?? []));
        this.loadMenuTrees();
      });
    });
  }

  protected onClose(): void {
    this.closed.emit();
  }

  protected onPlanChange(value: string): void {
    this.plan.set(value as TenantPlanDto);
    this.applyPlanDefaults.set(true);
  }

  protected toggleNavCode(code: string, checked: boolean): void {
    const next = new Set(this.selectedNavCodes());
    if (checked) {
      next.add(code);
    } else {
      next.delete(code);
    }
    this.selectedNavCodes.set(next);
    this.applyPlanDefaults.set(false);
  }

  protected onPermissionParent(tree: PermissionMenuNodeDto, checked: boolean): void {
    const childCodes = (tree.children ?? [])
      .map((c) => c.code)
      .filter((code) => !PLATFORM_NAV.has(code));
    const next = new Set(this.selectedNavCodes());
    if (checked) {
      childCodes.forEach((code) => next.add(code));
    } else {
      childCodes.forEach((code) => next.delete(code));
    }
    this.selectedNavCodes.set(next);
    this.applyPlanDefaults.set(false);
  }

  protected onPermissionChild(ev: { code: string; checked: boolean }): void {
    this.toggleNavCode(ev.code, ev.checked);
  }

  protected submit(): void {
    const row = this.tenant();
    if (!row || !this.nombre().trim()) {
      this.notify.warning('Indique el nombre del cliente');
      return;
    }
    if (this.selectedNavCodes().size === 0 && !this.applyPlanDefaults()) {
      this.notify.warning('Seleccione al menos un módulo habilitado');
      return;
    }
    this.updateMutation.mutate(row.id);
  }

  protected submitLabel(): string {
    return this.updateMutation.isPending() ? 'Guardando…' : 'Guardar cambios';
  }

  private loadMenuTrees(): void {
    if (this.menuTrees().length) {
      return;
    }
    this.api.getPermissionMenuTrees().subscribe({
      next: (trees) => this.menuTrees.set(trees ?? []),
      error: () => this.notify.error('No se pudo cargar el catálogo de módulos'),
    });
  }
}
