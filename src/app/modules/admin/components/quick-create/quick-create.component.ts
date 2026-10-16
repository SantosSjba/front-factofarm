import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { Observable, firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { identityDocumentNumberMessage, isValidIdentityDocumentNumber } from '../../../../core/utils/peru-documents';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { CustomerDocumentTypeDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Registros que se pueden dar de alta sin salir del formulario que los usa. */
export type QuickCreateEntity =
  | 'customer'
  | 'supplier'
  | 'medico'
  | 'warehouse'
  | 'customerType'
  | 'customerZone'
  | 'carrier'
  | 'driver'
  | 'vehicle'
  | 'departure'
  | 'cashRegister'
  | 'warehouseZone';

/** `row` es la respuesta del API (p. ej. el cliente con su tipo de documento). */
export type QuickCreated = { id: string; label: string; row: Record<string, unknown> };

type Field = {
  key: string;
  label: string;
  type?: 'text' | 'select' | 'checkbox' | 'ubigeo';
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  initial?: string;
};

type EntityConfig = {
  title: string;
  button: string;
  icon: string;
  permission: string;
  /** Palabra clave de las queryKey a refrescar tras el alta. */
  refresh: string[];
  fields: Field[];
  /** Valida y arma el alta; devuelve un mensaje si falta algo. */
  validate?: (v: Record<string, string>) => string | null;
  create: (v: Record<string, string>, ctx: QuickCreateContext) => Observable<Record<string, unknown>>;
  label: (row: Record<string, unknown>) => string;
};

export type QuickCreateContext = { carrierId?: string; warehouseId?: string };

const PERSON_DOCS = [
  { value: 'DNI', label: 'DNI' },
  { value: 'RUC', label: 'RUC' },
  { value: 'CE', label: 'Carnet de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const docRule = (tipoKey: string, numKey: string) => (v: Record<string, string>) =>
  isValidIdentityDocumentNumber(v[tipoKey], v[numKey]) ? null : identityDocumentNumberMessage(v[tipoKey]);

const opt = (v: string) => v.trim() || undefined;

/**
 * Botón "Nuevo …" que se coloca junto a un select o buscador de registros: abre un formulario
 * corto, registra el dato y lo devuelve para dejarlo seleccionado, sin ir al CRUD.
 */
@Component({
  selector: 'app-quick-create',
  standalone: true,
  imports: [
    ButtonComponent,
    CheckboxComponent,
    FormFieldComponent,
    FormSelectComponent,
    HasPermissionDirective,
    InputFieldComponent,
    ModalComponent,
  ],
  template: `
    <app-button
      *appHasPermission="config().permission"
      [size]="iconOnly ? 'md' : 'sm'"
      variant="outline"
      [startIconName]="config().icon"
      [tooltip]="iconOnly ? config().button : ''"
      [ariaLabel]="config().button"
      (btnClick)="open()"
      >{{ iconOnly ? 'Nuevo' : config().button }}</app-button
    >
    <app-modal [isOpen]="isOpen()" (closed)="isOpen.set(false)" className="w-full max-w-lg">
      <div class="space-y-3 p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ config().title }}</h3>
        @for (f of config().fields; track f.key) {
          @switch (f.type ?? 'text') {
            @case ('select') {
              <app-form-field [label]="f.label" [required]="!!f.required">
                <app-form-select [options]="f.options ?? []" [value]="values()[f.key] ?? ''" (valueChange)="set(f.key, $event)" />
              </app-form-field>
            }
            @case ('checkbox') {
              <app-checkbox [checked]="values()[f.key] === '1'" [label]="f.label" (checkedChange)="set(f.key, $event ? '1' : '')" />
              @if (f.hint) {
                <p class="text-xs text-gray-500">{{ f.hint }}</p>
              }
            }
            @case ('ubigeo') {
              <div class="grid gap-3 sm:grid-cols-3">
                <app-form-field label="Departamento" [required]="!!f.required">
                  <app-form-select [options]="departmentOptions()" [value]="values()['departmentId'] ?? ''" (valueChange)="onDepartment($event)" />
                </app-form-field>
                <app-form-field label="Provincia" [required]="!!f.required">
                  <app-form-select [options]="provinceOptions()" [value]="values()['provinceId'] ?? ''" (valueChange)="onProvince($event)" />
                </app-form-field>
                <app-form-field label="Distrito" [required]="!!f.required">
                  <app-form-select [options]="districtOptions()" [value]="values()['districtId'] ?? ''" (valueChange)="set('districtId', $event)" />
                </app-form-field>
              </div>
            }
            @default {
              <app-form-field [label]="f.label" [required]="!!f.required" [helpText]="f.hint ?? ''">
                <app-input-field [value]="values()[f.key] ?? ''" [maxLength]="f.maxLength ?? 200" [placeholder]="f.placeholder ?? ''" (valueChange)="set(f.key, '' + $event)" />
              </app-form-field>
            }
          }
        }
        <div class="flex justify-end gap-2 pt-2">
          <app-button startIconName="mdi:close" variant="outline" (btnClick)="isOpen.set(false)">Cancelar</app-button>
          <app-button startIconName="mdi:content-save-outline" [loading]="saving()" [disabled]="saving()" (btnClick)="save()">Guardar</app-button>
        </div>
      </div>
    </app-modal>
  `,
})
export class QuickCreateComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  @Input({ required: true }) set entity(value: QuickCreateEntity) {
    this.entityKey.set(value);
  }
  /** Datos del formulario padre (p. ej. el transportista elegido para un conductor). */
  @Input() context: QuickCreateContext = {};
  /** Versión compacta junto a un select: muestra sólo "Nuevo" (el nombre completo va en el tooltip). */
  @Input() iconOnly = false;
  @Output() created = new EventEmitter<QuickCreated>();

  private readonly entityKey = signal<QuickCreateEntity>('customer');
  protected readonly isOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly values = signal<Record<string, string>>({});
  private readonly departments = signal<{ id: string; name: string }[]>([]);
  private readonly provinces = signal<{ id: string; name: string }[]>([]);
  private readonly districts = signal<{ id: string; name: string }[]>([]);

  protected readonly departmentOptions = computed(() => this.toOptions(this.departments(), 'Departamento'));
  protected readonly provinceOptions = computed(() => this.toOptions(this.provinces(), 'Provincia'));
  protected readonly districtOptions = computed(() => this.toOptions(this.districts(), 'Distrito'));

  private readonly configs: Record<QuickCreateEntity, EntityConfig> = {
    customer: {
      title: 'Nuevo cliente / paciente',
      button: 'Nuevo cliente',
      icon: 'mdi:account-plus-outline',
      permission: 'customers.write',
      refresh: ['customer'],
      fields: [
        { key: 'tipoDocumento', label: 'Tipo de documento', type: 'select', required: true, options: PERSON_DOCS, initial: 'DNI' },
        { key: 'numeroDocumento', label: 'N° de documento', required: true, maxLength: 20 },
        { key: 'nombre', label: 'Nombre o razón social', required: true, maxLength: 200 },
        { key: 'telefono', label: 'Teléfono', maxLength: 30 },
        {
          key: 'lpdp',
          label: 'El cliente autoriza el tratamiento de sus datos personales',
          type: 'checkbox',
          required: true,
          hint: 'Ley 29733 de Protección de Datos Personales.',
        },
      ],
      validate: (v) =>
        docRule('tipoDocumento', 'numeroDocumento')(v) ??
        (v['lpdp'] ? null : 'Registre el consentimiento de datos personales del cliente (Ley 29733).'),
      create: (v) =>
        this.api.createCustomer({
          tipoDocumento: v['tipoDocumento'] as CustomerDocumentTypeDto,
          numeroDocumento: v['numeroDocumento'].trim(),
          nombre: v['nombre'].trim(),
          telefono: opt(v['telefono']),
          lpdpConsentAccepted: true,
          lpdpConsentVersion: '2026-06-11',
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => `${r['nombre']} · ${r['numeroDocumento']}`,
    },
    supplier: {
      title: 'Nuevo proveedor',
      button: 'Nuevo proveedor',
      icon: 'mdi:truck-plus-outline',
      permission: 'suppliers.write',
      refresh: ['supplier'],
      fields: [
        { key: 'numeroDocumento', label: 'RUC', required: true, maxLength: 11 },
        { key: 'razonSocial', label: 'Razón social', required: true, maxLength: 200 },
        { key: 'telefono', label: 'Teléfono', maxLength: 30 },
      ],
      validate: (v) => (isValidIdentityDocumentNumber('RUC', v['numeroDocumento']) ? null : 'RUC no válido.'),
      create: (v) =>
        this.api.createSupplier({
          tipoDocumento: 'RUC' as CustomerDocumentTypeDto,
          numeroDocumento: v['numeroDocumento'].trim(),
          razonSocial: v['razonSocial'].trim(),
          telefono: opt(v['telefono']),
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['razonSocial']),
    },
    medico: {
      title: 'Nuevo médico prescriptor',
      button: 'Nuevo médico',
      icon: 'mdi:account-plus-outline',
      permission: 'medicos.write',
      refresh: ['medicos'],
      fields: [
        { key: 'cmp', label: 'CMP', required: true, maxLength: 20, hint: 'Número de colegiatura del Colegio Médico del Perú.' },
        { key: 'nombres', label: 'Nombres', required: true, maxLength: 120 },
        { key: 'apellidos', label: 'Apellidos', required: true, maxLength: 120 },
        { key: 'especialidad', label: 'Especialidad', maxLength: 120 },
      ],
      create: (v) =>
        this.api.createMedico({
          cmp: v['cmp'].trim(),
          nombres: v['nombres'].trim(),
          apellidos: v['apellidos'].trim(),
          especialidad: opt(v['especialidad']),
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => `${r['cmp']} · ${r['nombres']} ${r['apellidos']}`,
    },
    warehouse: {
      title: 'Nuevo almacén',
      button: 'Nuevo almacén',
      icon: 'mdi:warehouse',
      permission: 'inventory.write',
      refresh: ['warehouse'],
      fields: [{ key: 'nombre', label: 'Nombre del almacén', required: true, maxLength: 120, hint: 'Se crea en su establecimiento actual.' }],
      create: (v) =>
        this.api.createWarehouse({
          establishmentId: this.auth.user()?.establecimientoId ?? '',
          nombre: v['nombre'].trim(),
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['nombre']),
    },
    customerType: {
      title: 'Nuevo tipo de cliente',
      button: 'Nuevo tipo',
      icon: 'mdi:tag-plus-outline',
      permission: 'customer-types.write',
      refresh: ['customer-type', 'customerType', 'customer'],
      fields: [{ key: 'descripcion', label: 'Descripción', required: true, maxLength: 120 }],
      create: (v) => this.api.createCustomerType({ descripcion: v['descripcion'].trim() }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['descripcion']),
    },
    customerZone: {
      title: 'Nueva zona',
      button: 'Nueva zona',
      icon: 'mdi:map-marker-plus-outline',
      permission: 'customers.write',
      refresh: ['zone', 'customer'],
      fields: [{ key: 'nombre', label: 'Nombre de la zona', required: true, maxLength: 120 }],
      create: (v) => this.api.createCustomerZone(v['nombre'].trim()) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['nombre']),
    },
    carrier: {
      title: 'Nuevo transportista',
      button: 'Nuevo transportista',
      icon: 'mdi:truck-plus-outline',
      permission: 'shipping.write',
      refresh: ['carriers'],
      fields: [
        { key: 'ruc', label: 'RUC', required: true, maxLength: 11 },
        { key: 'razonSocial', label: 'Razón social', required: true, maxLength: 200 },
        { key: 'telefono', label: 'Teléfono', maxLength: 30 },
      ],
      validate: (v) => (isValidIdentityDocumentNumber('RUC', v['ruc']) ? null : 'RUC no válido.'),
      create: (v) =>
        this.api.createShippingCarrier({
          ruc: v['ruc'].trim(),
          razonSocial: v['razonSocial'].trim(),
          telefono: opt(v['telefono']),
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['razonSocial']),
    },
    driver: {
      title: 'Nuevo conductor',
      button: 'Nuevo conductor',
      icon: 'mdi:card-account-details-outline',
      permission: 'shipping.write',
      refresh: ['drivers'],
      fields: [
        { key: 'tipoDocumento', label: 'Tipo de documento', type: 'select', required: true, options: PERSON_DOCS.filter((d) => d.value !== 'RUC'), initial: 'DNI' },
        { key: 'numeroDocumento', label: 'N° de documento', required: true, maxLength: 20 },
        { key: 'nombres', label: 'Nombres', required: true, maxLength: 120 },
        { key: 'apellidos', label: 'Apellidos', required: true, maxLength: 120 },
        { key: 'licencia', label: 'N° de licencia de conducir', required: true, maxLength: 20, hint: 'Obligatoria en la guía de remisión (SUNAT).' },
      ],
      validate: docRule('tipoDocumento', 'numeroDocumento'),
      create: (v, ctx) =>
        this.api.createShippingDriver({
          carrierId: ctx.carrierId || undefined,
          tipoDocumento: v['tipoDocumento'],
          numeroDocumento: v['numeroDocumento'].trim(),
          nombres: v['nombres'].trim(),
          apellidos: v['apellidos'].trim(),
          licencia: v['licencia'].trim(),
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => `${r['nombres']} ${r['apellidos']}`,
    },
    vehicle: {
      title: 'Nuevo vehículo',
      button: 'Nuevo vehículo',
      icon: 'mdi:car-arrow-right',
      permission: 'shipping.write',
      refresh: ['vehicles'],
      fields: [
        { key: 'placa', label: 'Placa', required: true, maxLength: 10, placeholder: 'ABC-123' },
        { key: 'marca', label: 'Marca', maxLength: 60 },
        { key: 'modelo', label: 'Modelo', maxLength: 60 },
      ],
      create: (v, ctx) =>
        this.api.createShippingVehicle({
          carrierId: ctx.carrierId || undefined,
          placa: v['placa'].trim().toUpperCase(),
          marca: opt(v['marca']),
          modelo: opt(v['modelo']),
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['placa']),
    },
    departure: {
      title: 'Nueva dirección de partida',
      button: 'Nueva dirección',
      icon: 'mdi:map-marker-plus-outline',
      permission: 'shipping.write',
      refresh: ['departure'],
      fields: [
        { key: 'codigo', label: 'Código de establecimiento SUNAT', required: true, maxLength: 4, placeholder: '0000' },
        { key: 'nombre', label: 'Nombre', required: true, maxLength: 120 },
        { key: 'direccion', label: 'Dirección', required: true, maxLength: 250 },
        { key: 'ubigeo', label: 'Ubigeo', type: 'ubigeo', required: true },
      ],
      validate: (v) =>
        !/^\d{4}$/.test(v['codigo'] ?? '')
          ? 'El código de establecimiento SUNAT tiene 4 dígitos (0000 = domicilio fiscal).'
          : !v['districtId']
            ? 'Seleccione departamento, provincia y distrito (la guía de remisión exige el ubigeo de partida).'
            : null,
      create: (v) =>
        this.api.createDepartureAddress({
          codigo: v['codigo'].trim(),
          nombre: v['nombre'].trim(),
          direccion: v['direccion'].trim(),
          departmentId: v['departmentId'],
          provinceId: v['provinceId'],
          districtId: v['districtId'],
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['nombre']),
    },
    cashRegister: {
      title: 'Nueva caja',
      button: 'Nueva caja',
      icon: 'mdi:cash-register',
      permission: 'cash.open',
      refresh: ['cash'],
      fields: [{ key: 'nombre', label: 'Nombre de la caja', required: true, maxLength: 120, placeholder: 'Caja 2' }],
      create: (v) => this.api.createCashRegister({ nombre: v['nombre'].trim() }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['nombre']),
    },
    warehouseZone: {
      title: 'Nueva zona de almacén',
      button: 'Nueva zona',
      icon: 'mdi:snowflake-thermometer',
      permission: 'inventory.write',
      refresh: ['zones'],
      fields: [
        { key: 'nombre', label: 'Nombre de la zona', required: true, maxLength: 120 },
        {
          key: 'tipo',
          label: 'Tipo BPA',
          type: 'select',
          required: true,
          initial: 'REFRIGERADO',
          options: [
            { value: 'REFRIGERADO', label: 'Refrigerado (cadena de frío)' },
            { value: 'CONTROLADO', label: 'Controlado' },
            { value: 'NORMAL', label: 'Normal' },
          ],
        },
      ],
      validate: () => null,
      create: (v, ctx) =>
        this.api.createWarehouseZone({
          warehouseId: ctx.warehouseId ?? '',
          nombre: v['nombre'].trim(),
          tipo: v['tipo'] as 'NORMAL' | 'REFRIGERADO' | 'CONTROLADO',
        }) as unknown as Observable<Record<string, unknown>>,
      label: (r) => String(r['nombre']),
    },
  };

  protected readonly config = computed(() => this.configs[this.entityKey()]);

  protected open() {
    const cfg = this.config();
    if (this.entityKey() === 'warehouseZone' && !this.context.warehouseId) {
      this.notify.warning('Seleccione primero el almacén donde se creará la zona.');
      return;
    }
    const initial: Record<string, string> = {};
    for (const f of cfg.fields) initial[f.key] = f.initial ?? '';
    this.values.set(initial);
    if (cfg.fields.some((f) => f.type === 'ubigeo') && !this.departments().length) {
      void firstValueFrom(this.api.listUbigeoDepartments()).then((rows) => this.departments.set(rows));
    }
    this.isOpen.set(true);
  }

  protected set(key: string, value: string) {
    this.values.update((v) => ({ ...v, [key]: value }));
  }

  protected async onDepartment(id: string) {
    this.values.update((v) => ({ ...v, departmentId: id, provinceId: '', districtId: '' }));
    this.provinces.set([]);
    this.districts.set([]);
    if (id) this.provinces.set(await firstValueFrom(this.api.listUbigeoProvinces(id)));
  }

  protected async onProvince(id: string) {
    this.values.update((v) => ({ ...v, provinceId: id, districtId: '' }));
    this.districts.set([]);
    if (id) this.districts.set(await firstValueFrom(this.api.listUbigeoDistricts(id)));
  }

  protected async save() {
    const cfg = this.config();
    const v = this.values();
    const missing = cfg.fields
      .filter((f) => f.required && f.type !== 'checkbox' && f.type !== 'ubigeo' && !(v[f.key] ?? '').trim())
      .map((f) => f.label);
    if (missing.length) {
      this.notify.warning(`Complete: ${missing.join(', ')}.`);
      return;
    }
    const problem = cfg.validate?.(v);
    if (problem) {
      this.notify.warning(problem);
      return;
    }
    this.saving.set(true);
    try {
      const row = await firstValueFrom(cfg.create(v, this.context));
      // Refresca los listados que muestran este tipo de registro para que aparezca en el select.
      await this.queryClient.invalidateQueries({
        predicate: (q) => {
          const key = JSON.stringify(q.queryKey).toLowerCase();
          return cfg.refresh.some((word) => key.includes(word.toLowerCase()));
        },
      });
      const created: QuickCreated = { id: String(row['id']), label: cfg.label(row), row };
      this.isOpen.set(false);
      this.notify.success(`${cfg.title.replace(/^Nuev[oa] /, '')} registrado y seleccionado`);
      this.created.emit(created);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo registrar'));
    } finally {
      this.saving.set(false);
    }
  }

  private toOptions(rows: { id: string; name: string }[], placeholder: string) {
    return [{ value: '', label: placeholder }, ...rows.map((r) => ({ value: r.id, label: r.name }))];
  }
}
