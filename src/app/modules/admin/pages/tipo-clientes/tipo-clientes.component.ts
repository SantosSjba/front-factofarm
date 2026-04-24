import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';

@Component({
  selector: 'app-tipo-clientes',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    IconComponent,
  ],
  templateUrl: './tipo-clientes.component.html',
})
export class TipoClientesComponent {
  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Clientes' },
    { label: 'Tipos de Clientes' },
  ];
}
