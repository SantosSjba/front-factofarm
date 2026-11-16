import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { AuthFilePipe } from '../../../../shared/pipes/auth-file.pipe';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { CreatePrescriptionRequest, PrescriptionListItemDto } from '../../models/directory.models';
import type { StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { FilesApiService } from '../../../../core/services/files-api.service';
import { FileInputComponent } from '../../../../shared/components/form/input/file-input.component';
import { QuickCreateComponent, type QuickCreated } from '../../components/quick-create/quick-create.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { QuantityStepperComponent } from '../../../../shared/components/form/quantity-stepper/quantity-stepper.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVA: { label: 'Por dispensar', tone: 'info' },
  PARCIALMENTE_DISPENSADA: { label: 'Dispensada en parte', tone: 'warning' },
  COMPLETADA: { label: 'Completada', tone: 'success' },
  VENCIDA: { label: 'Vencida', tone: 'neutral' },
  ANULADA: { label: 'Anulada', tone: 'error' },
};

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [
    AuthFilePipe,
    QuickCreateComponent,
    FileInputComponent,
    QueryPageStatePipe,
    CommonModule,
    AppDatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    PaginationComponent,
    ButtonComponent,
    InputFieldComponent,
    FormSelectComponent,
    ModalComponent,
    PageStateComponent,
    ListFiltersComponent,
    HelpPanelComponent,
    FormSectionComponent,
    StatusBadgeComponent,
    SearchSelectComponent,
    QuantityStepperComponent,
    LabelComponent,
  ],
  templateUrl: './recetas.component.html' })
