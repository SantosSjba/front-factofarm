import { Component, signal } from '@angular/core';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ExcelIconComponent } from '../../../../shared/icons/excel-icon.component';
import { ProductImportModalComponent } from '../../components/product-import-modal/product-import-modal.component';
import type { ProductImportResultDto } from '../../models/directory.models';

/** Atajo a «Productos → Importar → Actualizar precios», con el mismo flujo de vista previa. */
@Component({
  selector: 'app-importar-precios',
  standalone: true,
  imports: [
    AlertComponent,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    ExcelIconComponent,
    HelpPanelComponent,
    PageToolbarComponent,
    ProductImportModalComponent,
  ],
  templateUrl: './importar-precios.component.html',
})
export class ImportarPreciosComponent {
  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Productos' },
    { label: 'Importar precios' },
  ];

  protected readonly importOpen = signal(false);
  protected readonly lastResult = signal<ProductImportResultDto | null>(null);
}
