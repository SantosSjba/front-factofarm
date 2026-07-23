import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { FilesApiService } from '../../../../core/services/files-api.service';
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
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import type { UpdatePharmacyProfileRequest } from '../../models/directory.models';
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
    ImageSquarePickerComponent,
    ButtonComponent,
    HelpHintComponent,
  ],
  templateUrl: './mi-farmacia.component.html',
})
export class MiFarmaciaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly filesApi = inject(FilesApiService);
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
  protected readonly hasOseCredentials = signal(false);
  protected readonly billingProvider = signal('');

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

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: (body: UpdatePharmacyProfileRequest) =>
      firstValueFrom(this.api.updatePharmacyProfile(body)),
    onSuccess: async () => {
      this.notify.success('Datos de la farmacia guardados');
      await this.queryClient.invalidateQueries({ queryKey: ['pharmacy-profile'] });
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
      this.hasOseCredentials.set(profile.hasOseCredentials);
      this.billingProvider.set(profile.billingProvider ?? '');
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

    this.saveMutation.mutate({
      nombre: this.nombre().trim(),
      codigo: this.codigo().trim() || undefined,
      rucEmisor: ruc || undefined,
      razonSocialEmisor: this.razonSocialEmisor().trim() || undefined,
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
    });
  }
}