export class RecetasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Fármacos' }, { label: 'Recetas' }];
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly selectedCustomer = signal<{ id: string; nombre: string; numeroDocumento: string } | null>(null);
  protected readonly customerReset = signal(0);
  protected readonly productReset = signal(0);
  protected readonly createOpen = signal(false);
  protected readonly customerId = signal('');
  protected readonly customerSearch = signal('');
  protected readonly medicoId = signal('');
  protected readonly diagnostico = signal('');
  protected readonly productSearch = signal('');
  protected readonly draftItems = signal<Array<{ productId: string; label: string; cantidad: number }>>([]);
  protected readonly imagenArchivoId = signal('');
  protected readonly imagenPreviewUrl = signal('');
  protected readonly uploadingImage = signal(false);

  protected readonly medicosQuery = injectQuery(() => ({
    queryKey: ['medicos', 'all'] as const,
    queryFn: () => firstValueFrom(this.api.listMedicos({ pageSize: 100 })) }));

  /** Médico creado con el alta rápida (puede no estar entre los 100 primeros de la lista). */
  private readonly quickCreatedMedico = signal<{ id: string; cmp: string; nombres: string; apellidos: string } | null>(null);

  protected readonly medicoOptions = computed(() => {
    const items = this.medicosQuery.data()?.items ?? [];
    const extra = this.quickCreatedMedico();
    const all = extra && !items.some((m) => m.id === extra.id) ? [extra, ...items] : items;
    return [
      ...all.map((m) => ({ value: m.id, label: `${m.cmp} · ${m.nombres} ${m.apellidos}` })),
    ];
  });

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['prescriptions', this.search().trim(), this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listPrescriptions({ search: this.search().trim() || undefined, page: this.page(), pageSize: 15 })) }));

  /** Buscadores del modal: consultan al escribir (el buscador ya espera entre teclas). */
  protected readonly customerQuery = injectQuery(() => {
    const search = this.customerSearch().trim();
    return {
      queryKey: ['prescriptions', 'customer-picker', search] as const,
      enabled: this.createOpen() && !this.selectedCustomer(),
      queryFn: () => firstValueFrom(this.api.listCustomers({ search: search || undefined, page: 1, pageSize: 10 })),
    };
  });
  protected readonly customerOptions = computed(() =>
    (this.customerQuery.data()?.items ?? []).map((c) => ({ value: c.id, label: c.nombre, meta: c.numeroDocumento })),
  );
  protected readonly productQuery = injectQuery(() => {
    const search = this.productSearch().trim();
    return {
      queryKey: ['prescriptions', 'product-picker', search] as const,
      enabled: this.createOpen(),
      queryFn: () => firstValueFrom(this.api.listProducts({ search: search || undefined, field: 'all', page: 1, pageSize: 15 })),
    };
  });
  protected readonly productOptions = computed(() =>
    (this.productQuery.data()?.items ?? []).map((p) => ({ value: p.id, label: p.nombre, meta: p.codigoInterno ? `Cód. ${p.codigoInterno}` : '' })),
  );

  protected statusLabel(estado: string): string {
    return STATUS[estado]?.label ?? estado;
  }

  protected statusTone(estado: string): StatusTone {
    return STATUS[estado]?.tone ?? 'neutral';
  }

  /** «3 de 5 unid.» sumando todos los medicamentos de la receta. */
  protected dispensedLabel(row: PrescriptionListItemDto): string {
    const total = row.items.reduce((acc, i) => acc + (Number(i.cantidadPrescrita) || 0), 0);
    const done = row.items.reduce((acc, i) => acc + (Number(i.cantidadDispensada) || 0), 0);
    return `${row.items.length} medicamento${row.items.length === 1 ? '' : 's'} · ${done} de ${total} unid.`;
  }

  protected pickCustomer(id: string) {
    const c = this.customerQuery.data()?.items.find((x) => x.id === id);
    if (c) this.selectCustomer(c);
  }

  protected clearCustomer() {
    this.selectedCustomer.set(null);
    this.customerId.set('');
    this.customerSearch.set('');
    this.customerReset.update((n) => n + 1);
  }

  protected pickProduct(option: { value: string; label: string }) {
    if (this.draftItems().some((r) => r.productId === option.value)) {
      this.notify.info(`${option.label} ya está en la receta; ajusta la cantidad.`);
    } else {
      this.draftItems.update((rows) => [...rows, { productId: option.value, label: option.label, cantidad: 1 }]);
    }
    this.productReset.update((n) => n + 1);
  }

  protected onMedicoCreated(medico: QuickCreated) {
    const row = medico.row as { id: string; cmp: string; nombres: string; apellidos: string };
    this.quickCreatedMedico.set(row);
    this.medicoId.set(row.id);
  }

  protected createMutation = injectMutation(() => ({
    mutationFn: async () => {
      const body: CreatePrescriptionRequest = {
        customerId: this.customerId(),
        medicoId: this.medicoId() || undefined,
        fechaEmision: new Date().toISOString(),
        diagnostico: this.diagnostico().trim() || undefined,
        imagenArchivoId: this.imagenArchivoId() || undefined,
        items: this.draftItems().map((i) => ({
          productId: i.productId,
          cantidadPrescrita: String(i.cantidad) })) };
      return firstValueFrom(this.api.createPrescription(body));
    },
    onSuccess: () => {
      this.notify.success('Receta registrada');
      this.createOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la receta')) }));

  protected submitCreate() {
    if (!this.customerId()) {
      this.notify.warning('Busca y selecciona al paciente.');
      return;
    }
    if (!this.medicoId()) {
      this.notify.warning('Seleccione el médico prescriptor (DIGEMID exige su nombre y CMP en la receta).');
      return;
    }
    if (this.draftItems().length === 0) {
      this.notify.warning('Agregue al menos un medicamento a la receta.');
      return;
    }
    const bad = this.draftItems().find((i) => !Number.isFinite(i.cantidad) || i.cantidad <= 0);
    if (bad) {
      this.notify.warning(`La cantidad de ${bad.label} debe ser mayor a 0.`);
      return;
    }
    this.createMutation.mutate();
  }

  protected updateItemQty(productId: string, cantidad: number) {
    this.draftItems.update((rows) => rows.map((r) => (r.productId === productId ? { ...r, cantidad } : r)));
  }

  protected removeItem(productId: string) {
    this.draftItems.update((rows) => rows.filter((r) => r.productId !== productId));
  }

  protected selectCustomer(c: { id: string; nombre: string; numeroDocumento: string }) {
    this.customerId.set(c.id);
    this.selectedCustomer.set({ id: c.id, nombre: c.nombre, numeroDocumento: c.numeroDocumento });
  }

  protected openCreate() {
    this.customerId.set('');
    this.customerSearch.set('');
    this.selectedCustomer.set(null);
    this.customerReset.update((n) => n + 1);
    this.productSearch.set('');
    this.productReset.update((n) => n + 1);
    this.medicoId.set('');
    this.diagnostico.set('');
    this.draftItems.set([]);
    this.imagenArchivoId.set('');
    this.imagenPreviewUrl.set('');
    this.createOpen.set(true);
  }

  protected async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.notify.warning('Seleccione una imagen (JPG, PNG, etc.)');
      return;
    }
    this.uploadingImage.set(true);
    try {
      const uploaded = await firstValueFrom(this.filesApi.upload(file));
      this.imagenArchivoId.set(uploaded.id);
      this.imagenPreviewUrl.set(this.filesApi.absoluteFileUrl(uploaded.url));
      this.notify.success('Imagen de receta cargada');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo subir la imagen'));
    } finally {
      this.uploadingImage.set(false);
      input.value = '';
    }
  }
}
