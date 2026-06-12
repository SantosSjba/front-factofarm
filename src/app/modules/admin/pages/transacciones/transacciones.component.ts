import { PlaceholderPageComponent } from '../../../../shared/components/common/placeholder-page/placeholder-page.component';
import { Component } from '@angular/core';

@Component({
  selector: 'app-transacciones',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: `<app-placeholder-page title="Transacciones" />`,
})
export class TransaccionesComponent {}
