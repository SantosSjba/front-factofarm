import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-cie-10',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    InputFieldComponent,
    PageStateComponent,
  ],
  templateUrl: './cie-10.component.html',
})
export class Cie10Component {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Fármacos' }, { label: 'CIE-10' }];
  protected readonly search = signal('');

  protected readonly cieQuery = injectQuery(() => ({
    queryKey: ['pharma', 'cie10', this.search()] as const,
    enabled: this.search().trim().length >= 2,
    queryFn: () => firstValueFrom(this.api.searchCie10(this.search().trim())),
  }));
}
