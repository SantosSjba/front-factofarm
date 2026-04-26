import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { establishmentQueryKeys } from '../../../../core/query/establishment-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type {
  CreateEstablishmentRequest,
  CreateEstablishmentSeriesRequest,
  EstablishmentOptionDto,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-establecimientos',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    ModalComponent,
    ButtonComponent,
    IconComponent,
    LabelComponent,
    InputFieldComponent,
    FormSelectComponent,
    CheckboxComponent,
  ],
  templateUrl: './establecimientos.component.html',
})
export class EstablecimientosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Usuarios & Establecimientos' },
    { label: 'Establecimientos' },
  ];

  protected readonly establishmentsQuery = injectQuery(() => ({
    queryKey: establishmentQueryKeys.list({
      search: this.searchTerm().trim(),
      hospital: this.hospitalFilter(),
    }),
    queryFn: () =>
      firstValueFrom(
        this.api.listEstablishments({
          search: this.searchTerm(),
          hospital: this.hospitalFilter() as 'all' | 'hospital' | 'no-hospital',
        }),
      ),
  }));

  protected readonly documentTypesQuery = injectQuery(() => ({
    queryKey: establishmentQueryKeys.documentTypes(),
    queryFn: () => firstValueFrom(this.api.listEstablishmentDocumentTypes()),
  }));

  protected readonly departmentsQuery = injectQuery(() => ({
    queryKey: establishmentQueryKeys.departments(),
    queryFn: () => firstValueFrom(this.api.listUbigeoDepartments()),
  }));

  protected readonly provincesQuery = injectQuery(() => {
    const depId = this.departmentId();
    return {
      queryKey: establishmentQueryKeys.provinces(depId || 'none'),
      queryFn: () => firstValueFrom(this.api.listUbigeoProvinces(depId)),
      enabled: !!depId,
    };
  });

  protected readonly districtsQuery = injectQuery(() => {
    const provId = this.provinceId();
    return {
      queryKey: establishmentQueryKeys.districts(provId || 'none'),
      queryFn: () => firstValueFrom(this.api.listUbigeoDistricts(provId)),
      enabled: !!provId,
    };
  });

  protected readonly searchTerm = signal('');
  protected readonly hospitalFilter = signal('all');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;
  protected readonly establishments = computed(() => this.establishmentsQuery.data() ?? []);
  protected readonly hospitalFilterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'hospital', label: 'Solo hospitales' },
    { value: 'no-hospital', label: 'No hospital' },
  ];
  protected readonly totalFiltered = computed(() => this.establishments().length);
  protected readonly pageStart = computed(() =>
    this.totalFiltered() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage,
  );
  protected readonly paginatedEstablishments = computed(() => {
    const start = this.pageStart();
    return this.establishments().slice(start, start + this.itemsPerPage);
  });

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<EstablishmentOptionDto | null>(null);

  protected readonly nombre = signal('');
  protected readonly codigo = signal('');
  protected readonly pais = signal('PERU');
  protected readonly direccionFiscal = signal('');
  protected readonly departmentId = signal('');
  protected readonly provinceId = signal('');
  protected readonly districtId = signal('');
  protected readonly direccionComercial = signal('');
  protected readonly telefono = signal('');
  protected readonly correoContacto = signal('');
  protected readonly direccionWeb = signal('');
  protected readonly informacionAdicional = signal('');
  protected readonly urlImpresora = signal('');
  protected readonly nombreImpresora = signal('');
  protected readonly clienteDefault = signal('');
  protected readonly sujetoIgv31556 = signal(false);
  protected readonly esHospital = signal(false);

  protected readonly deleting = signal<EstablishmentOptionDto | null>(null);
  protected readonly deleteConfirmOpen = signal(false);

  protected readonly seriesHost = signal<EstablishmentOptionDto | null>(null);
  protected readonly seriesModalOpen = computed(() => this.seriesHost() !== null);
  protected readonly seriesDocumentType = signal('');
  protected readonly seriesNumero = signal('');
  protected readonly seriesContingencia = signal(false);

  protected readonly seriesQuery = injectQuery(() => {
    const host = this.seriesHost();
    return {
      queryKey: establishmentQueryKeys.series(host?.id ?? 'none'),
      queryFn: () => firstValueFrom(this.api.listEstablishmentSeries(host!.id)),
      enabled: !!host,
    };
  });

  protected readonly createEstablishmentMutation = injectMutation(() => ({
    mutationFn: (body: CreateEstablishmentRequest) =>
      firstValueFrom(this.api.createEstablishment(body)),
    onSuccess: () => {
      this.notify.success('Establecimiento creado correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: establishmentQueryKeys.list() });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo crear el establecimiento'));
    },
  }));

  protected readonly updateEstablishmentMutation = injectMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: CreateEstablishmentRequest }) =>
      firstValueFrom(this.api.updateEstablishment(id, body)),
    onSuccess: () => {
      this.notify.success('Establecimiento actualizado correctamente');
      this.closeFormModal(true);
      void this.queryClient.invalidateQueries({ queryKey: establishmentQueryKeys.list() });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el establecimiento'));
    },
  }));

  protected readonly deleteEstablishmentMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteEstablishment(id)),
    onSuccess: () => {
      this.notify.success('Establecimiento eliminado correctamente');
      this.closeDeleteConfirm();
      void this.queryClient.invalidateQueries({ queryKey: establishmentQueryKeys.list() });
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar el establecimiento'));
    },
  }));

  protected readonly createSeriesMutation = injectMutation(() => ({
    mutationFn: (input: { establishmentId: string; body: CreateEstablishmentSeriesRequest }) =>
      firstValueFrom(this.api.createEstablishmentSeries(input.establishmentId, input.body)),
    onSuccess: async (_data, vars) => {
      this.notify.success('Serie agregada correctamente');
      await this.queryClient.invalidateQueries({
        queryKey: establishmentQueryKeys.series(vars.establishmentId),
      });
      this.closeSeriesModal();
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo agregar la serie'));
    },
  }));

  protected readonly deleteSeriesMutation = injectMutation(() => ({
    mutationFn: (input: { establishmentId: string; seriesId: string }) =>
      firstValueFrom(this.api.deleteEstablishmentSeries(input.establishmentId, input.seriesId)),
    onSuccess: () => {
      this.notify.success('Serie eliminada correctamente');
      void this.invalidateSeries();
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo eliminar la serie'));
    },
  }));

  protected readonly isSaving = computed(
    () =>
      this.createEstablishmentMutation.isPending() ||
      this.updateEstablishmentMutation.isPending(),
  );

  protected readonly docTypeOptions = computed(() =>
    (this.documentTypesQuery.data() ?? []).map((d) => ({
      value: d.value,
      label: d.label,
    })),
  );
  protected readonly departmentOptions = computed(() =>
    (this.departmentsQuery.data() ?? []).map((d) => ({ value: d.id, label: d.name })),
  );
  protected readonly provinceOptions = computed(() =>
    (this.provincesQuery.data() ?? []).map((p) => ({ value: p.id, label: p.name })),
  );
  protected readonly districtOptions = computed(() =>
    (this.districtsQuery.data() ?? []).map((d) => ({ value: d.id, label: d.name })),
  );

  protected readonly seriesRows = computed(() => this.seriesQuery.data() ?? []);
  protected readonly selectedDocTypeLabel = computed(() => {
    const v = this.seriesDocumentType();
    return this.docTypeOptions().find((x) => x.value === v)?.label ?? '';
  });

  constructor() {
    effect(() => {
      const total = this.totalFiltered();
      const totalPages = Math.max(1, Math.ceil(total / this.itemsPerPage));
      const page = this.currentPage();
      if (page > totalPages) {
        this.currentPage.set(totalPages);
      }
      if (page < 1) {
        this.currentPage.set(1);
      }
    });

    effect(() => {
      if (!this.modalOpen()) {
        return;
      }
      const current = this.editing();
      if (current) {
        this.nombre.set(current.nombre ?? '');
        this.codigo.set(current.codigo ?? '');
        this.pais.set(current.pais ?? 'PERU');
        this.departmentId.set(current.departmentId ?? '');
        this.provinceId.set(current.provinceId ?? '');
        this.districtId.set(current.districtId ?? '');
        this.direccionFiscal.set(current.direccionFiscal ?? '');
        this.direccionComercial.set(current.direccionComercial ?? '');
        this.telefono.set(current.telefono ?? '');
        this.correoContacto.set(current.correoContacto ?? '');
        this.direccionWeb.set(current.direccionWeb ?? '');
        this.informacionAdicional.set(current.informacionAdicional ?? '');
        this.urlImpresora.set(current.urlImpresora ?? '');
        this.nombreImpresora.set(current.nombreImpresora ?? '');
        this.clienteDefault.set(current.clienteDefault ?? '');
        this.sujetoIgv31556.set(current.sujetoIgv31556 ?? false);
        this.esHospital.set(current.esHospital ?? false);
        return;
      }
      this.resetForm();
    });
  }

  protected openCreateModal() {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  protected openEditModal(row: EstablishmentOptionDto) {
    this.editing.set(row);
    this.modalOpen.set(true);
  }

  protected closeFormModal(force = false) {
    if (!force && this.isSaving()) return;
    this.modalOpen.set(false);
    this.editing.set(null);
    this.resetForm();
  }

  protected submitForm() {
    if (!this.nombre().trim()) {
      this.notify.warning('Ingrese la descripción del establecimiento.');
      return;
    }

    const body: CreateEstablishmentRequest = {
      nombre: this.nombre().trim(),
      codigo: this.norm(this.codigo()),
      pais: this.norm(this.pais()) ?? 'PERU',
      departmentId: this.norm(this.departmentId()),
      provinceId: this.norm(this.provinceId()),
      districtId: this.norm(this.districtId()),
      direccionFiscal: this.norm(this.direccionFiscal()),
      direccionComercial: this.norm(this.direccionComercial()),
      telefono: this.norm(this.telefono()),
      correoContacto: this.norm(this.correoContacto()),
      direccionWeb: this.norm(this.direccionWeb()),
      informacionAdicional: this.norm(this.informacionAdicional()),
      urlImpresora: this.norm(this.urlImpresora()),
      nombreImpresora: this.norm(this.nombreImpresora()),
      clienteDefault: this.norm(this.clienteDefault()),
      sujetoIgv31556: this.sujetoIgv31556(),
      esHospital: this.esHospital(),
      activo: true,
    };

    const current = this.editing();
    if (current) {
      this.updateEstablishmentMutation.mutate({ id: current.id, body });
      return;
    }
    this.createEstablishmentMutation.mutate(body);
  }

  protected openDeleteConfirm(row: EstablishmentOptionDto) {
    this.deleting.set(row);
    this.deleteConfirmOpen.set(true);
  }

  protected closeDeleteConfirm() {
    if (this.deleteEstablishmentMutation.isPending()) return;
    this.deleteConfirmOpen.set(false);
    this.deleting.set(null);
  }

  protected confirmDelete() {
    const current = this.deleting();
    if (!current || this.deleteEstablishmentMutation.isPending()) return;
    this.deleteEstablishmentMutation.mutate(current.id);
  }

  protected openSeriesModal(row: EstablishmentOptionDto) {
    this.seriesHost.set(row);
    const firstType = this.docTypeOptions()[0]?.value ?? '';
    this.seriesDocumentType.set(firstType);
    this.seriesNumero.set('');
    this.seriesContingencia.set(false);
  }

  protected onDepartmentChange(v: string) {
    this.departmentId.set(v);
    this.provinceId.set('');
    this.districtId.set('');
  }

  protected onProvinceChange(v: string) {
    this.provinceId.set(v);
    this.districtId.set('');
  }

  protected closeSeriesModal() {
    if (this.createSeriesMutation.isPending() || this.deleteSeriesMutation.isPending()) return;
    this.seriesHost.set(null);
    this.seriesDocumentType.set('');
    this.seriesNumero.set('');
    this.seriesContingencia.set(false);
  }

  protected addSeries() {
    const host = this.seriesHost();
    if (!host) return;
    const documentType = this.seriesDocumentType().trim();
    const numero = this.seriesNumero().trim().toUpperCase();

    if (!documentType) {
      this.notify.warning('Seleccione un tipo de documento.');
      return;
    }
    if (!numero) {
      this.notify.warning('Ingrese el número de serie.');
      return;
    }

    this.createSeriesMutation.mutate({
      establishmentId: host.id,
      body: {
        documentType: documentType as CreateEstablishmentSeriesRequest['documentType'],
        numero,
        esContingencia: this.seriesContingencia(),
      },
    });
  }

  protected removeSeries(seriesId: string) {
    const host = this.seriesHost();
    if (!host || this.deleteSeriesMutation.isPending()) return;
    this.deleteSeriesMutation.mutate({ establishmentId: host.id, seriesId });
  }

  protected async refetchEstablishments() {
    const result = await this.establishmentsQuery.refetch();
    if (result.isError) {
      this.notify.error(httpErrorMessage(result.error, 'No se pudo actualizar el listado.'));
    }
  }

  protected submitLabel(): string {
    if (this.isSaving()) return 'Guardando…';
    return this.editing() ? 'Actualizar' : 'Guardar';
  }

  protected docTypeLabel(type: string): string {
    return this.docTypeOptions().find((x) => x.value === type)?.label ?? type;
  }

  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onHospitalFilterChange(value: string) {
    this.hospitalFilter.set(value);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.hospitalFilter.set('all');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  private resetForm() {
    this.nombre.set('');
    this.codigo.set('');
    this.pais.set('PERU');
    this.departmentId.set('');
    this.provinceId.set('');
    this.districtId.set('');
    this.direccionFiscal.set('');
    this.direccionComercial.set('');
    this.telefono.set('');
    this.correoContacto.set('');
    this.direccionWeb.set('');
    this.informacionAdicional.set('');
    this.urlImpresora.set('');
    this.nombreImpresora.set('');
    this.clienteDefault.set('');
    this.sujetoIgv31556.set(false);
    this.esHospital.set(false);
  }

  private norm(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private async invalidateSeries() {
    const host = this.seriesHost();
    if (!host) return;
    await this.queryClient.invalidateQueries({
      queryKey: establishmentQueryKeys.series(host.id),
    });
  }
}
