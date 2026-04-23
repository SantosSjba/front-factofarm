import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../../shared/components/ui/modal/modal.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { LabelComponent } from '../../../../../shared/components/form/label/label.component';
import { InputFieldComponent } from '../../../../../shared/components/form/input/input-field.component';
import { FormSelectComponent } from '../../../../../shared/components/form/form-select/form-select.component';
import { ModalTabHeaderComponent } from '../../../../../shared/components/ui/modal-tab-header/modal-tab-header.component';
import type { TabStripItem } from '../../../../../shared/components/ui/tab-strip/tab-strip.component';
import { PermissionMenuTreeComponent } from '../../../../../shared/components/ui/permission-menu-tree/permission-menu-tree.component';
import { ImageSquarePickerComponent } from '../../../../../shared/components/form/image-square-picker/image-square-picker.component';
import { DirectoryApiService } from '../../../services/directory-api.service';
import { FilesApiService } from '../../../../../core/services/files-api.service';
import { NotifyService } from '../../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { userQueryKeys } from '../../../../../core/query/user-query.keys';
import type {
  CreateUserProfileBody,
  CreateUserRequest,
  EstablishmentOptionDto,
  IdentityDocumentTypeDto,
  PermissionMenuNodeDto,
  UpdateUserRequest,
  UserListItemDto,
} from '../../../models/directory.models';

type TabId = 'datos' | 'permisos' | 'personales' | 'documentos';

const USUARIO_TABS: TabStripItem[] = [
  { id: 'datos', label: 'Datos de Usuario' },
  { id: 'permisos', label: 'Permisos' },
  { id: 'personales', label: 'Datos personales' },
  { id: 'documentos', label: 'Config. Documentos' },
];

const ROLE_OPTIONS = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'VENDEDOR', label: 'Vendedor' },
];

const TIPO_DOC_OPTIONS = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'CE' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'OTRO', label: 'Otro' },
];

function dateInputToIsoMidday(yyyyMmDd: string): string | undefined {
  const t = yyyyMmDd?.trim();
  if (!t) {
    return undefined;
  }
  return `${t}T12:00:00.000Z`;
}

function isoDateToInput(iso: string | null | undefined): string {
  const t = iso?.trim();
  if (!t) {
    return '';
  }
  return t.slice(0, 10);
}

function trimOrUndef(s: string): string | undefined {
  const x = s?.trim();
  return x ? x : undefined;
}

@Component({
  selector: 'app-usuario-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent,
    ButtonComponent,
    LabelComponent,
    InputFieldComponent,
    FormSelectComponent,
    ModalTabHeaderComponent,
    PermissionMenuTreeComponent,
    ImageSquarePickerComponent,
  ],
  templateUrl: './usuario-form-modal.component.html',
})
export class UsuarioFormModalComponent {
  readonly isOpen = input(false);
  readonly editingUser = input<UserListItemDto | null>(null);
  readonly closed = output<void>();

