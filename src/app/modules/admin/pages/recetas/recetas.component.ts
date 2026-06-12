import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { CreatePrescriptionRequest, CustomerItemDto, ProductListItemDto } from '../../models/directory.models';
import { FilesApiService } from '../../../../core/services/files-api.service';

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    InputFieldComponent,
    FormSelectComponent,
    ModalComponent,
  ],
  templateUrl: './recetas.component.html',
})
export class RecetasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Fármacos' }, { label: 'Recetas' }];
  protected readonly page = signal(1);
  protected readonly createOpen = signal(false);
  protected readonly customerId = signal('');
  protected readonly customerSearch = signal('');
  protected readonly customerOptions = signal<CustomerItemDto[]>([]);
  protected readonly medicoId = signal('');
  protected readonly diagnostico = signal('');
  protected readonly productSearch = signal('');
  protected readonly productOptions = signal<ProductListItemDto[]>([]);
  protected readonly draftProductId = signal('');
  protected readonly draftQty = signal(1);
  protected readonly draftItems = signal<Array<{ productId: string; label: string; cantidad: number }>>([]);
  protected readonly imagenArchivoId = signal('');
  protected readonly imagenPreviewUrl = signal('');
  protected readonly uploadingImage = signal(false);

  protected readonly medicosQuery = injectQuery(() => ({
    queryKey: ['medicos', 'all'] as const,
    queryFn: () => firstValueFrom(this.api.listMedicos({ pageSize: 100 })),
  }));

  protected readonly medicoOptions = computed(() => [
    { value: '', label: 'Médico (opcional)' },
    ...((this.medicosQuery.data()?.items ?? []).map((m) => ({
      value: m.id,
      label: `${m.cmp} · ${m.nombres} ${m.apellidos}`,
    }))),
  ]);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['prescriptions', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listPrescriptions({ page: this.page(), pageSize: 15 })),
  }));

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
          cantidadPrescrita: String(i.cantidad),
        })),
      };
      return firstValueFrom(this.api.createPrescription(body));
    },
    onSuccess: () => {
      this.notify.success('Receta registrada');
      this.createOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la receta')),
  }));

  protected async searchCustomers() {
    const search = this.customerSearch().trim();
    if (!search) return;
    const res = await firstValueFrom(this.api.listCustomers({ search, page: 1, pageSize: 8 }));
    this.customerOptions.set('items' in res ? res.items : res);
  }

  protected selectCustomer(c: CustomerItemDto) {
    this.customerId.set(c.id);
    this.customerSearch.set(c.nombre);
    this.customerOptions.set([]);
  }

  protected async searchProducts() {
    const search = this.productSearch().trim();
    if (!search) return;
    const res = await firstValueFrom(this.api.listProducts({ search, page: 1, pageSize: 8 }));
    this.productOptions.set('items' in res ? res.items : res);
  }

  protected addItem(p: ProductListItemDto) {
    this.draftItems.update((rows) => [
      ...rows,
      { productId: p.id, label: p.nombre, cantidad: this.draftQty() },
    ]);
    this.productOptions.set([]);
    this.productSearch.set('');
  }

  protected openCreate() {
    this.customerId.set('');
    this.customerSearch.set('');
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
