import { PlaceholderPageComponent } from '../../../../shared/components/common/placeholder-page/placeholder-page.component';
import { Component } from '@angular/core';

@Component({
  selector: 'app-libro-mayor',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: `<app-placeholder-page title="Libro Mayor" />`,
})
export class LibroMayorComponent {}
