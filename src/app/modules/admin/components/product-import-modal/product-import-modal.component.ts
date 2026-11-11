import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { productQueryKeys } from '../../../../core/query/product-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { FileInputComponent } from '../../../../shared/components/form/input/file-input.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { ProductImportMode, ProductImportResultDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type ImportModeInfo = { label: string; template: string; steps: string };

const MODES: Record<ProductImportMode, ImportModeInfo> = {
  PRODUCTOS: {
    label: 'Productos',
    template: 'items.xlsx',
    steps: 'Crea productos nuevos y actualiza los que ya existen, según el código de cada fila.',
  },
  L_PRECIOS: {
    label: 'Listas de precios',
    template: 'item_price_lists.xlsx',
    steps: 'Carga presentaciones (unidad, factor y precios 1, 2 y 3) de productos que ya existen, buscándolos por su código interno.',
  },
  ACTUALIZAR_PRECIOS: {
    label: 'Actualizar precios',
    template: 'items_update_prices.xlsx',
    steps: 'Cambia el precio de venta (y el de compra, si viene) de productos que ya existen, buscándolos por su código interno. No crea productos.',
  },
};

/** Nombre visible de cada modo de importación de productos. */
export function productImportModeLabel(mode: ProductImportMode): string {
  return MODES[mode].label;
}

/**
 * Importación de productos desde Excel con vista previa: se valida el archivo, se ve qué
 * se creará, actualizará o tiene errores, y solo entonces se confirma. La usan Productos
 * (Importar) e Importar precios, para que el flujo y sus reglas sean uno solo.
 */
@Component({
  selector: 'app-product-import-modal',
  standalone: true,
  imports: [AlertComponent, ButtonComponent, FileInputComponent, ModalComponent],
  templateUrl: './product-import-modal.component.html',
})
export class ProductImportModalComponent {
  readonly open = input(false);
  readonly mode = input.required<ProductImportMode>();
  readonly closed = output<void>();
  /** Se emite tras confirmar la importación, con su resultado. */
  readonly imported = output<ProductImportResultDto>();

  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<ProductImportResultDto | null>(null);
  protected readonly info = computed(() => MODES[this.mode()]);

  protected readonly previewMutation = injectMutation(() => ({
    mutationFn: (file: File) => firstValueFrom(this.api.previewImportProducts(this.mode(), file)),
    onSuccess: (res) => this.preview.set(res),
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo validar el archivo')),
  }));

  protected readonly importMutation = injectMutation(() => ({
    mutationFn: (file: File) => firstValueFrom(this.api.importProducts(this.mode(), file)),
    onSuccess: (res) => {
      const msg = `Importación completada. Creados: ${res.created}, actualizados: ${res.updated}.`;
      if (res.errors.length) this.notify.warning(`${msg} ${res.errors.length} fila(s) con error no se importaron.`);
      else this.notify.success(msg);
      void this.queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      this.imported.emit(res);
      this.close(true);
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo importar el archivo')),
  }));

  protected readonly busy = computed(() => this.previewMutation.isPending() || this.importMutation.isPending());
  /** Hay algo que importar: vista previa lista y al menos una fila válida. */
  protected readonly canConfirm = computed(() => {
    const p = this.preview();
    return !!this.file() && !!p && p.created + p.updated > 0 && !this.busy();
  });

  constructor() {
    // Cada vez que se abre, empieza limpio.
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        this.file.set(null);
        this.preview.set(null);
      });
    });
  }

  protected onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.preview.set(null);
    if (file && !/\.xlsx$/i.test(file.name)) {
      this.file.set(null);
      this.notify.warning('El archivo debe ser .xlsx. Descarga la plantilla y guárdala en ese formato.');
      return;
    }
    this.file.set(file);
    // Valida al elegir el archivo: un paso menos para el usuario.
    if (file) this.previewMutation.mutate(file);
  }

  protected confirm() {
    const file = this.file();
    if (!file || !this.canConfirm()) return;
    this.importMutation.mutate(file);
  }

  protected close(force = false) {
    if (!force && this.busy()) return;
    this.closed.emit();
  }

  protected async downloadTemplate() {
    try {
      const blob = await firstValueFrom(this.api.downloadProductImportTemplate(this.mode()));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.info().template;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo descargar la plantilla'));
    }
  }
}
