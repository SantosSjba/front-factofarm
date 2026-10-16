import { passwordPolicyError } from '../../../../../core/utils/password-policy';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import * as yup from 'yup';
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
  EstablishmentSeriesItemDto,
  IdentityDocumentTypeDto,
  PermissionMenuNodeDto,
  UpdateUserRequest,
  UserListItemDto,
  UserRoleDto,
} from '../../../models/directory.models';

type TabId = 'datos' | 'permisos' | 'personales' | 'documentos';

const USUARIO_TABS: TabStripItem[] = [
  { id: 'datos', label: 'Datos de Usuario' },
  { id: 'permisos', label: 'Permisos' },
  { id: 'personales', label: 'Datos personales' },
  { id: 'documentos', label: 'Config. Documentos' },
];

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super administrador' },
  { value: 'ADMIN_CADENA', label: 'Admin cadena' },
  { value: 'GERENTE_SUCURSAL', label: 'Gerente de sucursal' },
  { value: 'FARMACEUTICO_TITULAR', label: 'Farmacéutico titular' },
  { value: 'FARMACEUTICO', label: 'Farmacéutico' },
  { value: 'TECNICO_FARMACEUTICO', label: 'Técnico farmacéutico' },
  { value: 'CAJERO', label: 'Cajero' },
  { value: 'ALMACENERO', label: 'Almacenero' },
  { value: 'CONTADOR', label: 'Contador' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'VENDEDOR', label: 'Vendedor (cajero)' },
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

const USER_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CELULAR_REGEX = /^\+?\d{7,15}$/;

function isValidDni(dni: string): boolean {
  return /^\d{8}$/.test(dni.replace(/\D/g, ''));
}

function isValidCe(ce: string): boolean {
  return /^[A-Za-z0-9]{9,12}$/.test(ce.trim());
}

function isValidPasaporte(value: string): boolean {
  return /^[A-Za-z0-9]{6,12}$/.test(value.trim());
}

function isValidOtroDocumento(value: string): boolean {
  return /^[A-Za-z0-9-]{1,20}$/.test(value.trim());
}

function identityDocumentNumberMessage(tipo: string): string {
  if (tipo === 'DNI') return 'DNI debe tener 8 dígitos.';
  if (tipo === 'CE') return 'CE debe tener 9 a 12 caracteres alfanuméricos.';
  if (tipo === 'PASAPORTE') return 'Pasaporte debe tener 6 a 12 caracteres alfanuméricos.';
  if (tipo === 'OTRO') return 'Número de documento no válido (alfanumérico / guiones, máx. 20).';
  return 'Número de documento no válido para el tipo seleccionado.';
}

function isValidIdentityDocumentNumber(tipo: string, numero: string): boolean {
  const value = numero.trim();
  if (!value) return true;
  if (tipo === 'DNI') return isValidDni(value);
  if (tipo === 'CE') return isValidCe(value);
  if (tipo === 'PASAPORTE') return isValidPasaporte(value);
  if (tipo === 'OTRO') return isValidOtroDocumento(value);
  return true;
}

const usuarioDatosSchema = yup.object({
  nombre: yup
    .string()
    .trim()
    .required('Indique el nombre del usuario.')
    .max(150, 'Nombre no debe exceder 150 caracteres'),
  email: yup
    .string()
    .trim()
    .required('Indique el correo electrónico.')
    .email('El correo electrónico no es válido.')
    .max(150, 'Correo electrónico no debe exceder 150 caracteres'),
  establecimientoId: yup
    .string()
    .trim()
    .required('Seleccione un establecimiento.'),
  role: yup
    .mixed<UserRoleDto>()
    .oneOf(ROLE_OPTIONS.map((o) => o.value) as UserRoleDto[])
    .required('Seleccione un rol.'),
  password: yup.string().max(100, 'Contraseña no debe exceder 100 caracteres').optional(),
  password2: yup.string().max(100, 'Confirmación no debe exceder 100 caracteres').optional(),
});

