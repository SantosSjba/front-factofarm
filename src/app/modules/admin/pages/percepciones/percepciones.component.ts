import { Component } from '@angular/core';
import { TaxWithholdingPageComponent } from '../../components/tax-withholding-page/tax-withholding-page.component';

/** Percepciones SUNAT: la pantalla vive en el componente compartido. */
@Component({
  selector: 'app-percepciones',
  standalone: true,
  imports: [TaxWithholdingPageComponent],
  template: `<app-tax-withholding-page kind="PERCEPCION" />`,
})
export class PercepcionesComponent {}
