import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import type { ProductImportResultDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-importar-precios',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
  ],
  templateUrl: './importar-precios.component.html',
})
export class ImportarPreciosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Productos' },
    { label: 'Importar Precios' },
  ];

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly lastResult = signal<ProductImportResultDto | null>(null);
  protected readonly mode = 'ACTUALIZAR_PRECIOS' as const;

  protected readonly uploadMutation = injectMutation(() => ({
    mutationFn: (file: File) => firstValueFrom(this.api.importProducts(this.mode, file)),
    onSuccess: (res) => {
      this.lastResult.set(res);
      this.notify.success(`Proceso finalizado. Actualizados: ${res.updated}, errores: ${res.errors.length}`);
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo importar el archivo de precios')),
  }));

  protected readonly canUpload = computed(() => !!this.selectedFile() && !this.uploadMutation.isPending());

  protected uploadErrorMessage(): string {
    return httpErrorMessage(this.uploadMutation.error(), 'No se pudo importar el archivo de precios');
  }

  protected onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  protected clearFile() {
    this.selectedFile.set(null);
    this.lastResult.set(null);
  }

  protected submitUpload() {
    const file = this.selectedFile();
    if (!file) {
      this.notify.warning('Seleccione un archivo XLS/XLSX.');
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.notify.warning('El archivo debe tener extensión .xls o .xlsx.');
      return;
    }
    this.uploadMutation.mutate(file);
  }

  protected async downloadTemplate() {
    try {
      const blob = await firstValueFrom(this.api.downloadProductImportTemplate(this.mode));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'items_prices_simsed.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo descargar el layout de precios'));
    }
  }
}