const usuarioPersonalesSchema = yup.object({
  tipoDoc: yup.string().oneOf(['', 'DNI', 'CE', 'PASAPORTE', 'OTRO']).optional(),
  numeroDoc: yup
    .string()
    .max(20, 'Número de documento no debe exceder 20 caracteres')
    .test('doc-format', function (value) {
      const tipo = String(this.parent?.tipoDoc ?? '').trim();
      const numero = String(value ?? '').trim();
      if (!numero) return true;
      if (!tipo) return true; // pairing se valida aparte
      if (isValidIdentityDocumentNumber(tipo, numero)) return true;
      return this.createError({ message: identityDocumentNumberMessage(tipo) });
    }),
  nombres: yup.string().max(120, 'Nombres no debe exceder 120 caracteres').optional(),
  apellidos: yup.string().max(120, 'Apellidos no debe exceder 120 caracteres').optional(),
  fechaNac: yup.string().test(
    'fechaNac-format',
    'Fecha de nacimiento inválida.',
    (v) => !v || USER_DATE_REGEX.test(v),
  ),
  emailPersonal: yup
    .string()
    .transform((v) => (typeof v === 'string' && !v.trim() ? undefined : v))
    .email('Correo personal no válido.')
    .max(150, 'Correo personal no debe exceder 150 caracteres')
    .optional(),
  direccion: yup.string().max(250, 'Dirección no debe exceder 250 caracteres').optional(),
  celPersonal: yup
    .string()
    .max(30, 'Celular personal no debe exceder 30 caracteres')
    .test(
      'cel-personal-format',
      'Celular personal no válido (use dígitos, 7 a 15).',
      (v) => !v?.trim() || CELULAR_REGEX.test(v.trim()),
    ),
  emailCorp: yup
    .string()
    .transform((v) => (typeof v === 'string' && !v.trim() ? undefined : v))
    .email('Correo corporativo no válido.')
    .max(150, 'Correo corporativo no debe exceder 150 caracteres')
    .optional(),
  celCorp: yup
    .string()
    .max(30, 'Celular corporativo no debe exceder 30 caracteres')
    .test(
      'cel-corp-format',
      'Celular corporativo no válido (use dígitos, 7 a 15).',
      (v) => !v?.trim() || CELULAR_REGEX.test(v.trim()),
    ),
  fechaContratacion: yup.string().test(
    'fechaContratacion-format',
    'Fecha de contratación inválida.',
    (v) => !v || USER_DATE_REGEX.test(v),
  ),
  cargo: yup.string().max(120, 'Cargo no debe exceder 120 caracteres').optional(),
});

