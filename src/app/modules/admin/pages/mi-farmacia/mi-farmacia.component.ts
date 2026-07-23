import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { FilesApiService } from '../../../../core/services/files-api.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { FormRowComponent } from '../../../../shared/components/form/form-row/form-row.component';
import { FormStackComponent } from '../../../../shared/components/form/form-stack/form-stack.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ImageSquarePickerComponent } from '../../../../shared/components/form/image-square-picker/image-square-picker.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import type {
  BillingProviderType,
  SalePdfFormat,
  UpdatePharmacyProfileRequest,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-mi-farmacia',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    FormStackComponent,
    FormRowComponent,
    FormFieldComponent,
    FormSelectComponent,
    InputFieldComponent,
    TextAreaComponent,
    CheckboxComponent,
    ImageSquarePickerComponent,
    ButtonComponent,
    HelpHintComponent,
  ],
  templateUrl: './mi-farmacia.component.html',
})
export class MiFarmaciaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Configuración' },
    { label: 'Mi farmacia' },
  ];

  protected readonly nombre = signal('');
  protected readonly codigo = signal('');
  protected readonly rucEmisor = signal('');
  protected readonly razonSocialEmisor = signal('');
  protected readonly direccionFiscal = signal('');
  protected readonly direccionComercial = signal('');
  protected readonly telefono = signal('');
  protected readonly correoContacto = signal('');
  protected readonly direccionWeb = signal('');
  protected readonly informacionAdicional = signal('');
  protected readonly numeroRegistroDigemid = signal('');
  protected readonly departmentId = signal('');
  protected readonly provinceId = signal('');
  protected readonly districtId = signal('');
  protected readonly logoArchivoId = signal<string | null>(null);
  protected readonly logoPreview = signal<string | null>(null);
  protected readonly logoUploadError = signal<string | null>(null);
  protected readonly salePdfFormat = signal<SalePdfFormat>('TICKET_80');
  protected readonly timeZone = signal('America/Lima');

  protected readonly billingProvider = signal<BillingProviderType>('MOCK');
  protected readonly apiUrl = signal('');
  protected readonly consultaApiUrl = signal('');
  protected readonly apiToken = signal('');
  protected readonly modoSandbox = signal(true);
  protected readonly autoEmitOnSale = signal(false);
  protected readonly emitNotaVenta = signal(false);
  protected readonly applyDetraccion = signal(false);
  protected readonly autoEmitGuiaOnTransfer = signal(false);
  protected readonly hasOseCredentials = signal(false);
  protected readonly electronicInvoicingEnabled = signal(false);

  protected readonly profileQuery = injectQuery(() => ({
    queryKey: ['pharmacy-profile'] as const,
    queryFn: () => firstValueFrom(this.api.getPharmacyProfile()),
  }));

  protected readonly departmentsQuery = injectQuery(() => ({
    queryKey: ['ubigeo', 'departments'] as const,
    queryFn: () => firstValueFrom(this.api.listUbigeoDepartments()),
  }));

  protected readonly provincesQuery = injectQuery(() => ({
    queryKey: ['ubigeo', 'provinces', this.departmentId()] as const,
    queryFn: () => firstValueFrom(this.api.listUbigeoProvinces(this.departmentId())),
    enabled: !!this.departmentId(),
  }));

  protected readonly districtsQuery = injectQuery(() => ({
    queryKey: ['ubigeo', 'districts', this.provinceId()] as const,
    queryFn: () => firstValueFrom(this.api.listUbigeoDistricts(this.provinceId())),
    enabled: !!this.provinceId(),
  }));

  protected readonly departmentOptions = computed(() =>
    (this.departmentsQuery.data() ?? []).map((d) => ({ value: d.id, label: d.name })),
  );
  protected readonly provinceOptions = computed(() =>
    (this.provincesQuery.data() ?? []).map((d) => ({ value: d.id, label: d.name })),
  );
  protected readonly districtOptions = computed(() =>
    (this.districtsQuery.data() ?? []).map((d) => ({ value: d.id, label: d.name })),
  );

  protected readonly providerOptions = computed(() => {
    const fromApi = this.profileQuery.data()?.billingProviderOptions;
    if (fromApi?.length) {
      return fromApi
        .filter((o) => o.available)
        .map((o) => ({ value: o.value, label: o.label }));
    }
    return [
      { value: 'MOCK', label: 'Sin facturación electrónica (solo notas de venta)' },
      { value: 'FACTILIZA', label: 'Factiliza' },
      { value: 'NUBEFACT', label: 'Nubefact' },
      { value: 'APISPERU', label: 'APIsPERU' },
    ];
  });

  protected readonly needsOseCredentials = computed(() => {
    const p = this.billingProvider();
    return p === 'FACTILIZA' || p === 'NUBEFACT' || p === 'APISPERU';
  });

  /** Ayuda contextual: primero configuran el panel del proveedor; aquí solo pegamos credenciales. */
  protected readonly providerHelp = computed(() => {
    switch (this.billingProvider()) {
      case 'FACTILIZA':
        return 'Antes: cree su cuenta en Factiliza (app.factiliza.com), genere el token API y tenga el RUC listo. Luego pegue aquí la URL y el token; FactoFarm emitirá boletas/facturas por usted.';
      case 'NUBEFACT':
        return 'Antes: en el panel Nubefact vaya a Configuración → API (Integración), cree el local/series y genere RUTA + TOKEN. Luego péguelos aquí; FactoFarm enviará los comprobantes a esa ruta.';
      case 'APISPERU':
        return 'Antes: en APIsPERU inicie sesión, cree la empresa (certificado PEM + usuario SOL secundario) y copie el token permanente de esa empresa. Luego péguelo aquí; FactoFarm emitirá con ese Bearer.';
      default:
        return 'Sin proveedor OSE puede vender con nota de venta (no va a SUNAT). Si ya tiene cuenta en Factiliza, Nubefact o APIsPERU, elíjala e ingrese las credenciales del panel de ese proveedor.';
    }
  });

  protected readonly providerSelectHelp = computed(() => {
    switch (this.billingProvider()) {
      case 'FACTILIZA':
        return 'Requiere configuración previa en el panel Factiliza. Sin OSE use “solo notas de venta”.';
      case 'NUBEFACT':
        return 'Requiere RUTA y TOKEN ya generados en el panel Nubefact del local.';
      case 'APISPERU':
        return 'Requiere empresa ya creada en el panel APIsPERU (certificado + SOL).';
      default:
        return 'Elija un proveedor solo si ya tiene cuenta y credenciales en su panel. Sin eso, venda con nota de venta.';
    }
  });

  protected readonly salePdfFormatOptions = computed(() => {
    const fromApi = this.profileQuery.data()?.salePdfFormatOptions;
    if (fromApi?.length) {
      return fromApi.map((o) => ({ value: o.value, label: o.label }));
    }
    return [
      { value: 'TICKET_80', label: 'Ticket 80 mm (impresora térmica)' },
      { value: 'TICKET_58', label: 'Ticket 58 mm (impresora térmica)' },
      { value: 'A4', label: 'Hoja A4 (impresora normal)' },
    ];
  });

  protected readonly timeZoneOptions = computed(() => {
    const fromApi = this.profileQuery.data()?.timeZoneOptions;
    if (fromApi?.length) {
      return fromApi.map((o) => ({ value: o.value, label: o.label }));
    }
    return [{ value: 'America/Lima', label: 'Lima' }];
  });

  protected readonly apiUrlHelp = computed(() => {
    switch (this.billingProvider()) {
      case 'FACTILIZA':
        return 'URL base del API de Factiliza (la del panel o QA). Vacío = https://apife-qa.factiliza.com/api/v1';
      case 'NUBEFACT':
        return 'Pegue la RUTA completa que muestra Nubefact en Configuración → API (incluye el segmento del local).';
      case 'APISPERU':
        return 'URL base del API. Vacío = https://facturacion.apisperu.com/api/v1';
      default:
        return 'Endpoint del proveedor.';
    }
  });

  protected readonly apiTokenHelp = computed(() => {
    switch (this.billingProvider()) {
      case 'FACTILIZA':
        return 'Token Bearer generado en el panel Factiliza. Se guarda encriptado; vacío conserva el actual.';
      case 'NUBEFACT':
        return 'TOKEN del local en Nubefact (junto a la RUTA). Se guarda encriptado; vacío conserva el actual.';
      case 'APISPERU':
        return 'Token permanente de la empresa en APIsPERU (no el de login de 24 h). Se guarda encriptado; vacío conserva el actual.';
      default:
        return 'Token del proveedor. Se guarda encriptado.';
    }
  });

  protected readonly defaultApiUrlHint = computed(() => {
    switch (this.billingProvider()) {
      case 'FACTILIZA':
        return 'https://apife-qa.factiliza.com/api/v1';
      case 'APISPERU':
        return 'https://facturacion.apisperu.com/api/v1';
      case 'NUBEFACT':
        return 'Ruta completa del local (panel Nubefact → API)';
      default:
        return 'https://…';
    }
  });

  protected readonly capabilityNotes = computed(
    () => this.profileQuery.data()?.billingCapabilities?.notes ?? [],
  );

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: (body: UpdatePharmacyProfileRequest) =>
      firstValueFrom(this.api.updatePharmacyProfile(body)),
    onSuccess: async () => {
      this.notify.success('Datos de la farmacia guardados');
      this.apiToken.set('');
      await this.queryClient.invalidateQueries({ queryKey: ['pharmacy-profile'] });
      await this.queryClient.invalidateQueries({ queryKey: ['billing', 'config'] });
      await firstValueFrom(this.auth.loadMe());
    },
    onError: (err: unknown) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo guardar el perfil'));
    },
  }));

  protected readonly saving = computed(() => this.saveMutation.isPending());

  constructor() {
    effect(() => {
      const profile = this.profileQuery.data();
      if (!profile) return;
      this.nombre.set(profile.nombre ?? '');
      this.codigo.set(profile.codigo ?? '');
      this.rucEmisor.set(profile.rucEmisor ?? '');
      this.razonSocialEmisor.set(profile.razonSocialEmisor ?? '');
      this.direccionFiscal.set(profile.direccionFiscal ?? '');
      this.direccionComercial.set(profile.direccionComercial ?? '');
      this.telefono.set(profile.telefono ?? '');
      this.correoContacto.set(profile.correoContacto ?? '');
      this.direccionWeb.set(profile.direccionWeb ?? '');
      this.informacionAdicional.set(profile.informacionAdicional ?? '');
      this.numeroRegistroDigemid.set(profile.numeroRegistroDigemid ?? '');
      this.departmentId.set(profile.departmentId ?? '');
      this.provinceId.set(profile.provinceId ?? '');
      this.districtId.set(profile.districtId ?? '');
      this.logoArchivoId.set(profile.logoArchivoId);
      this.logoPreview.set(
        profile.logoUrl ? this.filesApi.absoluteFileUrl(profile.logoUrl) : null,
      );
      this.salePdfFormat.set(profile.salePdfFormat ?? 'TICKET_80');
      this.timeZone.set(profile.timeZone?.trim() || 'America/Lima');
      this.locale.setTimeZone(profile.timeZone);
      const provider =
        profile.billingProvider === 'FACTILIZA' ||
        profile.billingProvider === 'NUBEFACT' ||
        profile.billingProvider === 'APISPERU'
          ? profile.billingProvider
          : 'MOCK';
      this.billingProvider.set(provider);
      this.apiUrl.set(profile.apiUrl ?? '');
      this.consultaApiUrl.set(profile.consultaApiUrl ?? '');
      this.modoSandbox.set(profile.modoSandbox ?? true);
      this.autoEmitOnSale.set(profile.autoEmitOnSale ?? false);
      this.emitNotaVenta.set(profile.emitNotaVenta ?? false);
      this.applyDetraccion.set(profile.applyDetraccion ?? false);
      this.autoEmitGuiaOnTransfer.set(profile.autoEmitGuiaOnTransfer ?? false);
      this.hasOseCredentials.set(profile.hasOseCredentials);
      this.electronicInvoicingEnabled.set(profile.electronicInvoicingEnabled);
    });
  }

  protected onDepartmentChange(value: string) {
    this.departmentId.set(value);
    this.provinceId.set('');
    this.districtId.set('');
  }

  protected onProvinceChange(value: string) {
    this.provinceId.set(value);
    this.districtId.set('');
  }

  protected onProviderChange(value: string) {
    const next = (value || 'MOCK') as BillingProviderType;
    this.billingProvider.set(next);
    if (next === 'MOCK') {
      this.autoEmitOnSale.set(false);
      this.applyDetraccion.set(false);
      this.autoEmitGuiaOnTransfer.set(false);
    }
  }

  protected onLogoFile(file: File) {
    this.logoUploadError.set(null);
    this.filesApi.upload(file).subscribe({
      next: (res) => {
        this.logoArchivoId.set(res.id);
        this.logoPreview.set(this.filesApi.absoluteFileUrl(res.url));
        this.notify.success('Logo subido. Guarde los cambios para aplicarlo.');
      },
      error: () => {
        this.logoUploadError.set('No se pudo subir el logo.');
        this.notify.error('Error al subir el logo');
      },
    });
  }

  protected clearLogo() {
    this.logoArchivoId.set(null);
    this.logoPreview.set(null);
  }

  protected submit() {
    const ruc = this.rucEmisor().trim();
    if (ruc && !/^\d{11}$/.test(ruc)) {
      this.notify.error('El RUC debe tener 11 dígitos');
      return;
    }
    if (!this.nombre().trim()) {
      this.notify.error('Indique el nombre del local');
      return;
    }

    const provider = this.billingProvider();
    const token = this.apiToken().trim();
    if (
      (provider === 'FACTILIZA' || provider === 'NUBEFACT' || provider === 'APISPERU') &&
      !this.hasOseCredentials() &&
      !token
    ) {
      this.notify.error('Ingrese el token API del proveedor OSE o elija “solo notas de venta”.');
      return;
    }

    const body: UpdatePharmacyProfileRequest = {
      nombre: this.nombre().trim(),
      codigo: this.codigo().trim() || undefined,
      rucEmisor: ruc || undefined,
      razonSocialEmisor: this.razonSocialEmisor().trim() || undefined,
      billingProvider: provider,
      apiUrl: this.apiUrl().trim() || undefined,
      consultaApiUrl: this.consultaApiUrl().trim() || undefined,
      modoSandbox: this.modoSandbox(),
      autoEmitOnSale: provider === 'MOCK' ? false : this.autoEmitOnSale(),
      emitNotaVenta: this.emitNotaVenta(),
      applyDetraccion: provider === 'MOCK' ? false : this.applyDetraccion(),
      autoEmitGuiaOnTransfer: provider === 'MOCK' ? false : this.autoEmitGuiaOnTransfer(),
      direccionFiscal: this.direccionFiscal().trim() || undefined,
      direccionComercial: this.direccionComercial().trim() || undefined,
      telefono: this.telefono().trim() || undefined,
      correoContacto: this.correoContacto().trim() || undefined,
      direccionWeb: this.direccionWeb().trim() || undefined,
      informacionAdicional: this.informacionAdicional().trim() || undefined,
      numeroRegistroDigemid: this.numeroRegistroDigemid().trim() || null,
      departmentId: this.departmentId() || null,
      provinceId: this.provinceId() || null,
      districtId: this.districtId() || null,
      logoArchivoId: this.logoArchivoId(),
      salePdfFormat: this.salePdfFormat(),
      timeZone: this.timeZone(),
    };
    if (token) body.apiToken = token;

    this.saveMutation.mutate(body);
  }
}