  private readonly api = inject(DirectoryApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly tabs = USUARIO_TABS;
  protected readonly isEditing = computed(() => this.editingUser() != null);
  protected readonly modalTitle = computed(() =>
    this.isEditing() ? 'Editar usuario' : 'Nuevo usuario',
  );

  protected readonly activeTab = signal<TabId>('datos');

  protected readonly establishments = signal<EstablishmentOptionDto[]>([]);
  protected readonly menuTree = signal<PermissionMenuNodeDto | null>(null);

  protected readonly selectedNavCodes = signal<Set<string>>(new Set());
  protected readonly navCodesList = computed(() => [...this.selectedNavCodes()]);

  protected readonly establecimientoOptions = computed(() =>
    this.establishments().map((e) => ({ value: e.id, label: e.nombre })),
  );

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly tipoDocOptions = TIPO_DOC_OPTIONS;

  protected readonly nombre = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly password2 = signal('');
  protected readonly establecimientoId = signal('');
  protected readonly role = signal<'ADMINISTRADOR' | 'VENDEDOR'>('VENDEDOR');

  protected readonly tipoDoc = signal('');
  protected readonly numeroDoc = signal('');
  protected readonly nombres = signal('');
  protected readonly apellidos = signal('');
  protected readonly fechaNac = signal('');
  protected readonly emailPersonal = signal('');
  protected readonly direccion = signal('');
  protected readonly celPersonal = signal('');
  protected readonly emailCorp = signal('');
  protected readonly celCorp = signal('');
  protected readonly fechaContratacion = signal('');
  protected readonly cargo = signal('');
  protected readonly fotoPreview = signal<string | null>(null);
  protected readonly fotoArchivoId = signal<string | null>(null);
  protected readonly fotoUploadError = signal<string | null>(null);

  protected readonly createUserMutation = injectMutation(() => ({
    mutationFn: (body: CreateUserRequest) => firstValueFrom(this.api.createUser(body)),
    onSuccess: () => {
      this.notify.success('Usuario creado correctamente');
      void this.queryClient.invalidateQueries({ queryKey: userQueryKeys.list() });
      this.onClose();
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear el usuario'));
    },
  }));

  protected readonly updateUserMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserRequest }) =>
      firstValueFrom(this.api.updateUser(id, body)),
    onSuccess: () => {
      this.notify.success('Usuario actualizado correctamente');
      void this.queryClient.invalidateQueries({ queryKey: userQueryKeys.list() });
      this.onClose();
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el usuario'));
    },
  }));

  protected readonly isSaving = computed(
    () => this.createUserMutation.isPending() || this.updateUserMutation.isPending(),
  );

  constructor() {
    effect(() => {
      const open = this.isOpen();
      if (!open) {
        return;
      }
      untracked(() => {
        this.applyUserToForm();
        this.loadRefs();
      });
    });
  }

  protected setTab(t: string) {
    this.activeTab.set(t as TabId);
  }

  private loadRefs() {
    this.api.listEstablishments().subscribe({
      next: (rows) => this.establishments.set(rows),
      error: () => {
        this.establishments.set([]);
        this.notify.error(
          'No se pudieron cargar los establecimientos.',
          'Compruebe la conexión o la API.',
        );
      },
    });
    this.api.getPermissionMenuTree().subscribe({
      next: (tree) => {
        this.menuTree.set(tree);
        const next = new Set<string>();
        const editing = this.editingUser();
        if (editing) {
          const allowedCodes = new Set(tree?.children?.map((c) => c.code) ?? []);
          for (const code of editing.permissionCodes ?? []) {
            if (allowedCodes.has(code)) {
              next.add(code);
            }
          }
        } else {
          tree?.children?.forEach((c) => next.add(c.code));
        }
        this.selectedNavCodes.set(next);
      },
      error: () => this.menuTree.set(null),
    });
  }

  private applyUserToForm() {
    const user = this.editingUser();
    if (!user) {
      this.resetCamposUsuario();
      return;
    }
    this.nombre.set(user.nombre ?? '');
    this.email.set(user.email ?? '');
    this.password.set('');
    this.password2.set('');
    this.establecimientoId.set(user.establecimientoId ?? '');
    this.role.set(user.role === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'VENDEDOR');

    const profile = user.profile;
    this.tipoDoc.set(profile?.tipoDocumento ?? '');
    this.numeroDoc.set(profile?.numeroDocumento ?? '');
    this.nombres.set(profile?.nombres ?? '');
    this.apellidos.set(profile?.apellidos ?? '');
    this.fechaNac.set(isoDateToInput(profile?.fechaNacimiento));
    this.emailPersonal.set(profile?.emailPersonal ?? '');
    this.direccion.set(profile?.direccion ?? '');
    this.celPersonal.set(profile?.celularPersonal ?? '');
    this.emailCorp.set(profile?.emailCorporativo ?? '');
    this.celCorp.set(profile?.celularCorporativo ?? '');
    this.fechaContratacion.set(isoDateToInput(profile?.fechaContratacion));
    this.cargo.set(profile?.cargo ?? '');
    this.fotoArchivoId.set(profile?.fotoArchivoId ?? null);
    this.fotoPreview.set(
      profile?.fotoUrl ? this.filesApi.absoluteFileUrl(profile.fotoUrl) : null,
    );
    this.fotoUploadError.set(null);
    this.selectedNavCodes.set(new Set(user.permissionCodes ?? []));
  }

  protected setRoleFromSelect(v: string) {
    if (v === 'ADMINISTRADOR' || v === 'VENDEDOR') {
      this.role.set(v);
    }
  }

  protected toggleNavCode(code: string, checked: boolean) {
    const s = new Set(this.selectedNavCodes());
    if (checked) {
      s.add(code);
    } else {
      s.delete(code);
    }
    this.selectedNavCodes.set(s);
  }

  protected onPermissionParent(checked: boolean) {
    const tree = this.menuTree();
    if (!tree?.children?.length) {
      return;
    }
    const next = new Set<string>();
    if (checked) {
      tree.children.forEach((c) => next.add(c.code));
    }
    this.selectedNavCodes.set(next);
  }

  protected onPermissionChild(ev: { code: string; checked: boolean }) {
    this.toggleNavCode(ev.code, ev.checked);
  }

  protected onFotoFile(file: File) {
    this.fotoUploadError.set(null);
    const prev = this.fotoPreview();
    if (prev?.startsWith('blob:')) {
      URL.revokeObjectURL(prev);
    }
    this.fotoPreview.set(null);
    this.fotoArchivoId.set(null);

    this.filesApi.upload(file).subscribe({
      next: (res) => {
        this.fotoArchivoId.set(res.id);
        this.fotoPreview.set(this.filesApi.absoluteFileUrl(res.url));
      },
      error: () => {
        this.fotoUploadError.set('No se pudo subir la imagen. ¿Tiene sesión iniciada?');
        this.fotoArchivoId.set(null);
        this.fotoPreview.set(null);
        this.notify.error('Error al subir la imagen');
      },
    });
  }

  protected onClose() {
    const p = this.fotoPreview();
    if (p?.startsWith('blob:')) {
      URL.revokeObjectURL(p);
    }
    this.fotoArchivoId.set(null);
    this.fotoUploadError.set(null);
    this.activeTab.set('datos');
    this.resetCamposUsuario();
    this.closed.emit();
  }

  private resetCamposUsuario() {
    this.nombre.set('');
    this.email.set('');
    this.password.set('');
    this.password2.set('');
    this.establecimientoId.set('');
    this.role.set('VENDEDOR');
    this.tipoDoc.set('');
    this.numeroDoc.set('');
    this.nombres.set('');
    this.apellidos.set('');
    this.fechaNac.set('');
    this.emailPersonal.set('');
    this.direccion.set('');
    this.celPersonal.set('');
    this.emailCorp.set('');
    this.celCorp.set('');
    this.fechaContratacion.set('');
    this.cargo.set('');
    this.fotoPreview.set(null);
    this.fotoArchivoId.set(null);
    this.fotoUploadError.set(null);
    this.selectedNavCodes.set(new Set<string>());
  }

  protected onSave() {
    const err = this.validate();
    if (err) {
      this.notify.warning(err);
      return;
    }
    if (this.isEditing()) {
      const current = this.editingUser();
      if (!current) {
        this.notify.error('No se pudo identificar el usuario a editar.');
        return;
      }
      const body = this.buildUpdateBody();
      this.updateUserMutation.mutate({ id: current.id, body });
      return;
    }
    const body = this.buildCreateBody();
    this.createUserMutation.mutate(body);
  }

  private validate(): string | null {
    if (!this.nombre().trim()) {
      return 'Indique el nombre del usuario.';
    }
    if (!this.email().trim()) {
      return 'Indique el correo electrónico.';
    }
    const pw = this.password();
    const pw2 = this.password2();
    if (!this.isEditing()) {
      if (!pw || pw.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres.';
      }
      if (pw !== pw2) {
        return 'Las contraseñas no coinciden.';
      }
    } else if (pw || pw2) {
      if (pw.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres.';
      }
      if (pw !== pw2) {
        return 'Las contraseñas no coinciden.';
      }
    }
    if (!this.establecimientoId().trim()) {
      return 'Seleccione un establecimiento.';
    }
    return null;
  }

  private buildProfileBody(): CreateUserProfileBody | undefined {
    const profile: CreateUserProfileBody = {};

    const td = this.tipoDoc().trim();
    if (td === 'DNI' || td === 'CE' || td === 'PASAPORTE' || td === 'OTRO') {
      profile.tipoDocumento = td as IdentityDocumentTypeDto;
    }

    const n = trimOrUndef(this.numeroDoc());
    if (n) profile.numeroDocumento = n;
    const nombres = trimOrUndef(this.nombres());
    if (nombres) profile.nombres = nombres;
    const apellidos = trimOrUndef(this.apellidos());
    if (apellidos) profile.apellidos = apellidos;

    const fn = dateInputToIsoMidday(this.fechaNac());
    if (fn) profile.fechaNacimiento = fn;

    const ep = trimOrUndef(this.emailPersonal());
    if (ep) profile.emailPersonal = ep;
    const dir = trimOrUndef(this.direccion());
    if (dir) profile.direccion = dir;
    const celP = trimOrUndef(this.celPersonal());
    if (celP) profile.celularPersonal = celP;
    const ec = trimOrUndef(this.emailCorp());
    if (ec) profile.emailCorporativo = ec;
    const celC = trimOrUndef(this.celCorp());
    if (celC) profile.celularCorporativo = celC;

    const fc = dateInputToIsoMidday(this.fechaContratacion());
    if (fc) profile.fechaContratacion = fc;

    const cg = trimOrUndef(this.cargo());
    if (cg) profile.cargo = cg;

    const fid = this.fotoArchivoId();
    if (fid) {
      profile.fotoArchivoId = fid;
    }

    return Object.keys(profile).length > 0 ? profile : undefined;
  }

  private buildCreateBody(): CreateUserRequest {
    const profile = this.buildProfileBody();

    return {
      nombre: this.nombre().trim(),
      email: this.email().trim().toLowerCase(),
      password: this.password(),
      role: this.role(),
      establecimientoId: this.establecimientoId().trim(),
      ...(profile ? { profile } : {}),
    };
  }

  private buildUpdateBody(): UpdateUserRequest {
    const body: UpdateUserRequest = {
      nombre: this.nombre().trim(),
      email: this.email().trim().toLowerCase(),
      role: this.role(),
      establecimientoId: this.establecimientoId().trim(),
    };

    const password = this.password().trim();
    if (password) {
      body.password = password;
    }

    const profile = this.buildProfileBody();
    if (profile) {
      body.profile = profile;
    }

    return body;
  }

  protected passwordLabel(): string {
    return this.isEditing() ? 'Contraseña (opcional)' : 'Contraseña';
  }

  protected passwordPlaceholder(): string {
    return this.isEditing() ? 'Dejar en blanco para mantener' : '••••••••';
  }

  protected submitLabel(): string {
    if (this.isSaving()) {
      return 'Guardando…';
    }
    return this.isEditing() ? 'Actualizar' : 'Guardar';
  }
}