@Component({
  selector: 'app-usuario-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
  readonly initialTab = input<TabId>('datos');
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
  /** Árboles `nav.*` alineados al menú lateral completo (14 secciones). */
  protected readonly menuTrees = signal<PermissionMenuNodeDto[]>([]);
  protected readonly roleTemplates = signal<Array<{ role: UserRoleDto; label: string; navPermissionCodes: string[] }>>([]);

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

  protected readonly documentSeriesQuery = injectQuery(() => ({
    queryKey: ['establishment-series', 'usuario-modal', this.establecimientoId()] as const,
    queryFn: () => firstValueFrom(this.api.listEstablishmentSeries(this.establecimientoId())),
    enabled: this.activeTab() === 'documentos' && !!this.establecimientoId(),
  }));

  protected readonly documentSeries = computed(
    () => this.documentSeriesQuery.data() ?? ([] as EstablishmentSeriesItemDto[]),
  );

  protected documentTypeLabel(type: string): string {
    return this.documentTypeLabels[type] ?? type;
  }

  protected readonly documentTypeLabels: Record<string, string> = {
    BOLETA_VENTA_ELECTRONICA: 'Boleta electrónica',
    FACTURA_ELECTRONICA: 'Factura electrónica',
    NOTA_CREDITO: 'Nota de crédito',
    NOTA_DEBITO: 'Nota de débito',
    GUIA_REMISION_REMITENTE: 'Guía remisión remitente',
    NOTA_VENTA: 'Nota de venta',
  };
  protected readonly role = signal<UserRoleDto>('CAJERO');

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

  /** Errores inline por campo (validación live). */
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly touched = signal<Record<string, boolean>>({});
  protected readonly submitAttempted = signal(false);

  protected readonly createUserMutation = injectMutation(() => ({
    mutationFn: (body: CreateUserRequest) => firstValueFrom(this.api.createUser(body)),
    onSuccess: () => {
      this.notify.success('Usuario creado correctamente');
      void this.queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      this.onClose(true);
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
      void this.queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      this.onClose(true);
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
        this.activeTab.set(this.initialTab());
        this.applyUserToForm();
        this.loadRefs();
      });
    });
  }

  protected setTab(t: string) {
    this.activeTab.set(t as TabId);
  }

  private loadRefs() {
    this.api.listEstablishmentsAll().subscribe({
      next: (rows) => this.establishments.set(rows),
      error: (err: unknown) => {
        this.establishments.set([]);
        this.notify.error(
          'No se pudieron cargar los establecimientos.',
          httpErrorMessage(err, 'Compruebe la conexión e intente nuevamente.'),
        );
      },
    });
    this.api.getPermissionMenuTrees().subscribe({
      next: (trees) => {
        this.menuTrees.set(trees ?? []);
        const allNavCodes = new Set(
          (trees ?? []).flatMap((t) => (t.children ?? []).map((c) => c.code)),
        );
        const editing = this.editingUser();
        if (editing) {
          const next = new Set<string>();
          for (const code of editing.permissionCodes ?? []) {
            if (allNavCodes.has(code)) {
              next.add(code);
            }
          }
          this.selectedNavCodes.set(next);
        }
        // Nuevo usuario: no marcar todo el árbol; plantilla de rol se aplica al cargar templates.
      },
      error: (err: unknown) => {
        this.menuTrees.set([]);
        this.notify.error(
          'No se pudo cargar el catálogo de permisos.',
          httpErrorMessage(err, 'Intente nuevamente.'),
        );
      },
    });
    this.api.getRoleTemplates().subscribe({
      next: (templates) => {
        this.roleTemplates.set(templates ?? []);
        if (!this.editingUser() && this.selectedNavCodes().size === 0) {
          const template = (templates ?? []).find((t) => t.role === this.role());
          if (template) {
            this.selectedNavCodes.set(new Set(template.navPermissionCodes));
          }
        }
      },
      error: () => this.roleTemplates.set([]),
    });
  }

  private applyUserToForm() {
    this.fieldErrors.set({});
    this.touched.set({});
    this.submitAttempted.set(false);
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
    this.role.set(user.role);

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
    this.fotoUploadError.set(null);
    this.loadFotoPreview(profile?.fotoArchivoId ?? profile?.fotoUrl ?? null);
    this.selectedNavCodes.set(
      new Set((user.permissionCodes ?? []).filter((code) => code.startsWith('nav.'))),
    );
  }

  private revokeFotoPreview() {
    const prev = this.fotoPreview();
    if (prev?.startsWith('blob:')) {
      URL.revokeObjectURL(prev);
    }
    this.fotoPreview.set(null);
  }

  /** Carga preview con Bearer vía blob (GET /files/:id no sirve en `<img>` sin Authorization). */
  private loadFotoPreview(fileIdOrPath: string | null | undefined) {
    this.revokeFotoPreview();
    const ref = fileIdOrPath?.trim();
    if (!ref) {
      return;
    }
    this.filesApi.fetchObjectUrl(ref).subscribe({
      next: (url) => this.fotoPreview.set(url),
      error: () => {
        this.fotoPreview.set(null);
        this.fotoUploadError.set('No se pudo cargar la foto del usuario.');
      },
    });
  }

  protected setRoleFromSelect(v: string) {
    const match = ROLE_OPTIONS.find((o) => o.value === v);
    if (!match) return;
    this.role.set(match.value as UserRoleDto);
    const template = this.roleTemplates().find((t) => t.role === match.value);
    if (template) {
      this.selectedNavCodes.set(new Set(template.navPermissionCodes));
    }
    this.onFieldChange('role', match.value);
  }

  protected showFieldError(key: string): boolean {
    return !!(this.touched()[key] || this.submitAttempted()) && !!this.fieldErrors()[key];
  }

  protected fieldHint(key: string): string {
    return this.showFieldError(key) ? this.fieldErrors()[key] ?? '' : '';
  }

  protected onFieldBlur(key: string) {
    this.touched.update((t) => ({ ...t, [key]: true }));
    void this.revalidateField(key);
  }

  protected onFieldChange(key: string, value: string) {
    this.setFieldValue(key, value);
    if (this.touched()[key] || this.submitAttempted()) {
      void this.revalidateField(key);
      if (key === 'password' || key === 'password2') {
        void this.revalidateField(key === 'password' ? 'password2' : 'password');
      }
      if (key === 'tipoDoc' || key === 'numeroDoc') {
        void this.revalidateField(key === 'tipoDoc' ? 'numeroDoc' : 'tipoDoc');
      }
    }
  }

  private setFieldValue(key: string, value: string) {
    switch (key) {
      case 'nombre':
        this.nombre.set(value);
        break;
      case 'email':
        this.email.set(value);
        break;
      case 'establecimientoId':
        this.establecimientoId.set(value);
        break;
      case 'role':
        this.role.set(value as UserRoleDto);
        break;
      case 'password':
        this.password.set(value);
        break;
      case 'password2':
        this.password2.set(value);
        break;
      case 'tipoDoc':
        this.tipoDoc.set(value);
        break;
      case 'numeroDoc':
        this.numeroDoc.set(value);
        break;
      case 'nombres':
        this.nombres.set(value);
        break;
      case 'apellidos':
        this.apellidos.set(value);
        break;
      case 'fechaNac':
        this.fechaNac.set(value);
        break;
      case 'emailPersonal':
        this.emailPersonal.set(value);
        break;
      case 'direccion':
        this.direccion.set(value);
        break;
      case 'celPersonal':
        this.celPersonal.set(value);
        break;
      case 'emailCorp':
        this.emailCorp.set(value);
        break;
      case 'celCorp':
        this.celCorp.set(value);
        break;
      case 'fechaContratacion':
        this.fechaContratacion.set(value);
        break;
      case 'cargo':
        this.cargo.set(value);
        break;
      default:
        break;
    }
  }

  private datosSnapshot() {
    return {
      nombre: this.nombre(),
      email: this.email(),
      establecimientoId: this.establecimientoId(),
      role: this.role(),
      password: this.password(),
      password2: this.password2(),
    };
  }

  private personalesSnapshot() {
    return {
      tipoDoc: this.tipoDoc(),
      numeroDoc: this.numeroDoc(),
      nombres: this.nombres(),
      apellidos: this.apellidos(),
      fechaNac: this.fechaNac(),
      emailPersonal: this.emailPersonal(),
      direccion: this.direccion(),
      celPersonal: this.celPersonal(),
      emailCorp: this.emailCorp(),
      celCorp: this.celCorp(),
      fechaContratacion: this.fechaContratacion(),
      cargo: this.cargo(),
    };
  }

  private async revalidateField(key: string) {
    const next = { ...this.fieldErrors() };
    delete next[key];

    const datosKeys = new Set([
      'nombre',
      'email',
      'establecimientoId',
      'role',
      'password',
      'password2',
    ]);
    const personalesKeys = new Set([
      'tipoDoc',
      'numeroDoc',
      'nombres',
      'apellidos',
      'fechaNac',
      'emailPersonal',
      'direccion',
      'celPersonal',
      'emailCorp',
      'celCorp',
      'fechaContratacion',
      'cargo',
    ]);

    try {
      if (datosKeys.has(key) && key !== 'password' && key !== 'password2') {
        await usuarioDatosSchema.validateAt(key, this.datosSnapshot());
      } else if (personalesKeys.has(key)) {
        await usuarioPersonalesSchema.validateAt(key, this.personalesSnapshot());
      }
    } catch (err) {
      if (err instanceof yup.ValidationError && err.message) {
        next[key] = err.message;
      }
    }

    const pw = this.password();
    const pw2 = this.password2();
    if (key === 'password' || key === 'password2') {
      delete next['password'];
      delete next['password2'];
      if (!this.isEditing()) {
        if (passwordPolicyError(pw)) {
          next['password'] = passwordPolicyError(pw)!;
        }
        if (pw !== pw2) {
          next['password2'] = 'Las contraseñas no coinciden.';
        }
      } else if (pw || pw2) {
        if (passwordPolicyError(pw)) {
          next['password'] = passwordPolicyError(pw)!;
        }
        if (pw !== pw2) {
          next['password2'] = 'Las contraseñas no coinciden.';
        }
      }
    }

    if (key === 'tipoDoc' || key === 'numeroDoc') {
      delete next['tipoDoc'];
      delete next['numeroDoc'];
      const tipo = this.tipoDoc().trim();
      const numero = this.numeroDoc().trim();
      if (tipo && !numero) {
        next['numeroDoc'] = 'Si selecciona tipo de documento, ingrese el número.';
      } else if (numero && !tipo) {
        next['tipoDoc'] = 'Seleccione el tipo de documento para el número ingresado.';
      } else if (tipo && numero && !isValidIdentityDocumentNumber(tipo, numero)) {
        next['numeroDoc'] = identityDocumentNumberMessage(tipo);
      }
    }

    this.fieldErrors.set(next);
  }

  private applyYupFieldErrors(err: yup.ValidationError, into: Record<string, string>) {
    for (const e of err.inner?.length ? err.inner : [err]) {
      if (e.path && e.message && !into[e.path]) {
        into[e.path] = e.message;
      }
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

  protected onPermissionParent(tree: PermissionMenuNodeDto, checked: boolean) {
    const childCodes = tree.children?.map((c) => c.code) ?? [];
    if (!childCodes.length) {
      return;
    }
    const next = new Set(this.selectedNavCodes());
    if (checked) {
      childCodes.forEach((code) => next.add(code));
    } else {
      childCodes.forEach((code) => next.delete(code));
    }
    this.selectedNavCodes.set(next);
  }

  protected onPermissionChild(ev: { code: string; checked: boolean }) {
    this.toggleNavCode(ev.code, ev.checked);
  }

  protected onFotoFile(file: File) {
    this.fotoUploadError.set(null);
    this.revokeFotoPreview();
    this.fotoArchivoId.set(null);

    this.filesApi.upload(file).subscribe({
      next: (res) => {
        this.fotoArchivoId.set(res.id);
        this.loadFotoPreview(res.id);
      },
      error: (err: unknown) => {
        const msg = httpErrorMessage(err, 'No se pudo subir la imagen.');
        this.fotoUploadError.set(msg);
        this.fotoArchivoId.set(null);
        this.revokeFotoPreview();
        this.notify.error('Error al subir la imagen', msg);
      },
    });
  }

  protected onClose(force = false) {
    if (!force && (this.isSaving() || this.isValidating())) return;
    this.revokeFotoPreview();
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
    this.role.set('CAJERO');
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
    this.revokeFotoPreview();
    this.fotoArchivoId.set(null);
    this.fotoUploadError.set(null);
    this.selectedNavCodes.set(new Set<string>());
    this.fieldErrors.set({});
    this.touched.set({});
    this.submitAttempted.set(false);
  }

  protected readonly isValidating = signal(false);

  protected async onSave() {
    if (this.isSaving() || this.isValidating()) return;
    this.submitAttempted.set(true);
    this.isValidating.set(true);
    let errors: string[];
    try {
      errors = await this.validate();
    } finally {
      this.isValidating.set(false);
    }
    if (errors.length) {
      this.notify.warning(errors.slice(0, 4).join('\n'));
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

  private async validate(): Promise<string[]> {
    const errors: string[] = [];
    const fieldMap: Record<string, string> = {};

    try {
      await usuarioDatosSchema.validate(this.datosSnapshot(), { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        errors.push(...err.errors);
        this.applyYupFieldErrors(err, fieldMap);
      }
    }

    const pw = this.password();
    const pw2 = this.password2();
    if (!this.isEditing()) {
      if (passwordPolicyError(pw)) {
        const msg = passwordPolicyError(pw)!;
        errors.push(msg);
        fieldMap['password'] = msg;
      }
      if (pw !== pw2) {
        const msg = 'Las contraseñas no coinciden.';
        errors.push(msg);
        fieldMap['password2'] = msg;
      }
    } else if (pw || pw2) {
      if (passwordPolicyError(pw)) {
        const msg = passwordPolicyError(pw)!;
        errors.push(msg);
        fieldMap['password'] = msg;
      }
      if (pw !== pw2) {
        const msg = 'Las contraseñas no coinciden.';
        errors.push(msg);
        fieldMap['password2'] = msg;
      }
    }

    if (this.selectedNavCodes().size === 0) {
      errors.push('Debe seleccionar al menos un permiso de menú.');
    }

    try {
      await usuarioPersonalesSchema.validate(this.personalesSnapshot(), { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        errors.push(...err.errors);
        this.applyYupFieldErrors(err, fieldMap);
      }
    }

    if (this.tipoDoc().trim() && !this.numeroDoc().trim()) {
      const msg = 'Si selecciona tipo de documento, ingrese el número.';
      errors.push(msg);
      fieldMap['numeroDoc'] = msg;
    } else if (this.numeroDoc().trim() && !this.tipoDoc().trim()) {
      const msg = 'Seleccione el tipo de documento para el número ingresado.';
      errors.push(msg);
      fieldMap['tipoDoc'] = msg;
    } else {
      const tipo = this.tipoDoc().trim();
      const numero = this.numeroDoc().trim();
      if (tipo && numero && !isValidIdentityDocumentNumber(tipo, numero)) {
        const msg = identityDocumentNumberMessage(tipo);
        errors.push(msg);
        fieldMap['numeroDoc'] = msg;
      }
    }

    this.fieldErrors.set(fieldMap);
    return [...new Set(errors.map((x) => x.trim()).filter(Boolean))];
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
      permissionCodes: this.navCodesList(),
      ...(profile ? { profile } : {}),
    };
  }

  private buildUpdateBody(): UpdateUserRequest {
    const body: UpdateUserRequest = {
      nombre: this.nombre().trim(),
      email: this.email().trim().toLowerCase(),
      role: this.role(),
      establecimientoId: this.establecimientoId().trim(),
      permissionCodes: this.navCodesList(),
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
